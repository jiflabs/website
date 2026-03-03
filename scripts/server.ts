#!/usr/bin/env node

import fs from "node:fs";
import http from "node:http";
import http2 from "node:http2";
import https from "node:https";
import path from "node:path";

import { WebSocket, WebSocketServer } from "ws";

import chokidar from "chokidar";
import mime from "mime-types";

import { parse } from "./param.ts";
import { processAll, processFile } from "./process.ts";

const BLOB_PREFIX = `${path.sep}blob${path.sep}` as const;
const CONTENT_PREFIX = `${path.sep}content${path.sep}` as const;

interface Redirect {
    permanent: boolean;
    url: string;
}

interface Config {
    redirect?: Record<string, Redirect>;
    global?: Record<string, unknown>;
}

interface ResolveConfig {
    publicDir: string;
    pagesDir: string;
    contentDir: string;
}

interface ServerConfig extends ResolveConfig {
    mode: "http1" | "http2";
    keyFile?: string;
    certFile?: string;
    hostname?: string;
    port?: number;
    cache?: string;
    redirect?: Record<string, Redirect>;
}

class Server<M extends "http1" | "http2"> {
    readonly mode: M;
    readonly hostname;
    readonly port;

    readonly server;
    readonly secure;

    constructor(
        mode: M,
        hostname: string = "0.0.0.0",
        port: number = 8080,
        cert?: string | Buffer<ArrayBufferLike>,
        key?: string | Buffer<ArrayBufferLike>,
    ) {
        this.mode = mode;
        this.hostname = hostname;
        this.port = port;

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

    handle(handler: (request: Request) => Promise<Response>) {
        switch (this.mode) {
            case "http1":
                (this.server as http.Server).on("request", (req, res) => {
                    const method = req.method ?? "GET";
                    const path = req.url ?? "/";
                    const url = new URL(path, `${this.secure ? "https" : "http"}://${this.hostname}:${this.port}`);

                    const headers = new Headers();
                    for (const key in req.headers) {
                        const val = req.headers[key];
                        if (typeof val === "string") {
                            headers.set(key, val);
                        } else if (typeof val !== "undefined") {
                            for (const v of val) {
                                headers.append(key, v);
                            }
                        }
                    }

                    const request = new Request(url, {
                        method,
                        headers,
                    });

                    handler(request).then(async (response) => {
                        const headers: http.OutgoingHttpHeaders = {};
                        for (const [key, val] of response.headers) {
                            headers[key] = val;
                        }

                        res.writeHead(response.status, undefined, headers);

                        if (response.body) {
                            const reader = response.body.getReader();

                            while (true) {
                                const { done, value } = await reader.read();
                                if (done) break;
                                res.write(Buffer.from(value));
                            }
                        }

                        res.end();
                    });
                });
                break;

            case "http2":
                (this.server as http2.Http2Server).on("stream", (stream: http2.ServerHttp2Stream, hdrs) => {
                    const method = hdrs[":method"] ?? "GET";
                    const path = hdrs[":path"] ?? "/";
                    const url = new URL(path, `${this.secure ? "https" : "http"}://${this.hostname}:${this.port}`);

                    const headers = new Headers();
                    for (const key in hdrs) {
                        const val = hdrs[key];
                        if (typeof val === "string") {
                            headers.set(key, val);
                        } else if (typeof val !== "undefined") {
                            for (const v of val) {
                                headers.append(key, v);
                            }
                        }
                    }

                    const request = new Request(url, {
                        method,
                        headers,
                    });

                    handler(request).then(async (response) => {
                        const headers: http.OutgoingHttpHeaders = {};
                        for (const [key, val] of response.headers) {
                            headers[key] = val;
                        }

                        stream.respond({
                            ":status": response.status,
                            ...headers,
                        });

                        if (response.body) {
                            const reader = response.body.getReader();

                            while (true) {
                                const { done, value } = await reader.read();
                                if (done) break;
                                stream.write(Buffer.from(value));
                            }
                        }

                        stream.end();
                    });
                });
                break;
        }
    }
}

function isRealFile(filename: fs.PathLike) {
    if (!fs.existsSync(filename)) {
        return false;
    }
    return fs.statSync(filename).isFile();
}

function resolvePath(config: ResolveConfig, pathname: string): [string, boolean] | [null, false] {
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

const formatHostname = (hostname: string) => (hostname.includes(":") ? `[${hostname}]` : hostname);

function runHTTPServer(config: ServerConfig) {
    const cert = config.certFile ? fs.readFileSync(config.certFile) : undefined;
    const key = config.keyFile ? fs.readFileSync(config.keyFile) : undefined;

    const server = new Server(config.mode, config.hostname, config.port, cert, key);

    server.handle(async (request) => {
        const method = request.method;
        const url = new URL(request.url);
        const pathname = url.pathname;

        console.log("%s %s", method, pathname);

        if (config.redirect && pathname in config.redirect) {
            const redirect = config.redirect[pathname];

            return new Response(null, {
                status: redirect.permanent ? 308 : 307,
                headers: {
                    location: redirect.url,
                },
            });
        }

        const [filename, ok] = resolvePath(config, pathname);

        if (!filename) {
            return new Response("Not Found", {
                status: 404,
                headers: {
                    "content-type": "text/plain",
                },
            });
        }

        try {
            const data = fs.readFileSync(filename);

            return new Response(data, {
                status: ok ? 200 : 404,
                headers: {
                    "content-type": mime.lookup(filename) || "application/octet-stream",
                    ...(config.cache ? { "cache-control": config.cache } : {}),
                },
            });
        } catch (err) {
            return new Response("Internal Server Error", {
                status: 500,
                headers: {
                    "content-type": "text/plain",
                },
            });
        }
    });

    return server;
}

async function handleFileChange(srcDir: string, dstDir: string, filename: string) {
    if (filename === path.join(srcDir, "config.yaml")) {
        await processAll({ srcDir: srcDir, dstDir: dstDir, debug: true });
        return true;
    }

    await processFile({ srcDir: srcDir, dstDir: dstDir, debug: true }, filename);
    return false;
}

function main(args: string[]) {
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
        "--port": ["number", false],
    } as const);

    const publicDir = path.join(dstDir, "public");
    const pagesDir = path.join(dstDir, "pages");
    const contentDir = path.join(dstDir, "content");

    if (mode === "production") {
        const config: Config = JSON.parse(fs.readFileSync(path.join(dstDir, "config.json"), "utf-8"));

        runHTTPServer({
            mode: "http2",
            keyFile,
            certFile,
            hostname,
            port,
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
        const clients: Set<WebSocket> = new Set();

        function broadcastReload() {
            for (const ws of clients) {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send("reload");
                }
            }
        }

        const server = runHTTPServer({
            mode: "http1",
            keyFile,
            certFile,
            hostname,
            port,
            redirect: {},
            publicDir,
            pagesDir,
            contentDir,
        });

        const wss = new WebSocketServer({ server: server.server as http.Server });

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
