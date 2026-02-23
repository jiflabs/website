#!/usr/bin/env node

import fs from "node:fs";
import http from "node:http";
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
 * @typedef {{ hostname: string, port: string, cache?: string } & ResolveConfig} ServerConfig
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
 * @param {ServerConfig} config
 */
function runServer(config) {
    const server = http.createServer((req, res) => {
        console.log("%s %s", req.method, req.url);

        const [filename, ok] = resolvePath(config, req.url);

        if (!filename) {
            res.writeHead(404);
            res.end("Not found");
            return;
        }

        fs.readFile(filename, (err, data) => {
            if (err) {
                res.writeHead(404);
                res.end("Not found");
                return;
            }

            res.writeHead(ok ? 200 : 404, {
                "content-type": mime.lookup(filename) || "application/octet-stream",
                "cache-control": config.cache,
            });
            res.end(data);
        });
    });

    server.listen(config.port, config.hostname, () => {
        console.log(`HTTP listening on http://${config.hostname}:${config.port}`);
    });
}

/**
 * @param {DevelopmentConfig} config
 */
function development(config) {
    /**
     * @type {Set<WebSocket>}
     */
    const clients = new Set();

    const wsServer = new WebSocketServer({
        host: config.hostname,
        port: config.wsPort,
    });

    function broadcastReload() {
        for (const ws of clients) {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send("reload");
            }
        }
    }

    wsServer.on("connection", (ws) => {
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

    console.log(`WebSocket listening on ws://${config.hostname}:${config.wsPort}`);

    processAll({ srcDir: config.srcDir, dstDir: config.dstDir, debug: true });

    const watcher = chokidar.watch(config.srcDir, {
        ignoreInitial: true,
    });

    watcher.on("all", (event, file_path) => {
        console.log(event, file_path);

        if (["error", "unlink", "unlinkDir"].includes(event)) {
            return;
        }

        try {
            processFile({ srcDir: config.srcDir, dstDir: config.dstDir, debug: true }, file_path);
            broadcastReload();
        } catch (err) {
            console.error("Error while processing:", err);
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
        "--hostname": hostname,
        "--port": port,
        "--ws-port": wsPort,
    } = parse(args, {
        "--mode": ["string", true],
        "--src-dir": ["string", false],
        "--dst-dir": ["string", true],
        "--hostname": ["string", false],
        "--port": ["string", false],
        "--ws-port": ["string", false],
    });

    const publicDir = `${dstDir}/public`;
    const pagesDir = `${dstDir}/pages`;
    const contentDir = `${dstDir}/content`;

    switch (mode) {
        case "development":
            if (typeof srcDir === "undefined") {
                throw new Error(`Missing required param "src_dir".`);
            }
            development({
                srcDir: srcDir,
                dstDir: dstDir,
                hostname: hostname ?? "0.0.0.0",
                port: port ?? "8080",
                wsPort: wsPort ?? "8090",
                publicDir,
                pagesDir,
                contentDir,
                cache: `public, max-age=${5 * 60}, immutable`,
            });
            break;

        case "production":
            production({
                hostname: hostname ?? "0.0.0.0",
                port: port ?? "8080",
                publicDir,
                pagesDir,
                contentDir,
                cache: `public, max-age=${7 * 24 * 60 * 60}, immutable`,
            });
            break;
    }
}

main(process.argv.slice(2));
