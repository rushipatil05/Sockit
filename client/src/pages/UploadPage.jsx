import { useCallback, useRef, useState } from "react";
import { motion } from "framer-motion";
import { shareFile } from "../api";
import { Section } from "../components/Panel";

export function UploadPage({ onUploaded }) {
    const [message, setMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    const doShare = useCallback(
        async (filePath) => {
            if (!filePath) return;
            setIsLoading(true);
            try {
                const file = await shareFile(filePath);
                setMessage(`Shared: ${file.name}`);
                onUploaded?.();
            } catch (error) {
                setMessage(error?.response?.data?.error || error.message || "Failed to share file");
            } finally {
                setIsLoading(false);
            }
        },
        [onUploaded]
    );

    async function handleChooseFile() {
        if (!window.socketShare?.pickFile) {
            setMessage("Electron file picker unavailable. Run inside desktop app.");
            return;
        }
        const filePath = await window.socketShare.pickFile();
        await doShare(filePath);
    }

    function onDrop(e) {
        e.preventDefault();
        setIsDragging(false);
        const droppedPath = e.dataTransfer.files?.[0]?.path;
        doShare(droppedPath);
    }

    return (
        <Section
            title="Share New File"
            subtitle="Files stay on your device - only metadata is synced"
            action={
                <button
                    className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-base hover:opacity-90 disabled:opacity-40"
                    onClick={handleChooseFile}
                    disabled={isLoading}
                >
                    {isLoading ? "Sharing..." : "Pick File"}
                </button>
            }
        >
            <motion.div
                onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className={`relative overflow-hidden rounded-2xl py-16 text-center transition-all duration-300 ${isDragging
                        ? "border border-accent bg-surface"
                        : "border border-white/10 bg-surface"
                    }`}
            >
                <div className="absolute inset-0 rounded-2xl border border-dashed border-white/15" />

                {/* Upload icon */}
                <div className="relative z-10">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/[0.08]">
                        <svg className="h-7 w-7 text-accent/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                        </svg>
                    </div>
                    <p className="font-heading text-lg font-medium text-text-primary">
                        Drag and drop a file here
                    </p>
                    <p className="mt-1.5 text-sm text-text-secondary">
                        or use the file picker to publish it in your local index
                    </p>
                </div>
            </motion.div>

            {message && (
                <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 flex items-center gap-2 rounded-xl border border-white/10 bg-surface px-4 py-3"
                >
                    <span className="text-xs text-accent">-&gt;</span>
                    <p className="text-sm text-text-secondary">{message}</p>
                </motion.div>
            )}
        </Section>
    );
}



