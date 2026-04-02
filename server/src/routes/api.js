import express from "express";

export function createApiRouter({ peerRegistry, roomService, fileIndexService, transferService, peerNetworkService }) {
    const router = express.Router();

    function ensureRoom(req, res, next) {
        if (!roomService.isActive()) {
            return res.status(403).json({ error: "Join or create a room first." });
        }
        next();
    }

    router.get("/health", (_req, res) => {
        res.json({ ok: true });
    });

    router.get("/peers", (_req, res) => {
        res.json({ peers: peerRegistry.list() });
    });

    router.get("/room", (_req, res) => {
        res.json({ room: roomService.getRoomSummary() });
    });

    router.post("/room/create", (req, res, next) => {
        try {
            const { roomId, roomKey } = req.body || {};
            const room = roomService.createRoom({ roomId, roomKey });
            res.status(201).json({ room });
        } catch (error) {
            next(error);
        }
    });

    router.post("/room/join", (req, res, next) => {
        try {
            const { roomId, roomKey } = req.body || {};
            const room = roomService.joinRoom({ roomId, roomKey });
            res.status(200).json({ room });
        } catch (error) {
            next(error);
        }
    });

    router.get("/files", ensureRoom, async (_req, res, next) => {
        try {
            const files = await fileIndexService.getAllFiles();
            res.json({ files });
        } catch (error) {
            next(error);
        }
    });

    router.post("/files/share", ensureRoom, async (req, res, next) => {
        try {
            const { path } = req.body;
            if (!path) {
                return res.status(400).json({ error: "File path is required" });
            }

            const file = await fileIndexService.shareFile(path);
            await peerNetworkService.broadcastIndexUpsert(file);
            res.status(201).json({ file });
        } catch (error) {
            next(error);
        }
    });

    router.get("/transfers", ensureRoom, (_req, res) => {
        res.json({ transfers: transferService.listTransfers() });
    });

    router.post("/transfers/download", ensureRoom, async (req, res, next) => {
        try {
            const { peerId, fileId, saveDir } = req.body;
            if (!peerId || !fileId) {
                return res.status(400).json({ error: "peerId and fileId are required" });
            }

            const transfer = await transferService.downloadFile({ peerId, fileId, saveDir });
            res.status(202).json({ transfer });
        } catch (error) {
            next(error);
        }
    });

    return router;
}
