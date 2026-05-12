import express from "express";

export function createApiRouter({ peerRegistry, fileIndexService, transferService, peerNetworkService }) {
    const router = express.Router();

    router.get("/health", (_req, res) => {
        res.json({ ok: true });
    });

    router.get("/peers", (_req, res) => {
        res.json({ peers: peerRegistry.list() });
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
