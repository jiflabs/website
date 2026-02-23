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

/**
 * @param {{ public_dir: string, pages_dir: string }} config
 * @param {string} url_path
 * @returns {[string, boolean] | [null, false]}
 */
function resolvePath(config, url_path) {
    const clean = url_path.split("?")[0].split("#")[0];
    const normalized = path.normalize(clean);

    if (normalized.startsWith(BLOB_PREFIX)) {
        const rel = normalized.slice(BLOB_PREFIX.length);
        const abs = path.join(config.public_dir, rel);

        if (fs.existsSync(abs)) {
            const stat = fs.statSync(abs);
            if (stat.isFile()) {
                return [abs, true];
            }
        }

        return [null, false];
    }

    const ext = normalized.lastIndexOf(".");
    const abs = path.join(
        config.pages_dir,
        normalized.slice(0, ext < 0 ? undefined : ext),
    );
    if (fs.existsSync(abs)) {
        const stat = fs.statSync(abs);
        if (stat.isFile()) {
            return [abs, true];
        }
    }

    const html_path = path.join(
        path.dirname(abs),
        `${path.basename(abs)}.html`,
    );
    if (fs.existsSync(html_path)) {
        const stat = fs.statSync(html_path);
        if (stat.isFile()) {
            return [html_path, true];
        }
    }

    const index_path = path.join(abs, "index.html");
    if (fs.existsSync(index_path)) {
        const stat = fs.statSync(index_path);
        if (stat.isFile()) {
            return [index_path, true];
        }
    }

    const not_found_path = path.join(config.pages_dir, "not-found.html");
    if (fs.existsSync(not_found_path)) {
        const stat = fs.statSync(not_found_path);
        if (stat.isFile()) {
            return [not_found_path, false];
        }
    }

    return [null, false];
}

/**
 * @param {{ hostname: string, port: string, public_dir: string, pages_dir: string }} config
 */
function runServer(config) {
    const server = http.createServer((req, res) => {
        let request_path = req.url;

        if (request_path === "/") {
            request_path = "/index.html";
        }

        const [file_path, ok] = resolvePath(config, request_path);

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
                "content-type":
                    mime.lookup(file_path) || "application/octet-stream",
            });
            res.end(data);
        });
    });

    server.listen(config.port, config.hostname, () => {
        console.log(
            `HTTP listening on http://${config.hostname}:${config.port}`,
        );
    });
}

/**
 * @param {{ src_dir: string, dst_dir: string, hostname: string, port: string, ws_port: string, public_dir: string, pages_dir: string }} config
 */
function development(config) {
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

    console.log(
        `WebSocket listening on ws://${config.hostname}:${config.ws_port}`,
    );

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
 * @param {{ hostname: string, port: string, public_dir: string, pages_dir: string }} config
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

    const pages_dir = `${dst_dir}/pages`;
    const public_dir = `${dst_dir}/public`;

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
            });
            break;

        case "production":
            production({
                hostname: hostname ?? "0.0.0.0",
                port: port ?? "8080",
                public_dir,
                pages_dir,
            });
            break;
    }
}

main(process.argv.slice(2));
