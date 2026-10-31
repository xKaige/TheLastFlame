// Puente seguro entre el juego y Electron: guardado en archivos y Steam, sin exponer Node al juego
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('nativeStore', {
  read: key => ipcRenderer.sendSync('store:read', key),
  write: (key, value) => ipcRenderer.sendSync('store:write', key, value),
  remove: key => ipcRenderer.sendSync('store:remove', key),
  dir: ipcRenderer.sendSync('store:dir'),
});

// modo de pantalla: ventana, completa o sinBordes (ver main.js)
contextBridge.exposeInMainWorld('nativeDisplay', {
  mode: () => ipcRenderer.sendSync('display:mode'),
  set: (mode, state) => ipcRenderer.sendSync('display:set', mode, state),
  takeResume: () => ipcRenderer.sendSync('display:resume'),
});

if (ipcRenderer.sendSync('steam:ok')) {
  contextBridge.exposeInMainWorld('steam', {
    achievement: id => ipcRenderer.send('steam:achievement', id),
    score: (board, score) => ipcRenderer.send('steam:score', board, score),
  });
}
