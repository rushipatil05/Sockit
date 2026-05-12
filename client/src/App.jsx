import { useMemo } from "react";
import { Shell } from "./components/Shell";
import { useRealtimeState } from "./hooks/useRealtimeState";
import { DashboardPage } from "./pages/DashboardPage";

export default function App() {
    const state = useRealtimeState();

    const callbacks = useMemo(
        () => ({
            onUploaded: async () => {},
            onTransferQueued: async () => {}
        }),
        []
    );

    return (
        <Shell>
            <DashboardPage
                peers={state.peers}
                files={state.files}
                transfers={state.transfers}
                onTransferQueued={callbacks.onTransferQueued}
                onUploaded={callbacks.onUploaded}
            />
        </Shell>
    );
}
