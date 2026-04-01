import { Panel } from "../components/Panel";

function formatRate(bytes, total, startedAt) {
    if (!startedAt || !bytes) {
        return "-";
    }
    const elapsed = Math.max((Date.now() - startedAt) / 1000, 1);
    const speed = bytes / elapsed;
    const percent = Math.round((bytes / Math.max(total, 1)) * 100);
    return `${(speed / (1024 * 1024)).toFixed(2)} MB/s • ${percent}%`;
}

export function TransfersPage({ transfers }) {
    return (
        <Panel title="Transfers" subtitle="Real-time progress over peer sockets">
            <div className="space-y-3">
                {transfers.length === 0 ? (
                    <p className="text-sm text-white/50">No transfers yet.</p>
                ) : (
                    transfers.map((transfer) => (
                        <div key={transfer.transferId} className="rounded-xl border border-white/10 p-3">
                            <div className="mb-2 flex items-center justify-between">
                                <p className="font-medium text-white">{transfer.fileName}</p>
                                <span
                                    className={`text-xs ${transfer.status === "completed"
                                            ? "text-neon"
                                            : transfer.status === "failed"
                                                ? "text-danger"
                                                : "text-neon2"
                                        }`}
                                >
                                    {transfer.status}
                                </span>
                            </div>
                            <div className="h-2 rounded-full bg-white/10">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-neon to-neon2 transition-all"
                                    style={{ width: `${transfer.progress || 0}%` }}
                                />
                            </div>
                            <p className="mt-2 text-xs text-white/50">
                                {formatRate(transfer.downloadedBytes, transfer.totalSize, transfer.startedAt)}
                            </p>
                        </div>
                    ))
                )}
            </div>
        </Panel>
    );
}
