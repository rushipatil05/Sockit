import fs from "node:fs/promises";
import path from "node:path";
import express from "express";
import cors from "cors";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { v4 as uuidv4 } from "uuid";
import { config } from "./config.js";
import { DiscoveryService } from "./services/discoveryService.js";
import { FileIndexService } from "./services/fileIndexService.js";
import { PeerRegistry } from "./services/peerRegistry.js";
import { PeerNetworkService } from "./services/peerNetworkService.js";
import { TransferService } from "./services/transferService.js";
import { createApiRouter } from "./routes/api.js";
import { Events, Roles } from "../../shared/peerProtocol.js";

const peerId = process.env.PEER_ID || uuidv4();
const selfPeer = {
    peerId,
    peerName: config.peerName,
    socketPort: config.socketPort,
    serverPort: config.serverPort
};

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
    cors: {
        origin: "*"
    }
});

const peerRegistry = new PeerRegistry();
const fileIndexService = new FileIndexService({
    peerId: selfPeer.peerId,
    peerName: selfPeer.peerName
});

const sharedDir = path.resolve(process.cwd(), config.sharedFilesDir);
const downloadDir = path.resolve(process.cwd(), config.downloadDir);
await fs.mkdir(sharedDir, { recursive: true });
await fs.mkdir(downloadDir, { recursive: true });

console.log("[startup] using in-memory file storage");

// Clear this peer's stale local file index from a previous session
await fileIndexService.clearAll();
console.log("[startup] cleared previous session local file index");

const peerNetworkService = new PeerNetworkService({
    selfPeer,
    io,
    fileIndexService,
    peerRegistry,
    onUiUpdate: emitUiSnapshot
});

const transferService = new TransferService({
    fileIndexService,
    peerNetworkService,
    io,
    downloadDir
});

const discovery = new DiscoveryService({
    config,
    selfPeer,
    onPeerSeen: async (peer) => {
        try {
            const wasNew = !peerRegistry.get(peer.peerId);
            peerRegistry.upsert(peer);
            
            if (wasNew || !peerNetworkService.getSocketByPeerId(peer.peerId)) {
                await peerNetworkService.connectToPeer(peer);
            }
            emitUiSnapshot();
        } catch (error) {
            console.error("[discovery] onPeerSeen failed", error.message);
        }
    },
    onPeerLeft: async (peerLeavingId) => {
        try {
            peerRegistry.markOffline(peerLeavingId);
            await fileIndexService.removeRemotePeerFiles(peerLeavingId);
            emitUiSnapshot();
        } catch (error) {
            console.error("[discovery] onPeerLeft failed", error.message);
        }
    }
});

setInterval(() => {
    const now = Date.now();
    let pruned = false;
    
    // Manually check the raw map to ensure we trigger onPeerLeft for UI updates
    for (const [id, peer] of peerRegistry.peers.entries()) {
        if (now - peer.lastSeen > 15000) {
            discovery.onPeerLeft(id);
            pruned = true;
        }
    }
    
    if (pruned) {
        emitUiSnapshot();
    }
}, 5000);

app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.use(
    "/api",
    createApiRouter({
        peerRegistry,
        fileIndexService,
        transferService,
        peerNetworkService
    })
);

app.use((error, _req, res, _next) => {
    console.error("[api] error:", error.message || error);
    res.status(500).json({ error: error.message || "Unexpected server error" });
});

io.on("connection", (socket) => {
    const role = socket.handshake.auth?.role;

    if (role === Roles.PEER) {
        peerNetworkService.wireIncomingPeerSocketHandlers(socket);
    }

    if (role === Roles.UI) {
        emitUiSnapshot();
    }
});

function emitUiSnapshot() {
    io.emit(Events.PEER_STATE, {
        selfPeer,
        peers: peerRegistry.list()
    });
}

httpServer.listen(config.socketPort, () => {
    console.log(`[socket] listening on ${config.socketPort}`);
});

app.listen(config.serverPort, () => {
    console.log(`[api] listening on ${config.serverPort}`);
    discovery.start();
});

const shutdown = async () => {
    await peerNetworkService.broadcastPeerOffline(selfPeer.peerId);
    discovery.stop();
    process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
