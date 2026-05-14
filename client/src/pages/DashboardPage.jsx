import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { startDownload, shareFile } from "../api";
import { Section } from "../components/Panel";

function formatBytes(bytes) {
    if (!bytes && bytes !== 0) return "-";
    const units = ["B", "KB", "MB", "GB"];
    let value = bytes;
    let index = 0;
    while (value >= 1024 && index < units.length - 1) {
        value /= 1024;
        index += 1;
    }
    return `${value.toFixed(1)} ${units[index]}`;
}

export function DashboardPage({ room, files, transfers, onTransferQueued, onUploaded, onLeaveRoom }) {
    const [busyId, setBusyId] = useState(null);
    const [uploadMessage, setUploadMessage] = useState("");
    const [isUploading, setIsUploading] = useState(false);

    async function handleDownload(file) {
        try {
            let savePath;
            if (window.sockit?.pickSavePath) {
                savePath = await window.sockit.pickSavePath(file.name);
                if (!savePath) return; // User canceled
            }
            
            setBusyId(file.fileId);
            await startDownload({ peerId: file.ownerPeerId, fileId: file.fileId, savePath });
            onTransferQueued?.();
        } finally {
            setBusyId((currentId) => (currentId === file.fileId ? null : currentId));
        }
    }

    const doShare = useCallback(
        async (filePath) => {
            if (!filePath) return;
            setIsUploading(true);
            try {
                const file = await shareFile(filePath);
                setUploadMessage(`Shared: ${file.name}`);
                onUploaded?.();
                setTimeout(() => setUploadMessage(""), 3000);
            } catch (error) {
                setUploadMessage(error?.response?.data?.error || error.message || "Failed to share file");
            } finally {
                setIsUploading(false);
            }
        },
        [onUploaded]
    );

    async function handlePickFile() {
        if (!window.sockit?.pickFile) {
            setUploadMessage("Electron API unavailable. Run inside desktop app.");
            return;
        }
        const filePath = await window.sockit.pickFile();
        await doShare(filePath);
    }

    const activeTransfers = (transfers || []).filter(t => t.status !== "completed" && t.status !== "failed");

    return (
        <div className="space-y-6">
            {/* Header Actions */}
            <Section delay={0.05}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-text-primary tracking-tight">Network Workspace</h2>
                        <p className="text-sm text-text-secondary mt-1">Discover and share files with peers securely.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(room?.code);
                                setUploadMessage("Room code copied!");
                                setTimeout(() => setUploadMessage(""), 2000);
                            }}
                            className="flex items-center gap-2 rounded-xl border border-accent/20 bg-accent/[0.05] hover:bg-accent/10 px-4 py-2 text-sm font-semibold text-accent transition-colors"
                            title="Copy Room Code"
                        >
                            <div className="h-2 w-2 rounded-full bg-success animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                            Room: {room?.code} ({room?.isHost ? "Host" : "Peer"})
                        </button>
                        <button
                            onClick={onLeaveRoom}
                            className="rounded-xl border border-danger/20 bg-danger/[0.05] hover:bg-danger/10 px-4 py-2 text-sm font-medium text-danger transition-colors"
                        >
                            Leave Room
                        </button>
                    </div>
                </div>
            </Section>

            {/* Grid: 1fr (Files) + 320px (Sidebar) */}
            <div className="grid gap-6 lg:grid-cols-[1fr,320px] items-start pb-10">
                
                {/* Main Content: Files */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="rounded-2xl border border-white/10 bg-surface overflow-hidden flex flex-col shadow-2xl min-h-[500px]"
                >
                    <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10 bg-white/[0.02]">
                        <div className="p-2 rounded-lg bg-white/5">
                            <svg className="h-4 w-4 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                            </svg>
                        </div>
                        <h3 className="text-base font-bold text-text-primary">Shared Files</h3>
                        <span className="ml-auto rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-semibold text-text-secondary">{files.length} items</span>
                    </div>

                    <div className="divide-y divide-white/[0.06] flex-1 overflow-y-auto">
                        {files.length === 0 ? (
                            <div className="px-5 py-24 text-center flex flex-col items-center">
                                <div className="h-20 w-20 mb-5 rounded-3xl bg-white/[0.03] border border-white/5 flex items-center justify-center">
                                    <svg className="h-10 w-10 text-text-secondary/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
                                    </svg>
                                </div>
                                <p className="text-base text-text-primary font-semibold">No files shared yet</p>
                                <p className="text-sm text-text-secondary mt-1.5 max-w-[240px]">Drag and drop a file into the sidebar to start sharing with the room.</p>
                            </div>
                        ) : (
                            files.map((file, i) => (
                                <motion.div
                                    key={file.fileId}
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: Math.min(i * 0.03, 0.3) }}
                                    className="flex items-center justify-between px-6 py-4 hover:bg-white/[0.02] transition-colors group"
                                >
                                    <div className="flex items-center gap-4 min-w-0">
                                        <FileIcon mimeType={file.mimeType} />
                                        <div className="min-w-0">
                                            <p className="text-[15px] font-semibold text-text-primary truncate">{file.name}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs text-text-secondary font-medium">{formatBytes(file.size)}</span>
                                                <span className="text-[10px] text-white/20">•</span>
                                                <span className="text-xs text-text-secondary truncate">{file.ownerName}</span>
                                            </div>
                                        </div>
                                    </div>
                                    {file.isLocal ? (
                                        <span className="ml-4 shrink-0 rounded bg-accent/10 px-2.5 py-1 text-[11px] font-bold tracking-wider text-accent uppercase">Local</span>
                                    ) : (
                                        <button
                                            className="ml-4 shrink-0 flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04] border border-white/5 text-text-secondary hover:bg-accent hover:border-accent hover:text-white transition-all disabled:opacity-30 disabled:hover:bg-white/[0.04] disabled:hover:text-text-secondary disabled:hover:border-white/5"
                                            onClick={() => handleDownload(file)}
                                            disabled={busyId === file.fileId}
                                            title="Download File"
                                        >
                                            {busyId === file.fileId ? (
                                                <svg className="h-5 w-5 animate-spin text-accent" viewBox="0 0 24 24" fill="none">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                                                </svg>
                                            ) : (
                                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12M12 16.5V3" />
                                                </svg>
                                            )}
                                        </button>
                                    )}
                                </motion.div>
                            ))
                        )}
                    </div>
                </motion.div>

                {/* Sidebar */}
                <div className="space-y-6 flex flex-col">
                    {/* Permanent Dropzone */}
                    <motion.div
                        initial={{ opacity: 0, x: 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.15 }}
                        className="rounded-2xl border border-white/10 bg-surface shadow-xl"
                    >
                        <div className="p-5">
                            <h3 className="text-sm font-bold text-text-primary mb-4 tracking-wide uppercase">Share a File</h3>
                            <div
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    const droppedPath = e.dataTransfer.files?.[0]?.path;
                                    doShare(droppedPath);
                                }}
                                className="rounded-xl border-2 border-dashed border-white/10 bg-white/[0.01] py-10 text-center transition-all hover:border-accent hover:bg-accent/[0.02]"
                            >
                                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent/[0.08] text-accent group-hover:scale-110 transition-transform">
                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                    </svg>
                                </div>
                                <p className="text-sm text-text-primary font-bold">Drag & Drop</p>
                                <p className="mt-1 text-xs text-text-secondary/70">any file to upload</p>
                            </div>
                            
                            <button
                                className="mt-4 w-full rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 px-4 py-3 text-sm font-semibold text-text-primary transition-all disabled:opacity-40"
                                onClick={handlePickFile}
                                disabled={isUploading}
                            >
                                {isUploading ? "Uploading..." : "Browse Files"}
                            </button>

                            {uploadMessage && (
                                <div className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-accent/10 px-3 py-2">
                                    <p className="text-xs font-medium text-accent">{uploadMessage}</p>
                                </div>
                            )}
                        </div>
                    </motion.div>

                    {/* Active Transfers Widget */}
                    {activeTransfers.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="rounded-2xl border border-white/10 bg-surface shadow-xl overflow-hidden"
                        >
                            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-white/[0.02]">
                                <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">Transfers</h3>
                                <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-bold text-accent">
                                    {activeTransfers.length} Active
                                </span>
                            </div>
                            <div className="divide-y divide-white/[0.04]">
                                {activeTransfers.map((transfer) => (
                                    <div key={transfer.transferId} className="px-5 py-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-xs font-semibold text-text-primary truncate pr-3">{transfer.fileName}</p>
                                            <span className="text-[11px] font-bold text-accent font-mono">{transfer.progress || 0}%</span>
                                        </div>
                                        <div className="relative h-1.5 overflow-hidden rounded-full bg-white/10">
                                            <motion.div
                                                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-accent to-emerald-400"
                                                initial={{ width: 0 }}
                                                animate={{ width: `${transfer.progress || 0}%` }}
                                                transition={{ duration: 0.3 }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </div>
            </div>
        </div>
    );
}

function FileIcon({ mimeType }) {
    const type = (mimeType || "").toLowerCase();
    let bg, color, icon;

    if (type.includes("pdf") || type.includes("document") || type.includes("word") || type.includes("text")) {
        bg = "bg-blue-500/15"; color = "text-blue-400";
        icon = <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>;
    } else if (type.includes("video") || type.includes("mp4") || type.includes("mov")) {
        bg = "bg-emerald-500/15"; color = "text-emerald-400";
        icon = <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" /></svg>;
    } else if (type.includes("image") || type.includes("png") || type.includes("jpg") || type.includes("jpeg") || type.includes("gif") || type.includes("webp")) {
        bg = "bg-purple-500/15"; color = "text-purple-400";
        icon = <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21zM8.25 8.625a1.125 1.125 0 100-2.25 1.125 1.125 0 000 2.25z" /></svg>;
    } else if (type.includes("zip") || type.includes("rar") || type.includes("tar") || type.includes("archive")) {
        bg = "bg-amber-500/15"; color = "text-amber-400";
        icon = <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>;
    } else {
        bg = "bg-white/10"; color = "text-text-secondary";
        icon = <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>;
    }

    return (
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${bg} ${color}`}>
            {icon}
        </div>
    );
}
