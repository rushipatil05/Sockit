import { Shell } from "./components/Shell";
import { useRealtimeState } from "./hooks/useRealtimeState";
import { MainPage } from "./pages/MainPage";

export default function App() {
    const { peers, files, transfers, socket } = useRealtimeState();
    return (
        <Shell>
            <MainPage peers={peers} files={files} transfers={transfers} socket={socket} />
        </Shell>
    );
}
