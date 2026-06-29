import { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import { fetchPeers, fetchFiles } from "../api";

// One persistent socket — connects to OUR local server
const socket = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:5000", {
    auth: { role: "ui" }
});

export function useRealtimeState() {
    const [peers, setPeers] = useState([]);
    const [files, setFiles] = useState([]);
    const [transfers, setTransfers] = useState({}); // fileId → { status, fileName, error }

    useEffect(() => {
        let alive = true;

        // Bootstrap
        Promise.all([fetchPeers(), fetchFiles()])
            .then(([p, f]) => { if (alive) { setPeers(p); setFiles(f); } })
            .catch(() => {});

        socket.on("peer:state",    ({ peers })  => setPeers(peers ?? []));
        socket.on("files:updated", ({ files })  => setFiles(files ?? []));

        socket.on("transfer:progress", ({ fileId, fileName }) => {
            setTransfers(prev => ({ ...prev, [fileId]: { status: "downloading", fileName } }));
        });
        socket.on("transfer:done", ({ fileId, fileName }) => {
            setTransfers(prev => ({ ...prev, [fileId]: { status: "done", fileName } }));
            // Clear the badge after 4 seconds
            setTimeout(() => setTransfers(prev => {
                const next = { ...prev }; delete next[fileId]; return next;
            }), 4000);
        });
        socket.on("transfer:error", ({ fileId, error }) => {
            setTransfers(prev => ({ ...prev, [fileId]: { status: "error", error } }));
            setTimeout(() => setTransfers(prev => {
                const next = { ...prev }; delete next[fileId]; return next;
            }), 5000);
        });

        return () => {
            alive = false;
            ["peer:state","files:updated","transfer:progress","transfer:done","transfer:error"]
                .forEach(e => socket.off(e));
        };
    }, []);

    return useMemo(
        () => ({ peers, files, transfers, socket }),
        [peers, files, transfers]
    );
}
