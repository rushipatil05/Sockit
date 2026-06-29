import { Shell } from "./components/Shell";
import { useRealtimeState } from "./hooks/useRealtimeState";
import { MainPage } from "./pages/MainPage";

export default function App() {
    const { peers, files } = useRealtimeState();
    return (
        <Shell>
            <MainPage peers={peers} files={files} />
        </Shell>
    );
}
