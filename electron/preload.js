const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("socketShare", {
    pickFile: () => ipcRenderer.invoke("socket-share:pick-file"),
    pickFolder: () => ipcRenderer.invoke("socket-share:pick-folder"),
    pickSavePath: (defaultName) => ipcRenderer.invoke("socket-share:pick-save-path", defaultName),
    notify: (payload) => ipcRenderer.invoke("socket-share:notify", payload),
    openPath: (targetPath) => ipcRenderer.invoke("socket-share:open-path", targetPath),
    quitApp: () => ipcRenderer.invoke("socket-share:quit-app")
});
