import { useMemo } from "react";
import { Shell } from "./components/Shell";
import { useRealtimeState } from "./hooks/useRealtimeState";
import { DashboardPage } from "./pages/DashboardPage";
import { LobbyPage } from "./pages/LobbyPage";
import { createRoom, joinRoom, leaveRoom } from "./api";

export default function App() {
    const state = useRealtimeState();

    const callbacks = useMemo(
        () => ({
            onUploaded: async () => {},
            onTransferQueued: async () => {}
        }),
        []
    );

    const handleCreateRoom = async () => {
        const room = await createRoom();
        state.setRoom(room);
    };

    const handleJoinRoom = async (code) => {
        const room = await joinRoom(code);
        state.setRoom(room);
    };

    const handleLeaveRoom = async () => {
        await leaveRoom();
        state.setRoom(null);
        state.setFiles(prev => prev.filter(f => f.isLocal));
        state.setTransfers([]);
    };

    return (
        <Shell>
            {!state.room ? (
                <LobbyPage 
                    peers={state.peers}
                    onCreateRoom={handleCreateRoom}
                    onJoinRoom={handleJoinRoom}
                />
            ) : (
                <DashboardPage
                    room={state.room}
                    files={state.files}
                    transfers={state.transfers}
                    onTransferQueued={callbacks.onTransferQueued}
                    onUploaded={callbacks.onUploaded}
                    onLeaveRoom={handleLeaveRoom}
                />
            )}
        </Shell>
    );
}
