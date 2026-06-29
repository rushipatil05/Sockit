import express from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { v4 as uuidv4 } from "uuid";
import mime from "mime-types";

export function createApiRouter({ peerRegistry, roomService, sharedFiles, selfPeer }) {
    const router = express.Router();

    // ── Health ──────────────────────────────────────────────────────────────
    router.get("/health", (_req, res) => {
        res.json({ ok: true });
    });

    // ── Peers ───────────────────────────────────────────────────────────────
    router.get("/peers", (_req, res) => {
        res.json({ peers: peerRegistry.list() });
    });

    // ── Room ────────────────────────────────────────────────────────────────
    router.get("/room/status", (_req, res) => {
        res.json({ room: roomService.getRoom() });
    });

    router.post("/room/create", (_req, res) => {
        const code = roomService.createRoom();
        res.json({ room: { code, isHost: true } });
    });

    router.post("/room/join", (req, res) => {
        const { code } = req.body;
        if (!code) return res.status(400).json({ error: "Room code required" });
        roomService.joinRoom(code);
        res.json({ room: { code, isHost: false } });
    });

    router.post("/room/leave", (_req, res) => {
        roomService.leaveRoom();
        // Remove this peer's own shared files on leave
        for (const [fid, f] of sharedFiles.entries()) {
            if (f.ownerPeerId === selfPeer.peerId) {
                sharedFiles.delete(fid);
            }
        }
        res.json({ ok: true });
    });

    // ── Files ───────────────────────────────────────────────────────────────
    // GET /files — returns all currently shared files
    router.get("/files", (_req, res) => {
        res.json({ files: Array.from(sharedFiles.values()) });
    });

    // POST /files/share — registers a local file into the shared Map
    router.post("/files/share", async (req, res, next) => {
        try {
            const { path: filePath } = req.body;
            if (!filePath) return res.status(400).json({ error: "File path is required" });

            const stat = await fs.stat(filePath);
            const fileId = uuidv4();
            const name = path.basename(filePath);
            const mimeType = mime.lookup(name) || "application/octet-stream";

            const file = {
                fileId,
                name,
                size: stat.size,
                mimeType,
                path: filePath,          // local disk path (server-only, not sent to UI)
                ownerPeerId: selfPeer.peerId,
                ownerName: selfPeer.peerName,
                isLocal: true
            };

            sharedFiles.set(fileId, file);

            // Return a safe version (no disk path) to the client
            const safeFile = { ...file };
            delete safeFile.path;

            res.status(201).json({ file: safeFile });
        } catch (error) {
            next(error);
        }
    });

    return router;
}
