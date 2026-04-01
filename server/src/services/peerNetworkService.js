import { io as createClient } from "socket.io-client";
import { Events, Roles } from "../../../shared/peerProtocol.js";

export class PeerNetworkService {
    constructor({ selfPeer, io, fileIndexService, peerRegistry, onUiUpdate }) {
        this.selfPeer = selfPeer;
        this.io = io;
        this.fileIndexService = fileIndexService;
        this.peerRegistry = peerRegistry;
        this.onUiUpdate = onUiUpdate;
        this.peerSockets = new Map();
    }

    wireIncomingPeerSocketHandlers(socket) {
        const remotePeerId = socket.handshake.auth?.peerId;
        const remotePeerName = socket.handshake.auth?.peerName || "Unknown";

        if (remotePeerId) {
            this.peerRegistry.upsert({
                peerId: remotePeerId,
                peerName: remotePeerName,
                host: socket.handshake.address,
                socketPort: null,
                serverPort: null
            });
            this.onUiUpdate();
        }

        socket.on(Events.INDEX_REQUEST, async (_, callback) => {
            const localFiles = await this.fileIndexService.getLocalFiles();
            callback?.({ ok: true, files: localFiles });
        });

        socket.on(Events.INDEX_UPSERT, async (payload) => {
            if (!payload?.peer?.peerId || !payload?.file) {
                return;
            }
            await this.fileIndexService.upsertRemoteFiles(payload.peer, [payload.file]);
            this.io.emit(Events.INDEX_UPSERT, payload);
            this.onUiUpdate();
        });

        socket.on(Events.INDEX_REMOVE, async (payload) => {
            if (!payload?.peerId) {
                return;
            }
            await this.fileIndexService.removeRemotePeerFiles(payload.peerId);
            this.io.emit(Events.INDEX_REMOVE, payload);
            this.onUiUpdate();
        });

        socket.on(Events.TRANSFER_PULL_REQUEST, async (payload, callback) => {
            const result = await this.handlePullRequest(payload);
            callback(result);
        });

        socket.on("disconnect", () => {
            if (remotePeerId) {
                this.peerRegistry.markOffline(remotePeerId);
                this.onUiUpdate();
            }
        });
    }

    async connectToPeer(peer) {
        if (peer.peerId === this.selfPeer.peerId || this.peerSockets.has(peer.peerId)) {
            return;
        }

        const socket = createClient(`http://${peer.host}:${peer.socketPort}`, {
            reconnection: true,
            timeout: 5000,
            auth: {
                role: Roles.PEER,
                peerId: this.selfPeer.peerId,
                peerName: this.selfPeer.peerName
            }
        });

        socket.on("connect", async () => {
            this.peerRegistry.upsert(peer);
            this.peerSockets.set(peer.peerId, socket);
            await this.requestIndexSync(peer.peerId);
            this.onUiUpdate();
        });

        socket.on("disconnect", () => {
            this.peerRegistry.markOffline(peer.peerId);
            this.peerSockets.delete(peer.peerId);
            this.onUiUpdate();
        });

        socket.on(Events.INDEX_UPSERT, async (payload) => {
            if (!payload?.peer?.peerId || !payload?.file) {
                return;
            }
            await this.fileIndexService.upsertRemoteFiles(payload.peer, [payload.file]);
            this.io.emit(Events.INDEX_UPSERT, payload);
            this.onUiUpdate();
        });

        socket.on(Events.INDEX_REMOVE, async (payload) => {
            if (!payload?.peerId) {
                return;
            }
            await this.fileIndexService.removeRemotePeerFiles(payload.peerId);
            this.io.emit(Events.INDEX_REMOVE, payload);
            this.onUiUpdate();
        });
    }

    getSocketByPeerId(peerId) {
        return this.peerSockets.get(peerId);
    }

    async requestIndexSync(peerId) {
        const socket = this.peerSockets.get(peerId);
        if (!socket) {
            return;
        }

        const response = await socket.timeout(8000).emitWithAck(Events.INDEX_REQUEST, {});
        if (response?.ok && Array.isArray(response.files)) {
            const peer = this.peerRegistry.get(peerId);
            if (peer) {
                await this.fileIndexService.upsertRemoteFiles(peer, response.files);
            }
        }
    }

    async broadcastIndexUpsert(file) {
        const peer = {
            peerId: this.selfPeer.peerId,
            peerName: this.selfPeer.peerName
        };
        this.io.emit(Events.INDEX_UPSERT, { peer, file });

        for (const socket of this.peerSockets.values()) {
            socket.emit(Events.INDEX_UPSERT, { peer, file });
        }
    }

    async broadcastPeerOffline(peerId) {
        this.io.emit(Events.INDEX_REMOVE, { peerId });
        for (const socket of this.peerSockets.values()) {
            socket.emit(Events.INDEX_REMOVE, { peerId });
        }
    }

    async handlePullRequest(payload) {
        try {
            const { fileId, offset = 0, chunkSize = 256 * 1024 } = payload || {};
            const file = await this.fileIndexService.getFileById(fileId);
            if (!file || !file.isLocal || !file.path) {
                return { ok: false, error: "File not found on this peer." };
            }

            const { open } = await import("node:fs/promises");
            const handle = await open(file.path, "r");
            const buffer = Buffer.alloc(chunkSize);
            const { bytesRead } = await handle.read(buffer, 0, chunkSize, offset);
            await handle.close();

            const payloadBuffer = buffer.subarray(0, bytesRead);
            const nextOffset = offset + bytesRead;

            return {
                ok: true,
                fileName: file.name,
                mimeType: file.mimeType,
                totalSize: file.size,
                offset,
                nextOffset,
                eof: nextOffset >= file.size,
                chunk: payloadBuffer.toString("base64")
            };
        } catch (error) {
            return { ok: false, error: error.message || "Chunk read failed" };
        }
    }
}
