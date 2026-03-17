#!/usr/bin/env node

import fs from "node:fs";
import http, { IncomingMessage } from "node:http";
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
    global?: Record<string, string>;
}

interface ResolveConfig {
    publicDir: string;
    pagesDir: string;
    contentDir: string;
}

interface ServerConfig extends ResolveConfig {
    mode: "http1" | "http2";
    websocket: boolean;
    keyFile?: string;
    certFile?: string;
    hostname?: string;
    port?: number;
    cache?: string;
    redirect?: Record<string, Redirect>;
}

type ServerInternals =
    | {
          readonly mode: "http1";
          readonly server: http.Server;
          readonly socket: WebSocketServer | null;
      }
    | {
          readonly mode: "http2";
          readonly server: http2.Http2Server;
      };

type RequestHandler = (request: Request) => Promise<Response>;
type ConnectionHandler = (websocket: WebSocket, request: IncomingMessage) => void;

class Server {
    readonly hostname: string;
    readonly port: number;
    readonly secure: boolean;

    readonly internals: ServerInternals;

    requestHandler: RequestHandler | null;
    connectionHandler: ConnectionHandler | null;

    constructor(
        mode: "http1" | "http2",
        websocket: boolean,
        hostname: string = "0.0.0.0",
        port: number = 8080,
        cert?: string | Buffer<ArrayBufferLike>,
        key?: string | Buffer<ArrayBufferLike>,
    ) {
        this.hostname = hostname;
        this.port = port;

        let server, socket;
        switch (mode) {
            case "http1":
                if (cert) {
                    server = https.createServer({ cert, key });
                    this.secure = true;
                } else {
                    server = http.createServer();
                    this.secure = false;
                }

                if (websocket) {
                    socket = new WebSocketServer({ server: server });
                } else {
                    socket = null;
                }

                this.internals = {
                    mode,
                    server,
                    socket,
                };
                break;

            case "http2":
                if (cert) {
                    server = http2.createSecureServer({ cert, key });
                    this.secure = true;
                } else {
                    server = http2.createServer();
                    this.secure = false;
                }

                this.internals = {
                    mode,
                    server,
                };
                break;

            default:
                throw new Error("invalid server mode");
        }

        server.listen(this.port, this.hostname, undefined, () => {
            console.log(
                `Listening on ${this.secure ? "https" : "http"}://${formatHostname(this.hostname)}:${this.port}`,
            );
        });

        this.requestHandler = null;
        this.connectionHandler = null;

        switch (this.internals.mode) {
            case "http1":
                this.internals.server.on("request", (req, res) => {
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

                    this.requestHandler
                        && this.requestHandler(request).then(async (response) => {
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

                this.internals.socket?.on("connection", (websocket, request) => {
                    this.connectionHandler && this.connectionHandler(websocket, request);
                });

                break;

            case "http2":
                this.internals.server.on("stream", (stream: http2.ServerHttp2Stream, hdrs) => {
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

                    this.requestHandler
                        && this.requestHandler(request).then(async (response) => {
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

    onRequest(handler: RequestHandler) {
        this.requestHandler = handler;
    }

    onConnection(handler: ConnectionHandler) {
        this.connectionHandler = handler;
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

function attachRequestHandler(
    config: Omit<ServerConfig, "mode" | "websocket" | "keyFile" | "certFile" | "hostname" | "port">,
    server: Server,
) {
    server.onRequest(async (request) => {
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
}

function runHTTPServer(config: ServerConfig) {
    const cert = config.certFile ? fs.readFileSync(config.certFile) : undefined;
    const key = config.keyFile ? fs.readFileSync(config.keyFile) : undefined;

    const server = new Server(config.mode, config.websocket, config.hostname, config.port, cert, key);

    attachRequestHandler(config, server);

    return server;
}

function handleFileChange(srcDir: string, dstDir: string, config: Config, filename: string) {
    processFile({ srcDir, dstDir, debug: true, global: config.global }, filename);

    return filename === path.join(srcDir, "config.yaml");
}

function readConfig(dir: string): Config {
    return JSON.parse(fs.readFileSync(path.join(dir, "config.json"), "utf-8"));
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
        "--http": httpVersion,
    } = parse(args, {
        "--mode": ["string", true],
        "--src-dir": ["string", false],
        "--dst-dir": ["string", true],
        "--key-file": ["string", false],
        "--cert-file": ["string", false],
        "--hostname": ["string", false],
        "--port": ["number", false],
        "--http": ["string", false],
    } as const);

    let serverMode: "http1" | "http2";
    switch (httpVersion) {
        case "2":
            serverMode = "http2";
            break;
        case "1.1":
        default:
            serverMode = "http1";
            break;
    }

    const publicDir = path.join(dstDir, "public");
    const pagesDir = path.join(dstDir, "pages");
    const contentDir = path.join(dstDir, "content");

    if (mode === "production") {
        const config = readConfig(dstDir);

        runHTTPServer({
            mode: serverMode,
            websocket: false,
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

        processFile({ srcDir, dstDir, debug: true }, path.join(srcDir, "config.yaml"));
        let config = readConfig(dstDir);

        const clients: Set<WebSocket> = new Set();

        function broadcastReload() {
            for (const ws of clients) {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send("reload");
                }
            }
        }

        if (serverMode !== "http1") {
            console.warn("development server does only support http/1.1");
        }

        const server = runHTTPServer({
            mode: "http1",
            websocket: true,
            keyFile,
            certFile,
            hostname,
            port,
            redirect: config.redirect,
            publicDir,
            pagesDir,
            contentDir,
        });

        server.onConnection((websocket) => {
            clients.add(websocket);

            websocket.on("message", (data, isBinary) => {
                if (!isBinary && data.toString() === "reload") {
                    broadcastReload();
                }
            });

            websocket.on("close", () => {
                clients.delete(websocket);
            });
        });

        processAll({ srcDir, dstDir, debug: true, global: config.global });

        const watcher = chokidar.watch(srcDir, { ignoreInitial: true });

        watcher.on("all", (event, filename) => {
            console.log("Watcher saw %s for %s", event, filename);

            if (["error", "unlink", "unlinkDir"].includes(event)) {
                return;
            }

            try {
                const full = handleFileChange(srcDir, dstDir, config, filename);
                if (full) {
                    console.log("Server config changed, issuing full reload");

                    config = readConfig(dstDir);
                    processAll({ srcDir, dstDir, debug: true, global: config.global });

                    attachRequestHandler(
                        {
                            redirect: config.redirect,
                            publicDir,
                            pagesDir,
                            contentDir,
                        },
                        server,
                    );
                }
                broadcastReload();
            } catch (err) {
                console.error("Error while processing:", err);
            }
        });
        return;
    }

    console.error(`Invalid mode "${mode}".`);
}

main(process.argv.slice(2));
