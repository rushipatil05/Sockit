import { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import { fetchFiles, fetchPeers, fetchTransfers, fetchRoomStatus } from "../api";

export function useRealtimeState() {
    const [peers, setPeers] = useState([]);
    const [files, setFiles] = useState([]);
    const [transfers, setTransfers] = useState([]);
    const [room, setRoom] = useState(null);

    useEffect(() => {
        let mounted = true;

        async function bootstrap() {
            const [nextPeers, nextFiles, nextTransfers, nextRoom] = await Promise.all([
                fetchPeers(),
                fetchFiles(),
                fetchTransfers(),
                fetchRoomStatus()
            ]);

            if (!mounted) {
                return;
            }

            setPeers(nextPeers);
            setFiles(nextFiles);
            setTransfers(nextTransfers);
            setRoom(nextRoom);
        }

        bootstrap().catch(() => {
            // Initial load errors are reflected in UI fallback states.
        });

        const socket = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:5000", {
            autoConnect: true,
            auth: {
                role: "ui"
            }
        });

        socket.on("peer:state", (payload) => {
            setPeers(payload?.peers || []);
        });

        socket.on("index:upsert", () => {
            fetchFiles().then(setFiles).catch(() => { });
        });

        socket.on("index:remove", () => {
            fetchFiles().then(setFiles).catch(() => { });
        });

        socket.on("transfer:progress", (state) => {
            setTransfers((prev) => mergeTransfer(prev, state));
        });

        socket.on("transfer:complete", (state) => {
            setTransfers((prev) => mergeTransfer(prev, state));
            window.socketShare?.notify?.({
                title: "Download complete",
                body: `${state.fileName} saved successfully`
            });
        });

        socket.on("transfer:error", (state) => {
            setTransfers((prev) => mergeTransfer(prev, state));
            window.socketShare?.notify?.({
                title: "Transfer failed",
                body: state.error || state.fileName || "File transfer failed"
            });
        });

        return () => {
            mounted = false;
            socket.disconnect();
        };
    }, []);

    return useMemo(
        () => ({ peers, files, transfers, room, setPeers, setFiles, setTransfers, setRoom }),
        [peers, files, transfers, room]
    );
}

function mergeTransfer(previous, next) {
    const index = previous.findIndex((item) => item.transferId === next.transferId);
    if (index === -1) {
        return [next, ...previous];
    }
    const copy = [...previous];
    copy[index] = { ...copy[index], ...next };
    return copy;
}
