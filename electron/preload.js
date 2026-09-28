const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  minimize:    () => ipcRenderer.send('window:minimize'),
  maximize:    () => ipcRenderer.send('window:maximize'),
  close:       () => ipcRenderer.send('window:close'),
  fullscreen:  () => ipcRenderer.send('window:fullscreen'),

  openFolder:  ()                   => ipcRenderer.invoke('dialog:openFolder'),
  openFile:    ()                   => ipcRenderer.invoke('dialog:openFile'),

  readDirectory: (dirPath)          => ipcRenderer.invoke('fs:readDir', dirPath),
  readFile:      (filePath)         => ipcRenderer.invoke('fs:readFile', filePath),
  writeFile:     (filePath, content)=> ipcRenderer.invoke('fs:writeFile', filePath, content),
  createFile:    (dirPath)          => ipcRenderer.invoke('fs:createFile', dirPath),
  renameFile:    (oldPath, newName) => ipcRenderer.invoke('fs:renameFile', oldPath, newName),
  deleteFile:    (filePath)         => ipcRenderer.invoke('fs:deleteFile', filePath),
  openExternal:  (url)              => ipcRenderer.send('shell:openExternal', url),
})
