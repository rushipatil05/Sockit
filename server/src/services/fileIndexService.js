import fs from "node:fs/promises";
import crypto from "node:crypto";
import path from "node:path";
import mime from "mime-types";
import { v4 as uuidv4 } from "uuid";

export class FileIndexService {
    constructor({ peerId, peerName }) {
        this.peerId = peerId;
        this.peerName = peerName;
        this.files = []; // In-memory database
    }

    /** Wipe all file metadata so each session starts fresh. */
    async clearAll() {
        this.files = [];
    }

    async shareFile(filePath) {
        const absolutePath = path.resolve(filePath);
        const stats = await fs.stat(absolutePath);

        if (!stats.isFile()) {
            throw new Error("Only regular files can be shared.");
        }

        const name = path.basename(absolutePath);
        const mimeType = mime.lookup(name) || "application/octet-stream";
        const hash = await this.computeHash(absolutePath);
        
        let fileEntry = this.files.find(f => f.path === absolutePath && f.ownerPeerId === this.peerId && f.isLocal);

        if (fileEntry) {
            fileEntry.fileId = fileEntry.fileId || uuidv4();
            fileEntry.name = name;
            fileEntry.size = stats.size;
            fileEntry.mimeType = mimeType;
            fileEntry.hash = hash;
            fileEntry.updatedAtSource = Date.now();
        } else {
            fileEntry = {
                fileId: uuidv4(),
                name,
                size: stats.size,
                mimeType,
                path: absolutePath,
                ownerPeerId: this.peerId,
                ownerName: this.peerName,
                isLocal: true,
                hash,
                updatedAtSource: Date.now()
            };
            this.files.push(fileEntry);
        }

        return fileEntry;
    }

    async getLocalFiles() {
        return this.files.filter(f => f.isLocal && f.ownerPeerId === this.peerId);
    }

    async getAllFiles() {
        return [...this.files].sort((a, b) => b.updatedAtSource - a.updatedAtSource);
    }

    async upsertRemoteFiles(peer, files) {
        for (const item of files) {
            let existing = this.files.find(f => f.fileId === item.fileId);
            if (existing) {
                existing.name = item.name;
                existing.size = item.size;
                existing.mimeType = item.mimeType || "application/octet-stream";
                existing.path = null;
                existing.ownerPeerId = peer.peerId;
                existing.ownerName = peer.peerName;
                existing.isLocal = false;
                existing.hash = item.hash || null;
                existing.updatedAtSource = item.updatedAtSource || Date.now();
            } else {
                this.files.push({
                    fileId: item.fileId,
                    name: item.name,
                    size: item.size,
                    mimeType: item.mimeType || "application/octet-stream",
                    path: null,
                    ownerPeerId: peer.peerId,
                    ownerName: peer.peerName,
                    isLocal: false,
                    hash: item.hash || null,
                    updatedAtSource: item.updatedAtSource || Date.now()
                });
            }
        }
    }

    async removeRemotePeerFiles(peerId) {
        this.files = this.files.filter(f => !(f.ownerPeerId === peerId && !f.isLocal));
    }

    async getFileById(fileId) {
        return this.files.find(f => f.fileId === fileId) || null;
    }

    async computeHash(filePath) {
        const content = await fs.readFile(filePath);
        return crypto.createHash("sha256").update(content).digest("hex");
    }
}
