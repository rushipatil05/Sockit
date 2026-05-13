import fs from "node:fs/promises";
import path from "node:path";
import { Events } from "../../../shared/peerProtocol.js";

export class TransferService {
    constructor({ fileIndexService, peerNetworkService, io, downloadDir }) {
        this.fileIndexService = fileIndexService;
        this.peerNetworkService = peerNetworkService;
        this.io = io;
        this.downloadDir = downloadDir;
        this.transfers = new Map();
    }

    listTransfers() {
        return Array.from(this.transfers.values()).sort((a, b) => b.startedAt - a.startedAt);
    }

    async downloadFile({ peerId, fileId, savePath }) {
        const file = await this.fileIndexService.getFileById(fileId);
        if (!file) {
            throw new Error("File metadata not found.");
        }

        const socket = this.peerNetworkService.getSocketByPeerId(peerId);
        if (!socket) {
            throw new Error("Peer is not connected.");
        }

        let targetPath;
        if (savePath) {
            targetPath = path.resolve(savePath);
            await fs.mkdir(path.dirname(targetPath), { recursive: true });
        } else {
            const outputDir = path.resolve(this.downloadDir);
            await fs.mkdir(outputDir, { recursive: true });
            targetPath = path.join(outputDir, file.name);
        }
        let offset = 0;
        let resume = false;

        try {
            const stats = await fs.stat(targetPath);
            if (stats.size > 0 && stats.size < file.size) {
                offset = stats.size;
                resume = true;
            } else if (stats.size >= file.size) {
                await fs.truncate(targetPath, 0);
                offset = 0;
            }
        } catch {
            offset = 0;
        }

        const transferId = `${fileId}:${Date.now()}`;
        const transferState = {
            transferId,
            fileId,
            fileName: file.name,
            peerId,
            totalSize: file.size,
            downloadedBytes: offset,
            progress: Math.round((offset / Math.max(file.size, 1)) * 100),
            status: "running",
            startedAt: Date.now(),
            targetPath
        };

        this.transfers.set(transferId, transferState);
        this.io.emit(Events.TRANSFER_PROGRESS, transferState);

        const fileHandle = await fs.open(targetPath, resume ? "a" : "w");

        try {
            while (true) {
                const ack = await socket
                    .timeout(30000)
                    .emitWithAck(Events.TRANSFER_PULL_REQUEST, { fileId, offset, chunkSize: 256 * 1024 });

                // Some Socket.IO transports may return ack wrapped in a single-item array.
                const response = Array.isArray(ack) ? ack[0] : ack;

                if (!response?.ok) {
                    throw new Error(response?.error || "Chunk transfer failed");
                }

                const chunkBuffer = Buffer.from(response.chunk, "base64");
                if (chunkBuffer.length === 0 && !response.eof) {
                    throw new Error("Received empty chunk before EOF");
                }

                if (chunkBuffer.length > 0) {
                    await fileHandle.write(chunkBuffer, 0, chunkBuffer.length);
                }
                offset = response.nextOffset;

                transferState.downloadedBytes = offset;
                transferState.totalSize = response.totalSize || transferState.totalSize;
                transferState.progress = Math.round(
                    (offset / Math.max(transferState.totalSize, 1)) * 100
                );
                this.io.emit(Events.TRANSFER_PROGRESS, transferState);

                if (response.eof) {
                    break;
                }
            }

            transferState.status = "completed";
            transferState.completedAt = Date.now();
            this.io.emit(Events.TRANSFER_COMPLETE, transferState);
            return transferState;
        } catch (error) {
            transferState.status = "failed";
            transferState.error = error.message;
            this.io.emit(Events.TRANSFER_ERROR, transferState);
            throw error;
        } finally {
            await fileHandle.close();
        }
    }
}
