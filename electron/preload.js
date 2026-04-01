const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("socketShare", {
    pickFile: () => ipcRenderer.invoke("socket-share:pick-file"),
    pickFolder: () => ipcRenderer.invoke("socket-share:pick-folder"),
    notify: (payload) => ipcRenderer.invoke("socket-share:notify", payload),
    openPath: (targetPath) => ipcRenderer.invoke("socket-share:open-path", targetPath)
});
