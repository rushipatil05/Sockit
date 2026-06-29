import { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import { fetchFiles, fetchPeers } from "../api";

const socket = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:5000", {
    autoConnect: true,
    auth: { role: "ui" }
});

export function useRealtimeState() {
    const [peers, setPeers] = useState([]);
    const [files, setFiles] = useState([]);

    useEffect(() => {
        let mounted = true;

        // Bootstrap from REST on first load
        Promise.all([fetchPeers(), fetchFiles()])
            .then(([nextPeers, nextFiles]) => {
                if (!mounted) return;
                setPeers(nextPeers);
                setFiles(nextFiles);
            })
            .catch(() => {});

        // Real-time updates from server
        socket.on("peer:state", (payload) => {
            setPeers(payload?.peers || []);
        });

        socket.on("files:updated", (payload) => {
            setFiles(payload?.files || []);
        });

        return () => {
            mounted = false;
            socket.off("peer:state");
            socket.off("files:updated");
        };
    }, []);

    return useMemo(() => ({ peers, files, setPeers, setFiles }), [peers, files]);
}
