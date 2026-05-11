import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { startDownload, shareFile } from "../api";
import { Section } from "../components/Panel";
import { Modal } from "../components/Modal";

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

export function DashboardPage({ room, peers, files, transfers, onTransferQueued, onCreateRoom, onJoinRoom, onUploaded }) {
    const [busyId, setBusyId] = useState(null);
    const [roomId, setRoomId] = useState("");
    const [roomKey, setRoomKey] = useState("");
    const [roomMessage, setRoomMessage] = useState("");
    const [createdRoomInfo, setCreatedRoomInfo] = useState(null);
    const [modalMode, setModalMode] = useState(null); // "create" | "join" | "upload" | null
    const [uploadMessage, setUploadMessage] = useState("");
    const [isUploading, setIsUploading] = useState(false);

    async function handleDownload(file) {
        try {
            setBusyId(file.fileId);
            await startDownload({ peerId: file.ownerPeerId, fileId: file.fileId });
            onTransferQueued?.();
        } finally {
            setBusyId(null);
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
            } catch (error) {
                setUploadMessage(error?.response?.data?.error || error.message || "Failed to share file");
            } finally {
                setIsUploading(false);
            }
        },
        [onUploaded]
    );

    async function handlePickFile() {
        if (!window.socketShare?.pickFile) {
            setUploadMessage("Electron file picker unavailable. Run inside desktop app.");
            return;
        }
        const filePath = await window.socketShare.pickFile();
        await doShare(filePath);
    }

    function openCreate() { setRoomMessage(""); setModalMode("create"); }
    function openJoin() { setRoomMessage(""); setModalMode("join"); }
    function openUpload() { setUploadMessage(""); setModalMode("upload"); }
    function closeModal() { setModalMode(null); }

    // Active transfers count
    const activeTransfers = (transfers || []).filter(t => t.status !== "completed" && t.status !== "failed");

    return (
        <div className="space-y-10">
            {/* Room Status & Actions */}
            <Section delay={0.05}>
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`h-2.5 w-2.5 rounded-full ${room?.active ? "bg-success" : "bg-yellow-500/70"}`} />
                        <div>
                            {room?.active ? (
                                <>
                                    <p className="text-sm font-medium text-text-primary">
                                        Connected to <span className="text-accent">{room.roomId}</span>
                                    </p>
                                    <p className="text-xs text-text-secondary">{room.isHost ? "Host" : "Member"}</p>
                                </>
                            ) : (
                                <>
                                    <p className="text-sm font-medium text-text-primary">No active room</p>
                                    <p className="text-xs text-text-secondary">Create or join a room to start sharing</p>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={openCreate}
                            className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-base hover:opacity-90"
                        >
                            Create Room
                        </button>
                        <button
                            onClick={openJoin}
                            className="rounded-xl border border-white/10 bg-surface px-5 py-2.5 text-sm font-medium text-text-primary hover:bg-surface-light"
                        >
                            Join Room
                        </button>
                    </div>
                </div>

                <AnimatePresence>
                    {createdRoomInfo?.roomId && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-5 overflow-hidden"
                        >
                            <div className="rounded-2xl bg-accent/[0.06] px-5 py-4">
                                <p className="text-sm text-text-secondary mb-3">Share these with teammates:</p>
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="rounded-lg border border-white/10 bg-base px-3 py-1.5 font-mono text-xs text-text-primary">
                                        Room: {createdRoomInfo.roomId}
                                    </span>
                                    <CopyBtn text={createdRoomInfo.roomId} label="Copy ID" />
                                    <span className="rounded-lg border border-white/10 bg-base px-3 py-1.5 font-mono text-xs text-text-primary">
                                        Key: {createdRoomInfo.roomKey || "(hidden)"}
                                    </span>
                                    {createdRoomInfo.roomKey && (
                                        <CopyBtn text={createdRoomInfo.roomKey} label="Copy Key" />
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </Section>

            {/* Info banner when no room */}
            {!room?.active && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-3 rounded-2xl border border-white/10 bg-surface px-5 py-4"
                >
                    <p className="text-sm text-text-secondary leading-relaxed">
                        Peer discovery runs in background, but file metadata and transfers are locked until you connect to a room.
                    </p>
                </motion.div>
            )}

            {/* Grid: Files + Peers */}
            <div className="grid gap-5 lg:grid-cols-[1.6fr,1fr] items-start">
                {/* File Registry */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="rounded-2xl border border-white/10 bg-surface overflow-hidden"
                >
                    <div className="flex items-center gap-2.5 px-5 py-4 border-b border-white/10">
                        <svg className="h-[18px] w-[18px] text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                        </svg>
                        <h3 className="text-sm font-semibold text-text-primary">File Registry</h3>
                    </div>

                    <div className="divide-y divide-white/10">
                        {!room?.active ? (
                            <div className="px-5 py-8">
                                <EmptyState text="Join a room to access the file registry" />
                            </div>
                        ) : files.length === 0 ? (
                            <div className="px-5 py-8">
                                <EmptyState text="No shared files available yet" />
                            </div>
                        ) : (
                            files.map((file, i) => (
                                <motion.div
                                    key={file.fileId}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="flex items-center justify-between px-5 py-3.5 hover:bg-surface-light group"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <FileIcon mimeType={file.mimeType} />
                                        <div className="min-w-0">
                                            <p className="text-sm text-text-primary truncate">
                                                {file.name}
                                                <span className="ml-2 text-text-secondary">|</span>
                                                <span className="ml-2 text-xs text-text-secondary">{formatBytes(file.size)}</span>
                                            </p>
                                            <p className="text-[11px] text-text-secondary mt-0.5">{file.ownerName}</p>
                                        </div>
                                    </div>
                                    {file.isLocal ? (
                                        <span className="ml-3 shrink-0 text-[11px] text-text-secondary">Local</span>
                                    ) : (
                                        <button
                                            className="ml-3 shrink-0 flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary hover:bg-base hover:text-accent disabled:opacity-30"
                                            onClick={() => handleDownload(file)}
                                            disabled={busyId === file.fileId}
                                            title="Download"
                                        >
                                            {busyId === file.fileId ? (
                                                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                                                </svg>
                                            ) : (
                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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

                {/* Peers Online */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="rounded-2xl border border-white/10 bg-surface overflow-hidden"
                >
                    <div className="flex items-center gap-2.5 px-5 py-4 border-b border-white/10">
                        <svg className="h-[18px] w-[18px] text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                        </svg>
                        <h3 className="text-sm font-semibold text-text-primary">Peers Online</h3>
                    </div>
                    <div className="px-5 py-4">
                        {!room?.active ? (
                            <EmptyState text="Join a room to view peers" />
                        ) : peers.length === 0 ? (
                            <p className="text-xs text-text-secondary py-4 text-center">No peers online yet</p>
                        ) : (
                            <div className="space-y-3">
                                {peers.map((peer, i) => (
                                    <motion.div
                                        key={peer.peerId}
                                        initial={{ opacity: 0, x: -8 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.06 }}
                                        className="flex items-center gap-2.5"
                                    >
                                        <div className={`h-2 w-2 rounded-full ${peer.status === "online" || !peer.status
                                                ? "bg-emerald-400"
                                                : "bg-white/20"
                                            }`} />
                                        <span className="text-sm text-text-primary">{peer.peerName || peer.host || "Unknown"}</span>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>

            {/* Active Transfers (inline, only shown when there are transfers) */}
            {transfers && transfers.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="rounded-2xl border border-white/10 bg-surface overflow-hidden"
                >
                    <div className="flex items-center gap-2.5 px-5 py-4 border-b border-white/10">
                        <svg className="h-[18px] w-[18px] text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                        </svg>
                        <h3 className="text-sm font-semibold text-text-primary">Transfers</h3>
                        {activeTransfers.length > 0 && (
                            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-medium text-accent">
                                {activeTransfers.length} active
                            </span>
                        )}
                    </div>
                    <div className="divide-y divide-white/[0.04]">
                        {transfers.map((transfer, i) => (
                            <div key={transfer.transferId} className="px-5 py-3.5">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-sm text-text-primary truncate">{transfer.fileName}</p>
                                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${transfer.status === "completed"
                                            ? "bg-success/10 text-success"
                                            : transfer.status === "failed"
                                                ? "bg-danger/10 text-danger"
                                                : "bg-base text-text-secondary"
                                        }`}>
                                        {transfer.status}
                                    </span>
                                </div>
                                <div className="relative h-1.5 overflow-hidden rounded-full bg-base">
                                    <motion.div
                                        className="absolute inset-y-0 left-0 rounded-full bg-secondary"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${transfer.progress || 0}%` }}
                                        transition={{ duration: 0.4, ease: "easeOut" }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/*  + Upload FAB (bottom left)  */}
            <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                onClick={openUpload}
                className="fixed bottom-8 left-8 z-40 flex items-center gap-2 rounded-xl border border-white/10 bg-surface px-5 py-3 text-sm font-medium text-text-primary hover:bg-surface-light"
            >
                <svg className="h-4 w-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Upload
            </motion.button>

            {/*  Create Room Modal  */}
            <Modal
                open={modalMode === "create"}
                onClose={closeModal}
                title="Create a New Room"
                subtitle="You'll be the host - share the Room ID & Key with teammates"
            >
                <div className="space-y-3">
                    <input
                        className="w-full rounded-xl border border-white/10 bg-base px-4 py-3 text-sm text-text-primary placeholder-text-secondary outline-none"
                        placeholder="Optional Room ID"
                        value={roomId}
                        onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                    />
                    <input
                        className="w-full rounded-xl border border-white/10 bg-base px-4 py-3 text-sm text-text-primary placeholder-text-secondary outline-none"
                        placeholder="Optional Room Key (auto-generated if empty)"
                        value={roomKey}
                        onChange={(e) => setRoomKey(e.target.value)}
                    />
                    <button
                        className="w-full rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-base hover:opacity-90"
                        onClick={async () => {
                            try {
                                const payload = { roomId: roomId || undefined, roomKey: roomKey || undefined };
                                const result = await onCreateRoom?.(payload);
                                if (result?.roomId) {
                                    setCreatedRoomInfo({ roomId: result.roomId, roomKey: result.roomKey || roomKey });
                                    setRoomId(result.roomId);
                                }
                                setRoomMessage("Room created - you are the Host.");
                                closeModal();
                            } catch (error) {
                                setRoomMessage(error?.response?.data?.error || error.message || "Failed to create room");
                            }
                        }}
                    >
                        Create Room as Host
                    </button>
                    {roomMessage && modalMode === "create" && (
                        <p className="text-xs text-text-secondary pt-1">{roomMessage}</p>
                    )}
                </div>
            </Modal>

            {/*  Join Room Modal  */}
            <Modal
                open={modalMode === "join"}
                onClose={closeModal}
                title="Join Existing Room"
                subtitle="Enter the Room ID and Key shared by the host"
            >
                <div className="space-y-3">
                    <input
                        className="w-full rounded-xl border border-white/10 bg-base px-4 py-3 text-sm text-text-primary placeholder-text-secondary outline-none"
                        placeholder="Room ID"
                        value={roomId}
                        onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                    />
                    <input
                        className="w-full rounded-xl border border-white/10 bg-base px-4 py-3 text-sm text-text-primary placeholder-text-secondary outline-none"
                        placeholder="Room Key"
                        value={roomKey}
                        onChange={(e) => setRoomKey(e.target.value)}
                    />
                    <button
                        className="w-full rounded-xl border border-white/10 bg-surface px-4 py-3 text-sm font-medium text-text-primary hover:bg-surface-light"
                        onClick={async () => {
                            try {
                                if (!roomId || !roomKey) {
                                    setRoomMessage("Room ID and Key are required to join.");
                                    return;
                                }
                                await onJoinRoom?.({ roomId, roomKey });
                                setCreatedRoomInfo(null);
                                setRoomMessage("Joined room - you are now a Member.");
                                closeModal();
                            } catch (error) {
                                setRoomMessage(error?.response?.data?.error || error.message || "Failed to join room");
                            }
                        }}
                    >
                        Join as Member
                    </button>
                    {roomMessage && modalMode === "join" && (
                        <p className="text-xs text-text-secondary pt-1">{roomMessage}</p>
                    )}
                </div>
            </Modal>

            {/*  Upload Modal  */}
            <Modal
                open={modalMode === "upload"}
                onClose={closeModal}
                title="Share a File"
                subtitle="Files stay on your device - only metadata is synced"
            >
                <div className="space-y-4">
                    <div
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                            e.preventDefault();
                            const droppedPath = e.dataTransfer.files?.[0]?.path;
                            doShare(droppedPath);
                        }}
                        className="rounded-2xl border border-dashed border-white/15 bg-base py-10 text-center hover:border-accent"
                    >
                        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/[0.08]">
                            <svg className="h-5 w-5 text-accent/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                            </svg>
                        </div>
                        <p className="text-sm text-text-primary">Drag and drop a file here</p>
                        <p className="mt-1 text-xs text-text-secondary">or use the button below</p>
                    </div>

                    <button
                        className="w-full rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-base hover:opacity-90 disabled:opacity-40"
                        onClick={handlePickFile}
                        disabled={isUploading}
                    >
                        {isUploading ? "Sharing..." : "Pick File"}
                    </button>

                    {uploadMessage && (
                        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-base px-4 py-3">
                            <span className="text-xs text-accent">-&gt;</span>
                            <p className="text-sm text-text-secondary">{uploadMessage}</p>
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
}

/*  Empty state  */
function EmptyState({ text }) {
    return (
        <div className="flex items-center gap-2 py-6">
            <div className="h-px flex-1 bg-white/10" />
            <p className="text-xs text-text-secondary">{text}</p>
            <div className="h-px flex-1 bg-white/10" />
        </div>
    );
}

/*  Copy button  */
function CopyBtn({ text, label }) {
    async function copy() {
        if (!text) return;
        await navigator.clipboard?.writeText(text);
    }
    return (
        <button
            className="rounded-lg border border-white/10 bg-base px-3 py-1.5 text-xs text-accent hover:bg-surface"
            onClick={copy}
        >
            {label}
        </button>
    );
}

/*  File type icon (color-coded)  */
function FileIcon({ mimeType }) {
    const type = (mimeType || "").toLowerCase();
    let bg, color, icon;

    if (type.includes("pdf") || type.includes("document") || type.includes("word") || type.includes("text")) {
        bg = "bg-blue-500/15"; color = "text-blue-400";
        icon = <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>;
    } else if (type.includes("video") || type.includes("mp4") || type.includes("mov")) {
        bg = "bg-emerald-500/15"; color = "text-emerald-400";
        icon = <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" /></svg>;
    } else if (type.includes("image") || type.includes("png") || type.includes("jpg") || type.includes("jpeg") || type.includes("gif") || type.includes("webp")) {
        bg = "bg-purple-500/15"; color = "text-purple-400";
        icon = <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21zM8.25 8.625a1.125 1.125 0 100-2.25 1.125 1.125 0 000 2.25z" /></svg>;
    } else if (type.includes("zip") || type.includes("rar") || type.includes("tar") || type.includes("archive")) {
        bg = "bg-amber-500/15"; color = "text-amber-400";
        icon = <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>;
    } else {
        bg = "bg-base"; color = "text-text-secondary";
        icon = <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>;
    }

    return (
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${bg} ${color}`}>
            {icon}
        </div>
    );
}



