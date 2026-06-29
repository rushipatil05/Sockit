import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

// Get the machine's actual LAN IP (not localhost)
function getLanIp() {
    const interfaces = os.networkInterfaces();
    for (const key of Object.keys(interfaces)) {
        for (const item of interfaces[key] || []) {
            if (item.family === "IPv4" && !item.internal) return item.address;
        }
    }
    return "127.0.0.1";
}
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
    host: getLanIp(),          // real LAN IP so other peers can reach us
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
        peerRegistry.upsert(peer);
        // Re-fetch file list on every HELLO (every 3s) so new shares are picked up automatically
        await fetchPeerFiles(peer);
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

// My own shared files (for other peers to fetch)
// Returns ONLY local files so cross-peer fetching never creates circular data
app.get("/api/files", (_req, res) => {
    const localFiles = Array.from(sharedFiles.values())
        .filter(f => f.isLocal)
        .map(f => {
            const { path: _, ...rest } = f;
            return rest;
        });
    res.json({ files: localFiles });
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

// Download a local file — called by other peers directly
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
        res.setHeader("Access-Control-Allow-Origin", "*");

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

// Proxy download — our LOCAL server fetches the file from a REMOTE peer
// and streams it back to the Electron client (avoids Electron blocking cross-origin navigations)
app.get("/api/proxy-download", async (req, res) => {
    const { url, name, mime: mimeType } = req.query;
    if (!url) return res.status(400).json({ error: "url required" });

    try {
        const upstream = await fetch(decodeURIComponent(url), {
            signal: AbortSignal.timeout(30000)
        });
        if (!upstream.ok) {
            return res.status(upstream.status).json({ error: "Remote peer returned error" });
        }

        res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(name || "file")}"`);
        res.setHeader("Content-Type", mimeType || upstream.headers.get("content-type") || "application/octet-stream");
        const contentLength = upstream.headers.get("content-length");
        if (contentLength) res.setHeader("Content-Length", contentLength);
        res.setHeader("Access-Control-Allow-Origin", "*");

        // Stream response body directly to client
        const reader = upstream.body.getReader();
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                res.write(Buffer.from(value));
            }
            res.end();
        } finally {
            reader.releaseLock();
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
    // Send ALL files (local + remote) to the UI for display
    const all = Array.from(sharedFiles.values()).map(f => {
        const { path: _, ...rest } = f;
        return rest;
    });
    io.emit(Events.FILES_UPDATED, { files: all });
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
