const { contextBridge, ipcRenderer } = require('electron');
const { IPC_CHANNELS } = require('../shared/constants');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'electron',
  {
    ipcRenderer: {
      send: (channel, data) => {
        // Whitelist channels
        const validChannels = Object.values(IPC_CHANNELS);
        if (validChannels.includes(channel)) {
          ipcRenderer.send(channel, data);
        }
      },
      invoke: (channel, data) => {
        const validChannels = Object.values(IPC_CHANNELS);
        if (validChannels.includes(channel)) {
          return ipcRenderer.invoke(channel, data);
        }
        return Promise.reject(new Error('Invalid channel'));
      },
      on: (channel, func) => {
        const validChannels = Object.values(IPC_CHANNELS);
        if (validChannels.includes(channel)) {
          // Strip event as it includes `sender` 
          ipcRenderer.on(channel, (event, ...args) => func(...args));
        }
      },
      removeListener: (channel, func) => {
        const validChannels = Object.values(IPC_CHANNELS);
        if (validChannels.includes(channel)) {
          ipcRenderer.removeListener(channel, func);
        }
      }
    }
  }
);