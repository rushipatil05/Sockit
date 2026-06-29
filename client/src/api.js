import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "http://localhost:4000/api"
});

export async function fetchPeers() {
    const { data } = await api.get("/peers");
    return data.peers;
}

export async function fetchFiles() {
    const { data } = await api.get("/files");
    return data.files;
}

export async function shareFile(filePath) {
    const { data } = await api.post("/files/share", { path: filePath });
    return data.file;
}

// Download URL — call directly on the owning peer's server
export function getDownloadUrl(file) {
    const host = file.ownerHost || "localhost";
    const port = file.ownerServerPort || 4000;
    return `http://${host}:${port}/api/files/${file.fileId}/download`;
}
