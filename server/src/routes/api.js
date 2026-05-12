import express from "express";

export function createApiRouter({ peerRegistry, fileIndexService, transferService, peerNetworkService, roomService }) {
    const router = express.Router();

    router.get("/health", (_req, res) => {
        res.json({ ok: true });
    });

    router.get("/peers", (_req, res) => {
        res.json({ peers: peerRegistry.list() });
    });

    // Room Routes
    router.get("/room/status", (_req, res) => {
        res.json({ room: roomService.getRoom() });
    });

    router.post("/room/create", (_req, res) => {
        const code = roomService.createRoom();
        // Disconnect any existing peers from previous session
        peerNetworkService.disconnectAllPeers();
        res.json({ room: { code, isHost: true } });
    });

    router.post("/room/join", async (req, res, next) => {
        try {
            const { code } = req.body;
            if (!code) return res.status(400).json({ error: "Room code required" });

            roomService.joinRoom(code);
            peerNetworkService.disconnectAllPeers(); // Clear old connections

            // Attempt to connect to all known peers with this room code
            const peers = peerRegistry.list();
            for (const peer of peers) {
                await peerNetworkService.connectToPeer(peer, code).catch(() => {});
            }

            res.json({ room: { code, isHost: false } });
        } catch (error) {
            next(error);
        }
    });

    router.post("/room/leave", async (_req, res) => {
        roomService.leaveRoom();
        peerNetworkService.disconnectAllPeers();
        // Clear remote files from the index since we left the room
        await fileIndexService.clearRemoteFiles();
        res.json({ ok: true });
    });

    router.get("/files", async (_req, res, next) => {
        try {
            const files = await fileIndexService.getAllFiles();
            res.json({ files });
        } catch (error) {
            next(error);
        }
    });

    router.post("/files/share", async (req, res, next) => {
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

    router.get("/transfers", (_req, res) => {
        res.json({ transfers: transferService.listTransfers() });
    });

    router.post("/transfers/download", async (req, res, next) => {
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
