const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  // File operations
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  saveFile: (data) => ipcRenderer.invoke('save-file', data),
  
  // Menu event listeners
  onNewRoom: (callback) => ipcRenderer.on('menu-new-room', callback),
  onJoinRoom: (callback) => ipcRenderer.on('menu-join-room', callback),
  onSaveWhiteboard: (callback) => ipcRenderer.on('menu-save-whiteboard', callback),
  
  // Platform information
  platform: process.platform,
  
  // Remove listeners when they are no longer needed
  removeAllListeners: (channel) => {
    if (channel) {
      ipcRenderer.removeAllListeners(channel);
    }
  }
});