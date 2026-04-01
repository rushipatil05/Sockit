import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), "../.env") });
dotenv.config();

export const config = {
    appName: process.env.APP_NAME || "Socket Share",
    mongoUri: process.env.MONGO_URI || "mongodb://127.0.0.1:27017/socket-share",
    nodeEnv: process.env.NODE_ENV || "development",
    udpPort: Number(process.env.UDP_PORT || 41234),
    udpBroadcastAddr: process.env.UDP_BROADCAST_ADDR || "255.255.255.255",
    serverPort: Number(process.env.SERVER_PORT || 4000),
    socketPort: Number(process.env.SOCKET_PORT || 5000),
    downloadDir: process.env.DOWNLOAD_DIR || "downloads",
    sharedFilesDir: process.env.SHARED_FILES_DIR || "uploads",
    peerName: process.env.PEER_NAME || process.env.COMPUTERNAME || "Unknown Device"
};
