const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const path = require('path')
const fs = require('fs')

const isDev = process.argv.includes('--dev')

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    backgroundColor: '#0f0f10',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ── Shell ────────────────────────────────────────────

ipcMain.on('shell:openExternal', (event, url) => {
  shell.openExternal(url)
})

// ── Window controls ──────────────────────────────────

ipcMain.on('window:minimize', () => mainWindow.minimize())
ipcMain.on('window:maximize', () => {
  if (mainWindow.isMaximized()) mainWindow.unmaximize()
  else mainWindow.maximize()
})
ipcMain.on('window:close', () => mainWindow.close())
ipcMain.on('window:fullscreen', () => {
  mainWindow.setFullScreen(!mainWindow.isFullScreen())
})

// ── Dialogs ──────────────────────────────────────────

ipcMain.handle('dialog:openFolder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
  })
  if (result.canceled) return null
  return result.filePaths[0]
})

ipcMain.handle('dialog:openFile', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'Supported Files', extensions: ['md', 'markdown', 'txt', 'html', 'htm'] }],
  })
  if (result.canceled) return null
  return result.filePaths[0]
})

// ── File system ──────────────────────────────────────

ipcMain.handle('fs:readDir', (event, dirPath) => {
  function readDirRecursive(dir) {
    let entries
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      return []
    }
    const result = []
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        const children = readDirRecursive(fullPath)
        if (children.length > 0) {
          result.push({ name: entry.name, path: fullPath, type: 'directory', children })
        }
      } else if (/\.(md|markdown|txt|html|htm)$/i.test(entry.name)) {
        result.push({ name: entry.name, path: fullPath, type: 'file' })
      }
    }
    return result.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1
      return a.name.localeCompare(b.name)
    })
  }
  return readDirRecursive(dirPath)
})

ipcMain.handle('fs:readFile', (event, filePath) => {
  try {
    return fs.readFileSync(filePath, 'utf-8')
  } catch {
    return null
  }
})

ipcMain.handle('fs:writeFile', (event, filePath, content) => {
  try {
    fs.writeFileSync(filePath, content, 'utf-8')
    return true
  } catch {
    return false
  }
})

ipcMain.handle('fs:createFile', async (event, dirPath) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: dirPath ? path.join(dirPath, 'untitled.md') : 'untitled.md',
    filters: [
      { name: 'Markdown', extensions: ['md', 'markdown'] },
      { name: 'HTML', extensions: ['html', 'htm'] },
      { name: 'Text', extensions: ['txt'] },
    ],
  })
  if (result.canceled) return null
  try {
    fs.writeFileSync(result.filePath, '', 'utf-8')
    return result.filePath
  } catch {
    return null
  }
})

ipcMain.handle('fs:renameFile', (event, oldPath, newName) => {
  const dir = path.dirname(oldPath)
  const ext = path.extname(oldPath)
  const newPath = path.join(dir, newName.endsWith(ext) ? newName : newName + ext)
  try {
    fs.renameSync(oldPath, newPath)
    return newPath
  } catch {
    return null
  }
})

ipcMain.handle('fs:deleteFile', async (event, filePath) => {
  try {
    await shell.trashItem(filePath)
    return true
  } catch {
    return false
  }
})
