import { useMemo } from "react";
import { Shell } from "./components/Shell";
import { createRoom, fetchFiles, fetchTransfers, joinRoom } from "./api";
import { useRealtimeState } from "./hooks/useRealtimeState";
import { DashboardPage } from "./pages/DashboardPage";

export default function App() {
    const state = useRealtimeState();

    async function applyRoomState(room) {
        state.setRoom(room);
        if (room?.active) {
            const [nextFiles, nextTransfers] = await Promise.all([fetchFiles(), fetchTransfers()]);
            state.setFiles(nextFiles);
            state.setTransfers(nextTransfers);
        } else {
            state.setFiles([]);
            state.setTransfers([]);
        }
    }

    async function handleCreateRoom(payload) {
        const room = await createRoom(payload);
        await applyRoomState(room);
        return room;
    }

    async function handleJoinRoom(payload) {
        const room = await joinRoom(payload);
        await applyRoomState(room);
        return room;
    }

    const callbacks = useMemo(
        () => ({
            createRoom: handleCreateRoom,
            joinRoom: handleJoinRoom,
            onUploaded: async () => {},
            onTransferQueued: async () => {}
        }),
        []
    );

    return (
        <Shell room={state.room}>
            <DashboardPage
                room={state.room}
                peers={state.peers}
                files={state.files}
                transfers={state.transfers}
                onTransferQueued={callbacks.onTransferQueued}
                onCreateRoom={callbacks.createRoom}
                onJoinRoom={callbacks.joinRoom}
                onUploaded={callbacks.onUploaded}
            />
        </Shell>
    );
}
