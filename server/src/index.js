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
import { RoomService } from "./services/roomService.js";
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

const roomService = new RoomService();

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
            peerRegistry.upsert(peer);
            
            // Only try connecting if we are in a room and NOT the host
            // (If we are the host, we wait for others to join our room)
            if (roomService.isInRoom() && !roomService.isHost) {
                if (!peerNetworkService.getSocketByPeerId(peer.peerId)) {
                    await peerNetworkService.connectToPeer(peer, roomService.getRoomCode()).catch(() => {});
                }
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
        peerNetworkService,
        roomService
    })
);

app.use((error, _req, res, _next) => {
    console.error("[api] error:", error.message || error);
    res.status(500).json({ error: error.message || "Unexpected server error" });
});

io.use((socket, next) => {
    const role = socket.handshake.auth?.role;
    if (role === Roles.UI) return next();

    if (role === Roles.PEER) {
        const theirRoomCode = socket.handshake.auth?.roomCode;
        const myRoomCode = roomService.getRoomCode();

        if (!myRoomCode) {
            return next(new Error("Not in a room"));
        }

        if (theirRoomCode !== myRoomCode) {
            return next(new Error("Invalid room code"));
        }

        return next();
    }

    next(new Error("Invalid role"));
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
