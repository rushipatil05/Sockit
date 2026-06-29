import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { shareFile } from "../api";

function formatBytes(bytes) {
    if (!bytes) return "—";
    const u = ["B", "KB", "MB", "GB"];
    let v = bytes, i = 0;
    while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
    return `${v.toFixed(1)} ${u[i]}`;
}

function formatDate(ts) {
    if (!ts) return "";
    return new Date(ts).toLocaleString();
}

export function MainPage({ peers, files, transfers, socket }) {
    const [msg, setMsg]         = useState("");
    const [isSharing, setShare] = useState(false);

    // ── Share ──────────────────────────────────────────────────────────────
    const doShare = useCallback(async (filePath) => {
        if (!filePath) return;
        setShare(true);
        try {
            const f = await shareFile(filePath);
            setMsg(`✓ Shared: ${f.name}`);
        } catch (e) {
            setMsg(`✗ ${e?.response?.data?.error || e.message}`);
        } finally {
            setShare(false);
            setTimeout(() => setMsg(""), 3000);
        }
    }, []);

    async function pickAndShare() {
        if (window.sockit?.pickFile) {
            const p = await window.sockit.pickFile();
            if (p) doShare(p);
        } else {
            setMsg("Run in Electron to pick files.");
            setTimeout(() => setMsg(""), 3000);
        }
    }

    // ── Download ───────────────────────────────────────────────────────────
    function requestDownload(file) {
        socket.emit("transfer:request", { fileId: file.fileId });
    }

    function transferState(fileId) {
        return transfers[fileId] || null;
    }

    return (
        <div className="space-y-5">

            {/* ── Action bar ── */}
            <div className="flex items-center justify-between gap-4">
                <div
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => {
                        e.preventDefault();
                        const p = e.dataTransfer.files?.[0]?.path;
                        if (p) doShare(p);
                    }}
                    className="flex-1 rounded-xl border border-dashed border-white/10 py-3 px-4 text-xs text-text-secondary/50 hover:border-accent/30 hover:text-text-secondary/80 transition-all cursor-default"
                >
                    Drag &amp; drop any file here to share on the LAN
                </div>

                <div className="flex items-center gap-3 shrink-0">
                    <AnimatePresence>
                        {msg && (
                            <motion.span
                                key="msg"
                                initial={{ opacity: 0, x: 6 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0 }}
                                className="text-xs font-medium text-accent"
                            >
                                {msg}
                            </motion.span>
                        )}
                    </AnimatePresence>
                    <button
                        onClick={pickAndShare}
                        disabled={isSharing}
                        className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-base hover:opacity-90 disabled:opacity-50 transition-opacity"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        {isSharing ? "Sharing…" : "Share File"}
                    </button>
                </div>
            </div>

            {/* ── Two-column layout ── */}
            <div className="grid grid-cols-[1fr,260px] gap-5 items-start">

                {/* ── File Registry ── */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl border border-white/10 bg-surface overflow-hidden shadow-xl"
                >
                    <div className="flex items-center gap-2.5 px-5 py-4 border-b border-white/10 bg-white/[0.02]">
                        <svg className="h-4 w-4 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                        </svg>
                        <span className="text-sm font-bold text-text-primary">File Registry</span>
                        <span className="ml-auto rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-text-secondary">
                            {files.length} {files.length === 1 ? "file" : "files"}
                        </span>
                    </div>

                    <div className="divide-y divide-white/[0.05] min-h-[220px]">
                        {files.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <div className="h-14 w-14 mb-4 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center">
                                    <svg className="h-7 w-7 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                                    </svg>
                                </div>
                                <p className="text-sm font-semibold text-text-primary/50">No files shared yet</p>
                                <p className="text-xs text-text-secondary/40 mt-1">Share a file or wait for peers</p>
                            </div>
                        ) : (
                            files.map((file, i) => {
                                const t = transferState(file.fileId);
                                const busy = t?.status === "downloading";
                                return (
                                    <motion.div
                                        key={file.fileId}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: i * 0.03 }}
                                        className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.02] transition-colors"
                                    >
                                        {/* File icon */}
                                        <FileIcon mimeType={file.mimeType} />

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-text-primary truncate">{file.name}</p>
                                            <p className="text-xs text-text-secondary/70 mt-0.5">
                                                {formatBytes(file.size)}
                                                {file.sharedAt ? <> &bull; {formatDate(file.sharedAt)}</> : null}
                                                {" "}&bull; <span className="text-text-secondary">{file.ownerName}</span>
                                            </p>
                                        </div>

                                        {/* Action */}
                                        <div className="shrink-0">
                                            {file.isLocal ? (
                                                <span className="text-[10px] font-bold tracking-widest text-accent uppercase">Local</span>
                                            ) : t?.status === "done" ? (
                                                <span className="text-xs font-medium text-emerald-400">✓ Saved</span>
                                            ) : t?.status === "error" ? (
                                                <span className="text-xs font-medium text-red-400" title={t.error}>✗ Failed</span>
                                            ) : (
                                                <button
                                                    onClick={() => requestDownload(file)}
                                                    disabled={busy}
                                                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-text-secondary hover:bg-accent hover:border-accent hover:text-black transition-all disabled:opacity-40"
                                                    title="Download"
                                                >
                                                    {busy ? (
                                                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                                                        </svg>
                                                    ) : (
                                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12M12 16.5V3" />
                                                        </svg>
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            })
                        )}
                    </div>
                </motion.div>

                {/* ── Peers Online ── */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.08 }}
                    className="rounded-2xl border border-white/10 bg-surface overflow-hidden shadow-xl"
                >
                    <div className="flex items-center gap-2.5 px-5 py-4 border-b border-white/10 bg-white/[0.02]">
                        <svg className="h-4 w-4 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                        </svg>
                        <span className="text-sm font-bold text-text-primary">Peers Online</span>
                        <span className="ml-auto flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            {peers.length}
                        </span>
                    </div>

                    <div className="divide-y divide-white/[0.05]">
                        {peers.length === 0 ? (
                            <p className="py-12 text-center text-xs text-text-secondary/40">
                                Searching network…
                            </p>
                        ) : (
                            peers.map(peer => (
                                <div key={peer.peerId} className="flex items-center gap-3 px-5 py-3.5">
                                    <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-emerald-400 truncate">
                                            {peer.peerName || peer.host}
                                        </p>
                                        <p className="text-xs text-text-secondary/50 font-mono">{peer.host}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </motion.div>

            </div>
        </div>
    );
}

// ── File type icon ────────────────────────────────────────────────────────────
function FileIcon({ mimeType }) {
    const t = (mimeType || "").toLowerCase();
    let bg = "bg-white/10", color = "text-text-secondary";
    let path = "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z";

    if (t.includes("pdf") || t.includes("word") || t.includes("text") || t.includes("document")) {
        bg = "bg-blue-500/15"; color = "text-blue-400";
    } else if (t.includes("image") || t.includes("png") || t.includes("jpg") || t.includes("jpeg") || t.includes("gif") || t.includes("webp")) {
        bg = "bg-purple-500/15"; color = "text-purple-400";
        path = "M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21zM8.25 8.625a1.125 1.125 0 100-2.25 1.125 1.125 0 000 2.25z";
    } else if (t.includes("video") || t.includes("mp4") || t.includes("mov")) {
        bg = "bg-emerald-500/15"; color = "text-emerald-400";
        path = "M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z";
    } else if (t.includes("zip") || t.includes("rar") || t.includes("tar")) {
        bg = "bg-amber-500/15"; color = "text-amber-400";
        path = "M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z";
    }

    return (
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${bg} ${color}`}>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={path} />
            </svg>
        </div>
    );
}
