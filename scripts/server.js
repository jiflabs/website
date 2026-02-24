#!/usr/bin/env node

import fs from "node:fs";
import http from "node:http";
import http2 from "node:http2";
import https from "node:https";
import path from "node:path";

import { WebSocket, WebSocketServer } from "ws";

import chokidar from "chokidar";
import mime from "mime-types";

import { parse } from "./param.js";
import { processAll, processFile } from "./process.js";

const BLOB_PREFIX = `${path.sep}blob${path.sep}`;
const CONTENT_PREFIX = `${path.sep}content${path.sep}`;

/**
 * @typedef {{ publicDir: string, pagesDir: string, contentDir: string }} ResolveConfig
 * @typedef {{ keyFile?: string, certFile?: string, hostname: string, port: string, cache?: string } & ResolveConfig} ServerConfig
 * @typedef {ServerConfig} ProductionConfig
 * @typedef {{ srcDir: string, dstDir: string, wsPort: string } & ServerConfig} DevelopmentConfig
 */

function isRealFile(pathname) {
    if (!fs.existsSync(pathname)) {
        return false;
    }
    return fs.statSync(pathname).isFile();
}

/**
 * @param {ResolveConfig} config
 * @param {string} pathname
 * @returns {[string, boolean] | [null, false]}
 */
function resolvePath(config, pathname) {
    const clean = pathname.split("?")[0].split("#")[0];
    const normalized = path.normalize(clean);

    if (normalized.startsWith(BLOB_PREFIX)) {
        const rel = normalized.slice(BLOB_PREFIX.length);
        const abs = path.join(config.publicDir, rel);

        if (isRealFile(abs)) {
            return [abs, true];
        }

        return [null, false];
    }

    const extIndex = normalized.lastIndexOf(".");
    const relNoExt = normalized.slice(0, extIndex < 0 ? undefined : extIndex);

    if (relNoExt.startsWith(CONTENT_PREFIX)) {
        const rel = relNoExt.slice(CONTENT_PREFIX.length);
        const abs = path.join(config.contentDir, rel);

        if (isRealFile(abs)) {
            return [abs, true];
        }

        const absHtml = `${abs}.html`;
        if (isRealFile(absHtml)) {
            return [absHtml, true];
        }
    }

    const abs = path.join(config.pagesDir, relNoExt);
    if (isRealFile(abs)) {
        return [abs, true];
    }

    const absHtml = `${abs}.html`;
    if (isRealFile(absHtml)) {
        return [absHtml, true];
    }

    const absIndex = path.join(abs, "index.html");
    if (isRealFile(absIndex)) {
        return [absIndex, true];
    }

    const absNotFound = path.join(config.pagesDir, "not-found.html");
    if (isRealFile(absNotFound)) {
        return [absNotFound, false];
    }

    return [null, false];
}

/**
 * @param {string} hostname
 * @returns {string}
 */
const formatHostname = (hostname) => (hostname.includes(":") ? `[${hostname}]` : hostname);

/**
 * @param {ServerConfig} config
 */
function runServerHTTP(config) {
    const server = http.createServer();

    server.on("request", (request, response) => {
        const method = request.method;
        const pathname = request.url;

        console.log("%s %s", method, pathname);

        const [filename, ok] = resolvePath(config, pathname);

        if (!filename) {
            response.writeHead(404);
            response.end("Not found");
            return;
        }

        fs.readFile(filename, (err, data) => {
            if (err) {
                response.writeHead(404);
                response.end("Not found");
                return;
            }

            response.writeHead(ok ? 200 : 404, {
                "content-type": mime.lookup(filename) || "application/octet-stream",
                "cache-control": config.cache,
            });
            response.end(data);
        });
    });

    server.listen(config.port, config.hostname, undefined, () => {
        console.log(`HTTP listening on http://${formatHostname(config.hostname)}:${config.port}`);
    });
}

/**
 * @param {ServerConfig} config
 */
function runServerHTTPS(config) {
    const options = {
        key: fs.readFileSync(config.keyFile),
        cert: fs.readFileSync(config.certFile),
    };

    const server = http2.createSecureServer(options);

    server.on("stream", (stream, headers) => {
        const method = headers[":method"];
        const pathname = headers[":path"];

        console.log("%s %s", method, pathname);

        const [filename, ok] = resolvePath(config, pathname);

        if (!filename) {
            stream.respond({ ":status": 404 });
            stream.end("Not found");
            return;
        }

        fs.readFile(filename, (err, data) => {
            if (err) {
                stream.respond({ ":status": 404 });
                stream.end("Not found");
                return;
            }

            stream.respond({
                ":status": ok ? 200 : 404,
                "content-type": mime.lookup(filename) || "application/octet-stream",
                "cache-control": config.cache,
            });
            stream.end(data);
        });
    });

    server.listen(config.port, config.hostname, undefined, () => {
        console.log(`HTTPS listening on https://${formatHostname(config.hostname)}:${config.port}`);
    });
}

/**
 * @param {ServerConfig} config
 */
function runServer(config) {
    if (config.keyFile && config.certFile) {
        runServerHTTPS(config);
    } else {
        runServerHTTP(config);
    }
}

/**
 * @param {{ wsPort: string } & ServerConfig} config
 */
function runWSServer(config) {
    if (config.keyFile && config.certFile) {
        const options = {
            key: fs.readFileSync(config.keyFile),
            cert: fs.readFileSync(config.certFile),
        };
        const server = https.createServer(options);

        server.listen(config.wsPort, config.hostname, undefined, () => {
            console.log(`WSS listening on wss://${formatHostname(config.hostname)}:${config.wsPort}`);
        });

        return server;
    } else {
        const server = http.createServer();

        server.listen(config.wsPort, config.hostname, undefined, () => {
            console.log(`WS listening on ws://${formatHostname(config.hostname)}:${config.wsPort}`);
        });

        return server;
    }
}

/**
 * @param {DevelopmentConfig} config
 */
function development(config) {
    /**
     * @type {Set<WebSocket>}
     */
    const clients = new Set();

    function broadcastReload() {
        for (const ws of clients) {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send("reload");
            }
        }
    }

    const wsServer = runWSServer(config);
    const wss = new WebSocketServer({ server: wsServer });

    wss.on("connection", (ws) => {
        clients.add(ws);

        ws.on("message", (msg) => {
            if (msg.toString() === "reload") {
                broadcastReload();
            }
        });

        ws.on("close", () => {
            clients.delete(ws);
        });
    });

    processAll({ srcDir: config.srcDir, dstDir: config.dstDir, debug: true });

    const watcher = chokidar.watch(config.srcDir, { ignoreInitial: true });

    watcher.on("all", (event, file_path) => {
        console.log("Watcher saw %s for %s", event, file_path);

        if (["error", "unlink", "unlinkDir"].includes(event)) {
            return;
        }

        try {
            processFile({ srcDir: config.srcDir, dstDir: config.dstDir, debug: true }, file_path);
            broadcastReload();
        } catch (error) {
            console.error("Error while processing:", error);
        }
    });

    runServer(config);
}

/**
 * @param {ProductionConfig} config
 */
function production(config) {
    runServer(config);
}

function main(args) {
    const {
        "--mode": mode,
        "--src-dir": srcDir,
        "--dst-dir": dstDir,
        "--key-file": keyFile,
        "--cert-file": certFile,
        "--hostname": hostname,
        "--port": port,
        "--ws-port": wsPort,
    } = parse(args, {
        "--mode": ["string", true],
        "--src-dir": ["string", false],
        "--dst-dir": ["string", true],
        "--key-file": ["string", false],
        "--cert-file": ["string", false],
        "--hostname": ["string", false],
        "--port": ["string", false],
        "--ws-port": ["string", false],
    });

    const publicDir = path.join(dstDir, "public");
    const pagesDir = path.join(dstDir, "pages");
    const contentDir = path.join(dstDir, "content");

    switch (mode) {
        case "development":
            if (typeof srcDir === "undefined") {
                throw new Error(`Missing required param "src_dir".`);
            }
            development({
                srcDir,
                dstDir,
                wsPort: wsPort ?? "8090",
                keyFile,
                certFile,
                hostname: hostname ?? "0.0.0.0",
                port: port ?? "8080",
                cache: `public, max-age=${5 * 60}, immutable`,
                publicDir,
                pagesDir,
                contentDir,
            });
            break;

        case "production":
            production({
                keyFile,
                certFile,
                hostname: hostname ?? "0.0.0.0",
                port: port ?? "8080",
                cache: `public, max-age=${7 * 24 * 60 * 60}, immutable`,
                publicDir,
                pagesDir,
                contentDir,
            });
            break;
    }
}

main(process.argv.slice(2));
