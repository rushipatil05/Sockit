import { useCallback, useRef, useState } from "react";
import { motion } from "framer-motion";
import { shareFile } from "../api";
import { Panel } from "../components/Panel";

export function UploadPage({ onUploaded }) {
    const [message, setMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const dragRef = useRef(null);

    const doShare = useCallback(
        async (filePath) => {
            if (!filePath) {
                return;
            }
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
        dragRef.current?.classList.remove("ring-2", "ring-neon/50");
        const droppedPath = e.dataTransfer.files?.[0]?.path;
        doShare(droppedPath);
    }

    return (
        <Panel
            title="Share New File"
            subtitle="Files stay on your device. Only metadata is synced."
            action={
                <button
                    className="rounded-lg bg-neon/20 px-4 py-2 text-sm text-neon transition hover:bg-neon/30"
                    onClick={handleChooseFile}
                    disabled={isLoading}
                >
                    {isLoading ? "Sharing..." : "Pick File"}
                </button>
            }
        >
            <motion.div
                ref={dragRef}
                onDragOver={(e) => {
                    e.preventDefault();
                    dragRef.current?.classList.add("ring-2", "ring-neon/50");
                }}
                onDragLeave={() => dragRef.current?.classList.remove("ring-2", "ring-neon/50")}
                onDrop={onDrop}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-dashed border-white/20 bg-white/5 p-10 text-center"
            >
                <p className="font-heading text-xl text-white">Drag and drop a file here</p>
                <p className="mt-2 text-sm text-white/50">or use the file picker to publish it in your local index.</p>
            </motion.div>

            {message ? <p className="mt-4 text-sm text-neon2">{message}</p> : null}
        </Panel>
    );
}
