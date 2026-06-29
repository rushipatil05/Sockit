import fs from "node:fs/promises";
import path from "node:path";
import express from "express";
import cors from "cors";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { v4 as uuidv4 } from "uuid";
import { config } from "./config.js";
import { DiscoveryService } from "./services/discoveryService.js";
import { PeerRegistry } from "./services/peerRegistry.js";
import { Events } from "../../shared/peerProtocol.js";

// ─── Identity ────────────────────────────────────────────────────────────────
const peerId = process.env.PEER_ID || uuidv4();
const selfPeer = {
    peerId,
    peerName: config.peerName,
    host: "localhost",
    socketPort: config.socketPort,
    serverPort: config.serverPort
};

// ─── Shared state ─────────────────────────────────────────────────────────────
// All files visible on the network.
// Map: fileId → { fileId, name, size, mimeType, ownerPeerId, ownerName,
//                 ownerHost, ownerServerPort, isLocal, sharedAt, path? }
const sharedFiles = new Map();

// ─── HTTP + Socket.IO ─────────────────────────────────────────────────────────
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

// ─── Peer registry ────────────────────────────────────────────────────────────
const peerRegistry = new PeerRegistry();

// ─── UDP Discovery ────────────────────────────────────────────────────────────
const discovery = new DiscoveryService({
    config,
    selfPeer,
    onPeerSeen: async (peer) => {
        const isNew = !peerRegistry.peers.has(peer.peerId);
        peerRegistry.upsert(peer);

        // On first sight of a peer, fetch their shared file list
        if (isNew) {
            await fetchPeerFiles(peer);
        }
        emitPeerState();
    },
    onPeerLeft: (peerLeavingId) => {
        peerRegistry.markOffline(peerLeavingId);
        removePeerFiles(peerLeavingId);
        emitPeerState();
    }
});

// Prune stale peers (no HELLO in 15 s)
setInterval(() => {
    const now = Date.now();
    for (const [id, peer] of peerRegistry.peers.entries()) {
        if (now - peer.lastSeen > 15000) {
            discovery.onPeerLeft(id);
        }
    }
    emitPeerState();
}, 5000);

// ─── Auto-fetch a peer's file list via HTTP ───────────────────────────────────
async function fetchPeerFiles(peer) {
    try {
        const url = `http://${peer.host}:${peer.serverPort}/api/files`;
        const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
        if (!res.ok) return;
        const { files } = await res.json();
        for (const f of files) {
            sharedFiles.set(f.fileId, {
                ...f,
                ownerHost: peer.host,
                ownerServerPort: peer.serverPort,
                isLocal: false
            });
        }
        emitFilesUpdated();
    } catch {
        // Peer may not have started yet — silent fail
    }
}

// ─── Express REST API ─────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Health
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// Peers list
app.get("/api/peers", (_req, res) => {
    res.json({ peers: peerRegistry.list() });
});

// All visible files (own + remote)
app.get("/api/files", (_req, res) => {
    // Return a safe version: strip internal disk path
    const safe = Array.from(sharedFiles.values()).map(f => {
        const { path: _, ...rest } = f;
        return rest;
    });
    res.json({ files: safe });
});

// Share a local file
app.post("/api/files/share", async (req, res) => {
    try {
        const { path: filePath } = req.body;
        if (!filePath) return res.status(400).json({ error: "File path is required" });

        const stat = await fs.stat(filePath);
        const { default: mime } = await import("mime-types");
        const name = path.basename(filePath);
        const fileId = uuidv4();

        const file = {
            fileId,
            name,
            size: stat.size,
            mimeType: mime.lookup(name) || "application/octet-stream",
            path: filePath,
            ownerPeerId: selfPeer.peerId,
            ownerName: selfPeer.peerName,
            ownerHost: selfPeer.host,
            ownerServerPort: selfPeer.serverPort,
            isLocal: true,
            sharedAt: Date.now()
        };

        sharedFiles.set(fileId, file);
        emitFilesUpdated();

        const { path: _p, ...safeFile } = file;
        res.status(201).json({ file: safeFile });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Download a local file (other peers call this on our server)
app.get("/api/files/:fileId/download", async (req, res) => {
    const file = sharedFiles.get(req.params.fileId);
    if (!file || !file.isLocal || !file.path) {
        return res.status(404).json({ error: "File not found" });
    }
    try {
        const stat = await fs.stat(file.path);
        res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(file.name)}"`);
        res.setHeader("Content-Type", file.mimeType || "application/octet-stream");
        res.setHeader("Content-Length", stat.size);

        // Stream file in chunks
        const fileHandle = await fs.open(file.path, "r");
        const CHUNK = 256 * 1024;
        let offset = 0;
        try {
            while (offset < stat.size) {
                const buf = Buffer.alloc(CHUNK);
                const { bytesRead } = await fileHandle.read(buf, 0, CHUNK, offset);
                if (bytesRead === 0) break;
                res.write(buf.subarray(0, bytesRead));
                offset += bytesRead;
            }
            res.end();
        } finally {
            await fileHandle.close();
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Error handler
app.use((error, _req, res, _next) => {
    console.error("[api] error:", error.message);
    res.status(500).json({ error: error.message });
});

// ─── Socket.IO — UI only ───────────────────────────────────────────────────────
io.on("connection", () => {
    // Push current state to newly connected UI
    emitPeerState();
    emitFilesUpdated();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function emitPeerState() {
    io.emit(Events.PEER_STATE, {
        selfPeer,
        peers: peerRegistry.list()
    });
}

function emitFilesUpdated() {
    const safe = Array.from(sharedFiles.values()).map(f => {
        const { path: _, ...rest } = f;
        return rest;
    });
    io.emit(Events.FILES_UPDATED, { files: safe });
}

function removePeerFiles(ownerPeerId) {
    for (const [fid, f] of sharedFiles.entries()) {
        if (f.ownerPeerId === ownerPeerId) {
            sharedFiles.delete(fid);
        }
    }
    emitFilesUpdated();
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
httpServer.listen(config.socketPort, () => {
    console.log(`[socket] listening on port ${config.socketPort}`);
});

app.listen(config.serverPort, () => {
    console.log(`[api]    listening on port ${config.serverPort}  (name: ${config.peerName})`);
    discovery.start();
});

// ─── Graceful shutdown ────────────────────────────────────────────────────────
process.on("SIGINT", () => { discovery.stop(); process.exit(0); });
process.on("SIGTERM", () => { discovery.stop(); process.exit(0); });
