const path = require("node:path");
const { app, BrowserWindow, dialog, ipcMain, Notification, shell } = require("electron");

function createWindow() {
    const window = new BrowserWindow({
        width: 1366,
        height: 860,
        minWidth: 1080,
        minHeight: 720,
        backgroundColor: "#060910",
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    const isDev = !app.isPackaged;
    const startUrl = isDev ? "http://localhost:5173" : `file://${path.join(__dirname, "../client/dist/index.html")}`;
    window.loadURL(startUrl);

    if (isDev) {
        window.webContents.openDevTools({ mode: "detach" });
    }
}

app.whenReady().then(() => {
    createWindow();

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
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
            title: payload?.title || "Socket Share",
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
