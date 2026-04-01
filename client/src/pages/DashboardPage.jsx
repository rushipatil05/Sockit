import { useState } from "react";
import { motion } from "framer-motion";
import { startDownload } from "../api";
import { Panel } from "../components/Panel";

function formatBytes(bytes) {
    if (!bytes && bytes !== 0) {
        return "-";
    }
    const units = ["B", "KB", "MB", "GB"];
    let value = bytes;
    let index = 0;
    while (value >= 1024 && index < units.length - 1) {
        value /= 1024;
        index += 1;
    }
    return `${value.toFixed(1)} ${units[index]}`;
}

export function DashboardPage({ peers, files, onTransferQueued }) {
    const [busyId, setBusyId] = useState(null);

    async function handleDownload(file) {
        try {
            setBusyId(file.fileId);
            await startDownload({ peerId: file.ownerPeerId, fileId: file.fileId });
            onTransferQueued?.();
        } finally {
            setBusyId(null);
        }
    }

    return (
        <div className="grid gap-5 lg:grid-cols-[0.95fr,1.45fr]">
            <Panel title="Active Peers" subtitle="Discovered through LAN UDP broadcast">
                <div className="space-y-3">
                    {peers.length === 0 ? (
                        <p className="text-sm text-white/50">No peers online yet. Keep Socket Share open on another device.</p>
                    ) : (
                        peers.map((peer) => (
                            <motion.div
                                key={peer.peerId}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="rounded-xl border border-white/10 bg-white/5 p-3"
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium text-white">{peer.peerName}</p>
                                        <p className="text-xs text-white/50">{peer.host || "LAN"}</p>
                                    </div>
                                    <span
                                        className={`rounded-full px-2 py-1 text-xs ${peer.status === "online" ? "bg-neon/15 text-neon" : "bg-white/10 text-white/60"
                                            }`}
                                    >
                                        {peer.status || "online"}
                                    </span>
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>
            </Panel>

            <Panel title="Shared Files" subtitle="Indexed across all discovered peers">
                <div className="space-y-2">
                    {files.length === 0 ? (
                        <p className="text-sm text-white/50">No shared files available yet.</p>
                    ) : (
                        files.map((file) => (
                            <div key={file.fileId} className="flex items-center justify-between rounded-xl border border-white/10 p-3">
                                <div>
                                    <p className="font-medium text-white">{file.name}</p>
                                    <p className="text-xs text-white/50">
                                        {formatBytes(file.size)} • {file.mimeType} • {file.ownerName}
                                    </p>
                                </div>
                                {file.isLocal ? (
                                    <span className="rounded-lg bg-neon/15 px-3 py-1 text-xs text-neon">Local</span>
                                ) : (
                                    <button
                                        className="rounded-lg bg-neon/20 px-3 py-1 text-sm text-neon transition hover:bg-neon/30 disabled:opacity-50"
                                        onClick={() => handleDownload(file)}
                                        disabled={busyId === file.fileId}
                                    >
                                        {busyId === file.fileId ? "Starting..." : "Download"}
                                    </button>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </Panel>
        </div>
    );
}
