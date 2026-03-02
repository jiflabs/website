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
 * @typedef {{ permanent: boolean, url: string }} Redirect
 * @typedef {{ redirect?: Record<string, Redirect>, global?: Record<string, unknown> }} Config
 *
 * @typedef {{ publicDir: string, pagesDir: string, contentDir: string }} ResolveConfig
 * @typedef {{ keyFile?: string, certFile?: string, hostname: string, port: string, cache?: string, redirect?: Record<string, Redirect> } & ResolveConfig} ServerConfig
 */

/**
 * @template {"http1" | "http2"} M
 */
class Server {
    /**
     * @type {M}
     * @readonly
     */
    mode;

    /**
     * @readonly
     */
    server;

    /**
     * @readonly
     */
    secure;

    /**
     * @param {M} mode
     * @param {string} hostname
     * @param {string} port
     * @param {string} cert
     * @param {string} key
     */
    constructor(mode, hostname = "0.0.0.0", port = "8080", cert = undefined, key = undefined) {
        this.mode = mode;

        switch (mode) {
            case "http1":
                if (cert) {
                    this.server = https.createServer({ cert, key });
                    this.secure = true;
                } else {
                    this.server = http.createServer();
                    this.secure = false;
                }
                break;

            case "http2":
                if (cert) {
                    this.server = http2.createSecureServer({ cert, key });
                    this.secure = true;
                } else {
                    this.server = http2.createServer();
                    this.secure = false;
                }
                break;

            default:
                throw new Error("invalid server mode");
        }

        this.server.listen(port, hostname, undefined, () => {
            console.log(`Listening on ${this.secure ? "https" : "http"}://${formatHostname(hostname)}:${port}`);
        });
    }

    handle(handler) {
        switch (this.mode) {
            case "http1":
                this.server.on(
                    "request",
                    /**
                     * @param {http.IncomingMessage} req
                     * @param {http.ServerResponse<http.IncomingMessage> & { req: http.IncomingMessage }} res
                     */
                    (req, res) => {
                        const method = req.method;
                        const url = new URL(
                            req.url,
                            `${this.secure ? "https" : "http"}://${config.hostname}:${config.port}`,
                        );
                        const pathname = url.pathname;

                        const headers = new Headers();
                        for (const key in req.headers) {
                            const val = req.headers[key];
                            if (typeof val === "string") {
                                headers.set(key, val);
                            } else {
                                for (const v of val) {
                                    headers.append(key, v);
                                }
                            }
                        }

                        const request = new Request({
                            method,
                            url,
                            headers,
                            body: req.
                        });

                        handler(method, pathname);
                    },
                );
                break;

            case "http2":
                break;
        }
    }
}

/**
 * @param {fs.PathLike} filename
 * @returns
 */
function isRealFile(filename) {
    if (!fs.existsSync(filename)) {
        return false;
    }
    return fs.statSync(filename).isFile();
}

/**
 * @param {ResolveConfig} config
 * @param {string} pathname
 * @returns {[string, boolean] | [null, false]}
 */
function resolvePath(config, pathname) {
    const normalized = path.normalize(pathname);

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
function runHTTP1Server(config) {
    let server, secure;

    if (config.keyFile && config.certFile) {
        server = https.createServer({
            key: fs.readFileSync(config.keyFile),
            cert: fs.readFileSync(config.certFile),
        });
        secure = true;
    } else {
        server = http.createServer();
        secure = false;
    }

    server.on("request", (request, response) => {
        const method = request.method;
        const url = new URL(request.url, `http://${config.hostname}:${config.port}`);
        const pathname = url.pathname;

        console.log("%s %s", method, pathname);

        if (config.redirect && pathname in config.redirect) {
            const redirect = config.redirect[pathname];

            response.writeHead(redirect.permanent ? 308 : 307, {
                location: redirect.url,
            });
            response.end();
            return;
        }

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
                ...(config.cache ? { "cache-control": config.cache } : {}),
            });
            response.end(data);
        });
    });

    server.listen(config.port, config.hostname, undefined, () => {
        console.log(`Listening on ${secure ? "https" : "http"}://${formatHostname(config.hostname)}:${config.port}`);
    });

    return server;
}

/**
 * @param {ServerConfig} config
 */
function runHTTP2Server(config) {
    let server, secure;

    if (config.keyFile && config.certFile) {
        server = http2.createSecureServer({
            key: fs.readFileSync(config.keyFile),
            cert: fs.readFileSync(config.certFile),
            allowHTTP1: true,
        });
        secure = true;
    } else {
        server = http2.createServer({
            allowHTTP1: true,
        });
        secure = false;
    }

    server.on("stream", (stream, headers) => {
        const method = headers[":method"] ?? "GET";
        const pathname = headers[":path"] ?? "/";

        console.log("%s %s", method, pathname);

        if (config.redirect && pathname in config.redirect) {
            const redirect = config.redirect[pathname];

            stream.respond({
                ":status": redirect.permanent ? 308 : 307,
                location: redirect.url,
            });
            stream.end();
            return;
        }

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
                ...(config.cache ? { "cache-control": config.cache } : {}),
            });
            stream.end(data);
        });
    });

    server.listen(config.port, config.hostname, undefined, () => {
        console.log(`Listening on ${secure ? "https" : "http"}://${formatHostname(config.hostname)}:${config.port}`);
    });

    return server;
}

/**
 * @param {string} srcDir
 * @param {string} dstDir
 * @param {string} filename
 */
async function handleFileChange(srcDir, dstDir, filename) {
    if (filename === path.join(srcDir, "config.yaml")) {
        await processAll({ srcDir: srcDir, dstDir: dstDir, debug: true });
        return true;
    }

    await processFile({ srcDir: srcDir, dstDir: dstDir, debug: true }, filename);
    return false;
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
    } = parse(args, {
        "--mode": ["string", true],
        "--src-dir": ["string", false],
        "--dst-dir": ["string", true],
        "--key-file": ["string", false],
        "--cert-file": ["string", false],
        "--hostname": ["string", false],
        "--port": ["string", false],
    });

    const publicDir = path.join(dstDir, "public");
    const pagesDir = path.join(dstDir, "pages");
    const contentDir = path.join(dstDir, "content");

    if (mode === "production") {
        /**
         * @type {Config}
         */
        const config = JSON.parse(fs.readFileSync(path.join(dstDir, "config.json"), "utf-8"));

        runHTTP2Server({
            keyFile,
            certFile,
            hostname: hostname ?? "0.0.0.0",
            port: port ?? "8080",
            cache: `public, max-age=${7 * 24 * 60 * 60}, immutable`,
            redirect: config.redirect,
            publicDir,
            pagesDir,
            contentDir,
        });

        return;
    }

    if (mode === "development") {
        if (typeof srcDir === "undefined") {
            throw new Error(`Missing required param "src_dir".`);
        }

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

        const server = runHTTP1Server({
            keyFile,
            certFile,
            hostname: hostname ?? "0.0.0.0",
            port: port ?? "8080",
            redirect: {},
            publicDir,
            pagesDir,
            contentDir,
        });

        const wss = new WebSocketServer({ server });

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

        processAll({ srcDir, dstDir, debug: true });

        const watcher = chokidar.watch(srcDir, { ignoreInitial: true });

        watcher.on("all", (event, filename) => {
            console.log("Watcher saw %s for %s", event, filename);

            if (["error", "unlink", "unlinkDir"].includes(event)) {
                return;
            }

            handleFileChange(srcDir, dstDir, filename)
                .then((full) => {
                    broadcastReload();
                    if (full) {
                        console.log("TODO: config change, full reload");
                    }
                })
                .catch((err) => {
                    console.error("Error while processing:", err);
                });
        });
        return;
    }

    console.error(`Invalid mode "${mode}".`);
}

main(process.argv.slice(2));
