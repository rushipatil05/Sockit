import fs from "node:fs/promises";
import crypto from "node:crypto";
import path from "node:path";
import mime from "mime-types";
import { v4 as uuidv4 } from "uuid";
import { FileEntry } from "../models/FileEntry.js";

export class FileIndexService {
    constructor({ peerId, peerName }) {
        this.peerId = peerId;
        this.peerName = peerName;
    }

    /** Remove all file records owned by this peer from a previous session. */
    async clearAll() {
        await FileEntry.deleteMany({ ownerPeerId: this.peerId });
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

        // Update existing entry if the same local file is re-shared
        const existing = await FileEntry.findOne({
            path: absolutePath,
            ownerPeerId: this.peerId,
            isLocal: true
        });

        if (existing) {
            existing.name = name;
            existing.size = stats.size;
            existing.mimeType = mimeType;
            existing.hash = hash;
            existing.updatedAtSource = Date.now();
            await existing.save();
            return existing.toObject();
        }

        const entry = await FileEntry.create({
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
        });

        return entry.toObject();
    }

    async getLocalFiles() {
        const docs = await FileEntry.find({ isLocal: true, ownerPeerId: this.peerId }).lean();
        return docs;
    }

    async getAllFiles() {
        const docs = await FileEntry.find({}).sort({ updatedAtSource: -1 }).lean();
        return docs;
    }

    async upsertRemoteFiles(peer, files) {
        for (const item of files) {
            await FileEntry.findOneAndUpdate(
                { fileId: item.fileId },
                {
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
                { upsert: true, new: true }
            );
        }
    }

    async removeRemotePeerFiles(peerId) {
        await FileEntry.deleteMany({ ownerPeerId: peerId, isLocal: false });
    }

    async getFileById(fileId) {
        const doc = await FileEntry.findOne({ fileId }).lean();
        return doc || null;
    }

    async computeHash(filePath) {
        const content = await fs.readFile(filePath);
        return crypto.createHash("sha256").update(content).digest("hex");
    }
}
