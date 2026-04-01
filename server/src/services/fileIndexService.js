import fs from "node:fs/promises";
import crypto from "node:crypto";
import path from "node:path";
import mime from "mime-types";
import { v4 as uuidv4 } from "uuid";
import { SharedFile } from "../models/SharedFile.js";

export class FileIndexService {
    constructor({ peerId, peerName }) {
        this.peerId = peerId;
        this.peerName = peerName;
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
        const existing = await SharedFile.findOne({
            path: absolutePath,
            ownerPeerId: this.peerId,
            isLocal: true
        });

        const shared = await SharedFile.findOneAndUpdate(
            { path: absolutePath, ownerPeerId: this.peerId, isLocal: true },
            {
                fileId: existing?.fileId || uuidv4(),
                name,
                size: stats.size,
                mimeType,
                path: absolutePath,
                ownerPeerId: this.peerId,
                ownerName: this.peerName,
                isLocal: true,
                hash,
                updatedAtSource: Date.now()
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        return shared.toObject();
    }

    async getLocalFiles() {
        return SharedFile.find({ isLocal: true, ownerPeerId: this.peerId }).lean();
    }

    async getAllFiles() {
        return SharedFile.find({}).sort({ updatedAtSource: -1 }).lean();
    }

    async upsertRemoteFiles(peer, files) {
        const operations = files.map((item) => ({
            updateOne: {
                filter: { fileId: item.fileId },
                update: {
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
                },
                upsert: true
            }
        }));

        if (operations.length > 0) {
            await SharedFile.bulkWrite(operations);
        }
    }

    async removeRemotePeerFiles(peerId) {
        await SharedFile.deleteMany({ ownerPeerId: peerId, isLocal: false });
    }

    async getFileById(fileId) {
        return SharedFile.findOne({ fileId }).lean();
    }

    async computeHash(filePath) {
        const content = await fs.readFile(filePath);
        return crypto.createHash("sha256").update(content).digest("hex");
    }
}
