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
 * @typedef {{ public_dir: string, pages_dir: string, content_dir: string }} ResolveConfig
 * @typedef {{ hostname: string, port: string, cache?: string } & ResolveConfig} ServerConfig
 * @typedef {ServerConfig} ProductionConfig
 * @typedef {{ src_dir: string, dst_dir: string, ws_port: string } & ServerConfig} DevelopmentConfig
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
        const abs = path.join(config.public_dir, rel);

        if (isRealFile(abs)) {
            return [abs, true];
        }

        return [null, false];
    }

    const ext_index = normalized.lastIndexOf(".");
    const rel_no_ext = normalized.slice(0, ext_index < 0 ? undefined : ext_index);

    if (rel_no_ext.startsWith(CONTENT_PREFIX)) {
        const rel = rel_no_ext.slice(CONTENT_PREFIX.length);
        const abs = path.join(config.content_dir, rel);

        if (isRealFile(abs)) {
            return [abs, true];
        }

        const html_abs = `${abs}.html`;
        if (isRealFile(html_abs)) {
            return [html_abs, true];
        }
    }

    const abs = path.join(config.pages_dir, rel_no_ext);
    if (isRealFile(abs)) {
        return [abs, true];
    }

    const html_abs = `${abs}.html`;
    if (isRealFile(html_abs)) {
        return [html_abs, true];
    }

    const index_abs = path.join(abs, "index.html");
    if (isRealFile(index_abs)) {
        return [index_abs, true];
    }

    const not_found_abs = path.join(config.pages_dir, "not-found.html");
    if (isRealFile(not_found_abs)) {
        return [not_found_abs, false];
    }

    return [null, false];
}

/**
 * @param {ServerConfig} config
 */
function runServer(config) {
    const server = http.createServer((req, res) => {
        console.log("%s %s", req.method, req.url);

        const [file_path, ok] = resolvePath(config, req.url);

        if (!file_path) {
            res.writeHead(404);
            res.end("Not found");
            return;
        }

        fs.readFile(file_path, (err, data) => {
            if (err) {
                res.writeHead(404);
                res.end("Not found");
                return;
            }

            res.writeHead(ok ? 200 : 404, {
                "content-type": mime.lookup(file_path) || "application/octet-stream",
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

    const ws_server = new WebSocketServer({
        host: config.hostname,
        port: config.ws_port,
    });

    function broadcastReload() {
        for (const ws of clients) {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send("reload");
            }
        }
    }

    ws_server.on("connection", (ws) => {
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

    console.log(`WebSocket listening on ws://${config.hostname}:${config.ws_port}`);

    processAll(config.src_dir, config.dst_dir, true);

    const watcher = chokidar.watch(config.src_dir, {
        ignoreInitial: true,
    });

    watcher.on("all", (event, file_path) => {
        console.log(event, file_path);

        if (["error", "unlink", "unlinkDir"].includes(event)) {
            return;
        }

        try {
            processFile(config.src_dir, config.dst_dir, file_path, true);
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
    const { mode, src_dir, dst_dir, hostname, port, ws_port } = parse(args, {
        mode: ["string", true],
        src_dir: ["string", false],
        dst_dir: ["string", true],
        hostname: ["string", false],
        port: ["string", false],
        ws_port: ["string", false],
    });

    const public_dir = `${dst_dir}/public`;
    const pages_dir = `${dst_dir}/pages`;
    const content_dir = `${dst_dir}/content`;

    switch (mode) {
        case "development":
            if (typeof src_dir === "undefined") {
                throw new Error(`Missing required param "src_dir".`);
            }
            development({
                src_dir,
                dst_dir,
                hostname: hostname ?? "0.0.0.0",
                port: port ?? "8080",
                ws_port: ws_port ?? "8090",
                public_dir,
                pages_dir,
                content_dir,
                cache: `public, max-age=${5 * 60}, immutable`,
            });
            break;

        case "production":
            production({
                hostname: hostname ?? "0.0.0.0",
                port: port ?? "8080",
                public_dir,
                pages_dir,
                content_dir,
                cache: `public, max-age=${7 * 24 * 60 * 60}, immutable`,
            });
            break;
    }
}

main(process.argv.slice(2));
