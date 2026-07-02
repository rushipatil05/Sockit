import { useEffect, useState } from "react";
import { Shell } from "./components/Shell";
import { SetupScreen } from "./components/SetupScreen";
import { useRealtimeState } from "./hooks/useRealtimeState";
import { MainPage } from "./pages/MainPage";

// Resolve a stored peer name from Electron IPC (preferred) or localStorage (fallback)
async function resolveStoredName() {
    if (window.sockit?.getPeerName) {
        return await window.sockit.getPeerName();    // null if not set yet
    }
    return localStorage.getItem("sockit_peer_name"); // null if not set yet
}

export default function App() {
    const [peerName, setPeerName] = useState(undefined); // undefined = still loading

    useEffect(() => {
        resolveStoredName().then(name => setPeerName(name || null));
    }, []);

    // Still checking storage — render nothing to avoid flash
    if (peerName === undefined) return null;

    // No name yet — show the setup screen
    if (!peerName) {
        return <SetupScreen onComplete={name => setPeerName(name)} />;
    }

    return <MainApp />;
}

function MainApp() {
    const { peers, files, transfers, socket } = useRealtimeState();
    return (
        <Shell>
            <MainPage peers={peers} files={files} transfers={transfers} socket={socket} />
        </Shell>
    );
}
