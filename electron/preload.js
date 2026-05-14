const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("sockit", {
    pickFile: () => ipcRenderer.invoke("sockit:pick-file"),
    pickFolder: () => ipcRenderer.invoke("sockit:pick-folder"),
    pickSavePath: (defaultName) => ipcRenderer.invoke("sockit:pick-save-path", defaultName),
    notify: (payload) => ipcRenderer.invoke("sockit:notify", payload),
    openPath: (targetPath) => ipcRenderer.invoke("sockit:open-path", targetPath),
    quitApp: () => ipcRenderer.invoke("sockit:quit-app")
});
