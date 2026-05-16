import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('hackos', {
  platform: process.platform,
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
  },
  closeApp: () => ipcRenderer.send('app:close-confirmed'),
  selectFolder: () => ipcRenderer.invoke('app:select-folder') as Promise<string | null>,
});
