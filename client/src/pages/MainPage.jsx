import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { shareFile, getProxyDownloadUrl } from "../api";

function formatBytes(bytes) {
    if (!bytes && bytes !== 0) return "-";
    const units = ["B", "KB", "MB", "GB"];
    let v = bytes, i = 0;
    while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
    return `${v.toFixed(1)} ${units[i]}`;
}

function formatDate(ts) {
    if (!ts) return "";
    return new Date(ts).toLocaleString();
}

export function MainPage({ peers, files }) {
    const [shareMsg, setShareMsg] = useState("");
    const [isSharing, setIsSharing] = useState(false);

    // ── Share a file ────────────────────────────────────────────────────────
    const doShare = useCallback(async (filePath) => {
        if (!filePath) return;
        setIsSharing(true);
        try {
            const file = await shareFile(filePath);
            setShareMsg(`✓ Shared: ${file.name}`);
            setTimeout(() => setShareMsg(""), 3000);
        } catch (err) {
            setShareMsg(`✗ ${err?.response?.data?.error || err.message}`);
            setTimeout(() => setShareMsg(""), 4000);
        } finally {
            setIsSharing(false);
        }
    }, []);

    async function handlePickFile() {
        if (!window.sockit?.pickFile) {
            setShareMsg("Run inside the desktop app to pick files.");
            return;
        }
        const filePath = await window.sockit.pickFile();
        await doShare(filePath);
    }

    // ── Download: route through local proxy server ──────────────────────────
    // The proxy endpoint (localhost:4000/api/proxy-download) fetches the file
    // from the remote peer's server and streams it back to us.
    // This avoids Electron blocking navigation to external IP addresses.
    async function handleDownload(file) {
        const proxyUrl = getProxyDownloadUrl(file);

        if (window.sockit?.pickSavePath) {
            // Electron: use native save dialog, then fetch bytes and write to disk
            const savePath = await window.sockit.pickSavePath(file.name);
            if (!savePath) return; // user cancelled

            try {
                const res = await fetch(proxyUrl);
                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    setShareMsg(`✗ Download failed: ${err.error || res.statusText}`);
                    return;
                }
                const buf = await res.arrayBuffer();
                // Write via Electron's IPC (preload exposes writeFile)
                // Fallback: use blob URL if writeFile not available
                if (window.sockit?.writeFile) {
                    await window.sockit.writeFile(savePath, buf);
                } else {
                    // Save via anchor (works in Electron when pointing to localhost)
                    const blob = new Blob([buf]);
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = file.name;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }
                setShareMsg(`✓ Saved: ${file.name}`);
                setTimeout(() => setShareMsg(""), 3000);
            } catch (err) {
                setShareMsg(`✗ Download failed: ${err.message}`);
                setTimeout(() => setShareMsg(""), 4000);
            }
        } else {
            // Browser: anchor click to proxy URL (same-origin localhost, always works)
            const a = document.createElement("a");
            a.href = proxyUrl;
            a.download = file.name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    }

    return (
        <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

            {/* Top bar: title + share button */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary tracking-tight">Sockit</h1>
                    <p className="text-sm text-text-secondary mt-0.5">LAN file sharing — no internet needed</p>
                </div>
                <div className="flex items-center gap-3">
                    {shareMsg && (
                        <motion.span
                            initial={{ opacity: 0, x: 8 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="text-xs font-medium text-accent"
                        >
                            {shareMsg}
                        </motion.span>
                    )}
                    <button
                        onClick={handlePickFile}
                        disabled={isSharing}
                        className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-base hover:opacity-90 disabled:opacity-50 transition-opacity"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        {isSharing ? "Sharing…" : "Share File"}
                    </button>
                </div>
            </div>

            {/* Drop zone hint */}
            <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                    e.preventDefault();
                    const p = e.dataTransfer.files?.[0]?.path;
                    if (p) doShare(p);
                }}
                className="rounded-2xl border-2 border-dashed border-white/10 bg-white/[0.01] py-5 text-center text-xs text-text-secondary/60 hover:border-accent/40 hover:text-text-secondary transition-all"
            >
                Drag &amp; drop any file here to share it on the LAN
            </div>

            {/* Main layout: File Registry + Peers Online */}
            <div className="grid grid-cols-[1fr,260px] gap-5 items-start">

                {/* ── File Registry ─────────────────────────────────────────── */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className="rounded-2xl border border-white/10 bg-surface overflow-hidden shadow-xl"
                >
                    {/* Header */}
                    <div className="flex items-center gap-2.5 px-5 py-4 border-b border-white/10 bg-white/[0.02]">
                        <svg className="h-4 w-4 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
                        </svg>
                        <h2 className="text-sm font-bold text-text-primary">File Registry</h2>
                        <span className="ml-auto rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-text-secondary">
                            {files.length} {files.length === 1 ? "file" : "files"}
                        </span>
                    </div>

                    {/* File list */}
                    <div className="divide-y divide-white/[0.05] min-h-[200px]">
                        {files.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                                <div className="h-14 w-14 mb-4 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center">
                                    <svg className="h-7 w-7 text-text-secondary/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                                    </svg>
                                </div>
                                <p className="text-sm font-semibold text-text-primary">No files yet</p>
                                <p className="text-xs text-text-secondary mt-1">Share a file or wait for peers to appear</p>
                            </div>
                        ) : (
                            files.map((file, i) => (
                                <motion.div
                                    key={file.fileId}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: i * 0.03 }}
                                    className="flex items-center justify-between px-5 py-3.5 hover:bg-white/[0.02] transition-colors group"
                                >
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-text-primary truncate">{file.name}</p>
                                        <p className="text-xs text-text-secondary mt-0.5">
                                            {formatBytes(file.size)}
                                            {file.sharedAt && <> &bull; {formatDate(file.sharedAt)}</>}
                                            {" "}&bull; <span className="text-text-secondary/70">{file.ownerName}</span>
                                        </p>
                                    </div>

                                    {file.isLocal ? (
                                        <span className="ml-4 shrink-0 text-[10px] font-bold tracking-wider text-accent uppercase">
                                            Local
                                        </span>
                                    ) : (
                                        <button
                                            onClick={() => handleDownload(file)}
                                            className="ml-4 shrink-0 flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary/50 hover:text-accent hover:bg-accent/10 transition-all"
                                            title={`Download from ${file.ownerName}`}
                                        >
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12M12 16.5V3" />
                                            </svg>
                                        </button>
                                    )}
                                </motion.div>
                            ))
                        )}
                    </div>
                </motion.div>

                {/* ── Peers Online ──────────────────────────────────────────── */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="rounded-2xl border border-white/10 bg-surface overflow-hidden shadow-xl"
                >
                    <div className="flex items-center gap-2.5 px-5 py-4 border-b border-white/10 bg-white/[0.02]">
                        <svg className="h-4 w-4 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                        </svg>
                        <h2 className="text-sm font-bold text-text-primary">Peers Online</h2>
                        <span className="ml-auto flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            {peers.length}
                        </span>
                    </div>

                    <div className="divide-y divide-white/[0.05] min-h-[80px]">
                        {peers.length === 0 ? (
                            <p className="py-10 text-center text-xs text-text-secondary/50">
                                Searching network…
                            </p>
                        ) : (
                            peers.map((peer) => (
                                <div
                                    key={peer.peerId}
                                    className="flex items-center gap-3 px-5 py-3.5"
                                >
                                    <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-emerald-400 truncate">
                                            {peer.peerName || peer.host}
                                        </p>
                                        <p className="text-xs text-text-secondary/60 font-mono">{peer.host}</p>
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
