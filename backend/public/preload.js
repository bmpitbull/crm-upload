const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Add any API methods you need to expose to the renderer
  getBackendStatus: () => ipcRenderer.invoke('get-backend-status'),
  
  // Add more API methods as needed
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  
  // Window controls
  minimize: () => ipcRenderer.invoke('window-minimize'),
  maximize: () => ipcRenderer.invoke('window-maximize'),
  close: () => ipcRenderer.invoke('window-close'),
}); 