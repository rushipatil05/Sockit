import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import express from "express";
import cors from "cors";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { v4 as uuidv4 } from "uuid";
import mime from "mime-types";
import { config } from "./config.js";
import { DiscoveryService } from "./services/discoveryService.js";
import { PeerRegistry } from "./services/peerRegistry.js";
import { Events } from "../../shared/peerProtocol.js";

// ─── Own identity ─────────────────────────────────────────────────────────────
function getLanIp() {
    for (const iface of Object.values(os.networkInterfaces()).flat()) {
        if (iface?.family === "IPv4" && !iface.internal) return iface.address;
    }
    return "127.0.0.1";
}

const peerId   = process.env.PEER_ID || uuidv4();
const selfPeer = {
    peerId,
    peerName:   config.peerName,
    host:       getLanIp(),
    serverPort: config.serverPort,
    socketPort: config.socketPort
};

// ─── In-memory file store ─────────────────────────────────────────────────────
// fileId → { fileId, name, size, mimeType, ownerPeerId, ownerName,
//            ownerHost, ownerServerPort, isLocal, sharedAt, path? }
const sharedFiles = new Map();

// ─── Express + Socket.IO ──────────────────────────────────────────────────────
const app        = express();
const httpServer = createServer(app);
const io         = new Server(httpServer, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// ─── Download dir ─────────────────────────────────────────────────────────────
const downloadDir = path.resolve(process.cwd(), config.downloadDir);
await fs.mkdir(downloadDir, { recursive: true });

// ─── Peer registry ────────────────────────────────────────────────────────────
const peerRegistry = new PeerRegistry();

// ─── UDP Discovery ────────────────────────────────────────────────────────────
const discovery = new DiscoveryService({
    config,
    selfPeer,
    onPeerSeen: async (peer) => {
        peerRegistry.upsert(peer);
        await syncPeerFiles(peer);  // re-fetch their file list every HELLO (every 3s)
        io.emit(Events.PEER_STATE, { selfPeer, peers: peerRegistry.list() });
        pushFilesToUi();
    },
    onPeerLeft: (leftId) => {
        peerRegistry.markOffline(leftId);
        // Remove files belonging to the peer that left
        for (const [id, f] of sharedFiles) {
            if (f.ownerPeerId === leftId) sharedFiles.delete(id);
        }
        io.emit(Events.PEER_STATE, { selfPeer, peers: peerRegistry.list() });
        pushFilesToUi();
    }
});

// Prune peers silent for > 15s
setInterval(() => {
    const now = Date.now();
    let changed = false;
    for (const [id, peer] of peerRegistry.peers) {
        if (now - peer.lastSeen > 15000) {
            discovery.onPeerLeft(id);
            changed = true;
        }
    }
    if (changed) {
        io.emit(Events.PEER_STATE, { selfPeer, peers: peerRegistry.list() });
        pushFilesToUi();
    }
}, 5000);

// ─── Fetch a peer's file list (server → server HTTP) ──────────────────────────
async function syncPeerFiles(peer) {
    try {
        const res = await fetch(
            `http://${peer.host}:${peer.serverPort}/api/files`,
            { signal: AbortSignal.timeout(4000) }
        );
        if (!res.ok) return;
        const { files } = await res.json();
        // Remove old entries for this peer, then add fresh ones
        for (const [id, f] of sharedFiles) {
            if (f.ownerPeerId === peer.peerId && !f.isLocal) sharedFiles.delete(id);
        }
        for (const f of files) {
            sharedFiles.set(f.fileId, {
                ...f,
                ownerHost:       peer.host,
                ownerServerPort: peer.serverPort,
                isLocal:         false
            });
        }
    } catch { /* peer may not be reachable yet */ }
}

// ─── Push all visible files to all connected UIs ──────────────────────────────
function pushFilesToUi() {
    const all = Array.from(sharedFiles.values()).map(({ path: _p, ...f }) => f);
    io.emit(Events.FILES_UPDATED, { files: all });
}

// ─── REST API ─────────────────────────────────────────────────────────────────

// Health
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// Peer list
app.get("/api/peers", (_req, res) => res.json({ peers: peerRegistry.list() }));

// Our LOCAL files only — what other peers fetch to build their list
app.get("/api/files", (_req, res) => {
    const local = Array.from(sharedFiles.values())
        .filter(f => f.isLocal)
        .map(({ path: _p, ...f }) => f);
    res.json({ files: local });
});

// All visible files — local server tells the UI everything
app.get("/api/all-files", (_req, res) => {
    const all = Array.from(sharedFiles.values()).map(({ path: _p, ...f }) => f);
    res.json({ files: all });
});

// Share a local file: POST /api/files/share  { path }
app.post("/api/files/share", async (req, res) => {
    try {
        const { path: filePath } = req.body;
        if (!filePath) return res.status(400).json({ error: "path required" });

        const stat     = await fs.stat(filePath);
        const name     = path.basename(filePath);
        const fileId   = uuidv4();
        const mimeType = mime.lookup(name) || "application/octet-stream";

        const file = {
            fileId, name, size: stat.size, mimeType,
            path:            filePath,
            ownerPeerId:     selfPeer.peerId,
            ownerName:       selfPeer.peerName,
            ownerHost:       selfPeer.host,
            ownerServerPort: selfPeer.serverPort,
            isLocal:         true,
            sharedAt:        Date.now()
        };
        sharedFiles.set(fileId, file);
        pushFilesToUi();

        const { path: _p, ...safeFile } = file;
        res.status(201).json({ file: safeFile });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Serve a local file for download — other peers call this
app.get("/api/files/:fileId/download", async (req, res) => {
    const file = sharedFiles.get(req.params.fileId);
    if (!file?.isLocal || !file?.path) {
        return res.status(404).json({ error: "File not found" });
    }
    try {
        const stat = await fs.stat(file.path);
        res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(file.name)}"`);
        res.setHeader("Content-Type", file.mimeType || "application/octet-stream");
        res.setHeader("Content-Length", stat.size);
        res.setHeader("Access-Control-Allow-Origin", "*");

        // Stream in 256 KB chunks
        const handle = await fs.open(file.path, "r");
        const CHUNK  = 256 * 1024;
        let offset   = 0;
        try {
            while (offset < stat.size) {
                const buf = Buffer.alloc(CHUNK);
                const { bytesRead } = await handle.read(buf, 0, CHUNK, offset);
                if (bytesRead === 0) break;
                res.write(buf.subarray(0, bytesRead));
                offset += bytesRead;
            }
            res.end();
        } finally {
            await handle.close();
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.use((err, _req, res, _next) => {
    console.error("[api]", err.message);
    res.status(500).json({ error: err.message });
});

// ─── Socket.IO ────────────────────────────────────────────────────────────────
io.on("connection", (socket) => {
    // Send current state to newly connected UI
    socket.emit(Events.PEER_STATE, { selfPeer, peers: peerRegistry.list() });
    socket.emit(Events.FILES_UPDATED, {
        files: Array.from(sharedFiles.values()).map(({ path: _p, ...f }) => f)
    });

    // ── Download request from the UI ─────────────────────────────────────────
    // UI emits "transfer:request" { fileId }
    // We (server) fetch the file from the remote peer via HTTP and save to disk.
    // Then we tell the UI "done" or "error".
    socket.on("transfer:request", async ({ fileId } = {}) => {
        const file = sharedFiles.get(fileId);
        if (!file) {
            socket.emit("transfer:error", { error: "File not found in registry" });
            return;
        }
        if (file.isLocal) {
            socket.emit("transfer:error", { error: "File is already on this machine" });
            return;
        }

        socket.emit("transfer:progress", { fileId, fileName: file.name, status: "downloading" });

        try {
            const url = `http://${file.ownerHost}:${file.ownerServerPort}/api/files/${file.fileId}/download`;
            const res = await fetch(url, { signal: AbortSignal.timeout(60000) });
            if (!res.ok) throw new Error(`Peer returned ${res.status}`);

            const arrayBuffer = await res.arrayBuffer();
            const savePath    = path.join(downloadDir, file.name);
            await fs.writeFile(savePath, Buffer.from(arrayBuffer));

            socket.emit("transfer:done", { fileId, fileName: file.name, savePath });
            console.log(`[transfer] saved "${file.name}" → ${savePath}`);
        } catch (err) {
            console.error("[transfer] failed:", err.message);
            socket.emit("transfer:error", { fileId, fileName: file.name, error: err.message });
        }
    });
});

// ─── Start ────────────────────────────────────────────────────────────────────
httpServer.listen(config.socketPort, () =>
    console.log(`[socket] port ${config.socketPort}`)
);
app.listen(config.serverPort, () => {
    console.log(`[api]    port ${config.serverPort}  |  name: ${config.peerName}  |  ip: ${selfPeer.host}`);
    discovery.start();
});

process.on("SIGINT",  () => { discovery.stop(); process.exit(0); });
process.on("SIGTERM", () => { discovery.stop(); process.exit(0); });
