import { useMemo } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Shell } from "./components/Shell";
import { useRealtimeState } from "./hooks/useRealtimeState";
import { DashboardPage } from "./pages/DashboardPage";
import { UploadPage } from "./pages/UploadPage";
import { TransfersPage } from "./pages/TransfersPage";

export default function App() {
    const state = useRealtimeState();

    const callbacks = useMemo(
        () => ({
            onUploaded: async () => {
                // The backend pushes update events, so no explicit refresh is required.
            },
            onTransferQueued: async () => {
                // Transfers are streamed via socket events.
            }
        }),
        []
    );

    return (
        <Shell>
            <Routes>
                <Route
                    path="/"
                    element={<DashboardPage peers={state.peers} files={state.files} onTransferQueued={callbacks.onTransferQueued} />}
                />
                <Route path="/upload" element={<UploadPage onUploaded={callbacks.onUploaded} />} />
                <Route path="/transfers" element={<TransfersPage transfers={state.transfers} />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Shell>
    );
}
