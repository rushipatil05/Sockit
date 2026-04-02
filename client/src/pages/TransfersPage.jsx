import { motion } from "framer-motion";
import { Section } from "../components/Panel";

function formatRate(bytes, total, startedAt) {
    if (!startedAt || !bytes) return "-";
    const elapsed = Math.max((Date.now() - startedAt) / 1000, 1);
    const speed = bytes / elapsed;
    const percent = Math.round((bytes / Math.max(total, 1)) * 100);
    return `${(speed / (1024 * 1024)).toFixed(2)} MB/s • ${percent}%`;
}

export function TransfersPage({ transfers }) {
    return (
        <Section title="Transfers" subtitle="Real-time progress over peer sockets" delay={0.05}>
            <div className="space-y-3">
                {transfers.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 py-16">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.03]">
                            <svg className="h-6 w-6 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                            </svg>
                        </div>
                        <p className="text-sm text-white/25">No transfers yet</p>
                    </div>
                ) : (
                    transfers.map((transfer, i) => (
                        <motion.div
                            key={transfer.transferId}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.04 }}
                            className="rounded-xl bg-white/[0.03] px-4 py-4 hover:bg-white/[0.05]"
                        >
                            <div className="mb-3 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-xs">
                                        📄
                                    </div>
                                    <p className="text-sm font-medium text-white/90">{transfer.fileName}</p>
                                </div>
                                <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                                    transfer.status === "completed"
                                        ? "bg-success/10 text-success"
                                        : transfer.status === "failed"
                                            ? "bg-danger/10 text-danger"
                                            : "bg-white/5 text-white/50"
                                }`}>
                                    {transfer.status}
                                </span>
                            </div>

                            {/* Progress bar */}
                            <div className="relative h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                                <motion.div
                                    className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-accent to-blue-400"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${transfer.progress || 0}%` }}
                                    transition={{ duration: 0.4, ease: "easeOut" }}
                                />
                                {/* Shimmer effect on active transfers */}
                                {transfer.status !== "completed" && transfer.status !== "failed" && (transfer.progress || 0) > 0 && (
                                    <div
                                        className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent"
                                        style={{ backgroundSize: "200% 100%" }}
                                    />
                                )}
                            </div>

                            <p className="mt-2 font-mono text-[11px] text-white/30">
                                {formatRate(transfer.downloadedBytes, transfer.totalSize, transfer.startedAt)}
                            </p>
                        </motion.div>
                    ))
                )}
            </div>
        </Section>
    );
}
