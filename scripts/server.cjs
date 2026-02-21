const http = require("node:http");
const path = require("node:path");
const fs = require("node:fs");

const WebSocket = require("ws");

const chokidar = require("chokidar");
const mime = require("mime-types");

const { processFile, processAll } = require("./process.cjs");

const HOST = "0.0.0.0";
const PORT = 8080;
const WS_PORT = 8090;

const SRC_DIR = path.resolve(__dirname, '../src');
const PAGES_DIR = path.resolve(__dirname, "../dst/pages");
const PUBLIC_DIR = path.resolve(__dirname, "../dst/public");

const clients = new Set();

const wss = new WebSocket.Server({ host: HOST, port: WS_PORT });

function broadcastReload() {
    for (const ws of clients) {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send("reload");
        }
    }
}

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

console.log(`WebSocket listening on ws://${HOST}:${WS_PORT}`);

function resolvePath(url_path) {
    const clean = url_path.split("?")[0].split("#")[0];
    const normalized = path.normalize(clean);

    if (normalized.startsWith("/blob/")) {
        const rel = normalized.slice("/blob/".length);
        const abs = path.join(PUBLIC_DIR, rel);
        return [abs, true];
    }

    const rel = normalized.replace(/^\/+/, "");
    const abs = path.join(PAGES_DIR, rel);

    if (fs.existsSync(abs)) {
        return [abs, true];
    }

    const file_abs = `${abs}.html`;
    if (fs.existsSync(file_abs)) {
        return [file_abs, true];
    }

    const dir_abs = `${abs}/index.html`;
    if (fs.existsSync(dir_abs)) {
        return [dir_abs, true];
    }

    return [path.join(PAGES_DIR, "not-found.html"), false];
}

const server = http.createServer((req, res) => {
    let request_path = req.url;

    if (request_path === "/") {
        request_path = "/index.html";
    }

    const [file_path, ok] = resolvePath(request_path);

    fs.readFile(file_path, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end("Not found");
            return;
        }

        res.writeHead(ok ? 200 : 404, { "content-type": mime.lookup(file_path) || "application/octet-stream" });
        res.end(data);
    });
});

server.listen(PORT, HOST, () => {
    console.log(`HTTP listening on http://${HOST}:${PORT}`);
});

processAll();

const watcher = chokidar.watch(SRC_DIR, {
    ignoreInitial: true,
});

watcher.on("all", (event, file_path) => {
    console.log(event, file_path);

    try {
        processFile(file_path);
        broadcastReload();
    } catch (err) {
        console.error("error while processing:", err);
    }
});

