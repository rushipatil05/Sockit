import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "http://localhost:4000/api"
});

export async function fetchPeers()   { return (await api.get("/peers")).data.peers; }
export async function fetchFiles()   { return (await api.get("/all-files")).data.files; }
export async function shareFile(filePath) {
    return (await api.post("/files/share", { path: filePath })).data.file;
}
