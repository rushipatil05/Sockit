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

export async function fetchTransfers() {
    const { data } = await api.get("/transfers");
    return data.transfers;
}

export async function startDownload(payload) {
    const { data } = await api.post("/transfers/download", payload);
    return data.transfer;
}
