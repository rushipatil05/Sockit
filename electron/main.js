const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { app, BrowserWindow, dialog, ipcMain, Notification, shell } = require("electron");

function resolveWindowIcon() {
    if (!app.isPackaged) {
        return path.join(__dirname, "../client/src/assets/socket_logo.png");
    }
    const assetDir = path.join(__dirname, "../client/dist/assets");
    try {
        const matches = fs.readdirSync(assetDir).filter(
            (f) => f.startsWith("socket_logo") && f.endsWith(".png")
        );
        if (matches.length > 0) return path.join(assetDir, matches[0]);
    } catch {
        // fall through
    }
    return path.join(__dirname, "build/icon.png");
}

let serverProcess = null;

function startServer() {
    const serverDir = app.isPackaged
        ? path.join(process.resourcesPath, "app", "server")
        : path.join(__dirname, "..", "server");
    const serverPath = path.join(serverDir, "src", "index.js");

    const env = {
        ...process.env,
        ELECTRON_RUN_AS_NODE: "1",
        NODE_ENV: "production",
        MONGO_URI: process.env.MONGO_URI || "mongodb://127.0.0.1:27017/nodeshare",
        APP_NAME: process.env.APP_NAME || "NodeShare",
        UDP_PORT: process.env.UDP_PORT || "41234",
        UDP_BROADCAST_ADDR: process.env.UDP_BROADCAST_ADDR || "255.255.255.255",
        SERVER_PORT: process.env.SERVER_PORT || "4000",
        SOCKET_PORT: process.env.SOCKET_PORT || "5000",
        PEER_NAME: process.env.PEER_NAME || process.env.COMPUTERNAME || "NodeShare-PC",
        PEER_ID: process.env.PEER_ID || require("node:crypto").randomUUID(),
        DOWNLOAD_DIR: path.join(app.getPath("downloads"), "SocketShare"),
        SHARED_FILES_DIR: path.join(app.getPath("userData"), "uploads")
    };

    serverProcess = spawn(process.execPath, [serverPath], {
        env,
        cwd: serverDir,
        stdio: "inherit"
    });

    serverProcess.on("close", (code) => {
        console.log(`Server process exited with code ${code}`);
    });
}

function createWindow() {
    const window = new BrowserWindow({
        width: 1366,
        height: 860,
        minWidth: 1080,
        minHeight: 720,
        backgroundColor: "#060910",
        icon: resolveWindowIcon(),
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    const isDev = !app.isPackaged;
    const vitePort = process.env.VITE_PORT || 5173;
    const startUrl = isDev
        ? `http://localhost:${vitePort}`
        : `file://${path.join(__dirname, "../client/dist/index.html")}`;
    window.loadURL(startUrl);

    if (isDev) {
        window.webContents.openDevTools({ mode: "detach" });
    }
}

app.whenReady().then(() => {
    if (app.isPackaged) {
        startServer();
    }
    createWindow();

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on("window-all-closed", () => {
    if (serverProcess) {
        serverProcess.kill();
    }
    if (process.platform !== "darwin") {
        app.quit();
    }
});

app.on("before-quit", () => {
    if (serverProcess) {
        serverProcess.kill();
    }
});

ipcMain.handle("socket-share:pick-file", async () => {
    const result = await dialog.showOpenDialog({
        properties: ["openFile"]
    });
    if (result.canceled || result.filePaths.length === 0) {
        return null;
    }
    return result.filePaths[0];
});

ipcMain.handle("socket-share:pick-folder", async () => {
    const result = await dialog.showOpenDialog({
        properties: ["openDirectory"]
    });
    if (result.canceled || result.filePaths.length === 0) {
        return null;
    }
    return result.filePaths[0];
});

ipcMain.handle("socket-share:notify", async (_event, payload) => {
    if (Notification.isSupported()) {
        new Notification({
            title: payload?.title || "sockit",
            body: payload?.body || ""
        }).show();
    }
    return true;
});

ipcMain.handle("socket-share:open-path", async (_event, targetPath) => {
    if (!targetPath) {
        return false;
    }
    await shell.openPath(targetPath);
    return true;
});
