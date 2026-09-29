// Platform detection (baked in at Vite build time via VITE_PLATFORM env var)
export const isAndroid = import.meta.env.VITE_PLATFORM === 'android'
export const isElectron = !isAndroid

// ── Helpers ─────────────────────────────────────────────────────────────────

function b64ToUtf8(b64) {
  const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

// Prefix used to identify files stored in Capacitor's Documents directory
const DOCS_PREFIX = '@docs/'

function toDocsName(path) {
  return path.startsWith(DOCS_PREFIX) ? path.slice(DOCS_PREFIX.length) : path
}

// Lazily-imported Capacitor modules (only evaluated in Android builds)
async function fs() {
  // @vite-ignore comments tell Rollup not to try resolving these at build time —
  // they're only ever called in Android builds where the packages are installed.
  const mod = await import(/* @vite-ignore */ '@capacitor/filesystem')
  return { Filesystem: mod.Filesystem, Directory: mod.Directory, Encoding: mod.Encoding }
}

async function picker() {
  const { FilePicker } = await import(/* @vite-ignore */ '@capawesome/capacitor-file-picker')
  return FilePicker
}

// ── File operations ──────────────────────────────────────────────────────────

/**
 * Opens a file picker.
 * Electron: native dialog → returns absolute path
 * Android: SAF picker → copies file to Documents → returns "@docs/filename"
 */
export async function openFile() {
  if (isElectron) return window.electronAPI.openFile()

  const FilePicker = await picker()
  const result = await FilePicker.pickFiles({
    types: ['text/markdown', 'text/plain', 'text/html'],
    multiple: false,
    readData: true,
  })
  if (!result.files[0]) return null

  const file = result.files[0]
  const content = b64ToUtf8(file.data)
  const { Filesystem, Directory, Encoding } = await fs()

  await Filesystem.writeFile({
    path: file.name,
    data: content,
    directory: Directory.Documents,
    encoding: Encoding.UTF8,
    recursive: true,
  })
  return DOCS_PREFIX + file.name
}

/**
 * Opens a folder picker (desktop only).
 * Android returns null — use openFile() + listAndroidFiles() instead.
 */
export async function openFolder() {
  if (isElectron) return window.electronAPI.openFolder()
  return null
}

export async function readFile(path) {
  if (isElectron) return window.electronAPI.readFile(path)

  const { Filesystem, Directory, Encoding } = await fs()
  try {
    const { data } = await Filesystem.readFile({
      path: toDocsName(path),
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
    })
    return data
  } catch {
    return null
  }
}

export async function writeFile(path, content) {
  if (isElectron) return window.electronAPI.writeFile(path, content)

  const { Filesystem, Directory, Encoding } = await fs()
  try {
    await Filesystem.writeFile({
      path: toDocsName(path),
      data: content,
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
    })
    return true
  } catch {
    return false
  }
}

export async function readDirectory(path) {
  if (isElectron) return window.electronAPI.readDirectory(path)
  return []
}

/**
 * Lists all files in the app's Documents directory (Android only).
 * Returns objects shaped like the desktop file tree nodes.
 */
export async function listAndroidFiles() {
  if (isElectron) return []

  const { Filesystem, Directory } = await fs()
  try {
    const { files } = await Filesystem.readdir({
      path: '',
      directory: Directory.Documents,
    })
    const SUPPORTED = /\.(md|markdown|txt|html|htm)$/i
    return files
      .filter(f => f.type === 'file' && SUPPORTED.test(f.name))
      .map(f => ({ name: f.name, path: DOCS_PREFIX + f.name, type: 'file' }))
  } catch {
    return []
  }
}

export async function createFile(dir, content = '') {
  if (isElectron) return window.electronAPI.createFile(dir, content)

  const rawName = prompt('New file name (e.g. notes.md):')
  if (!rawName) return null
  const name = /\.(md|markdown|txt|html|htm)$/i.test(rawName) ? rawName : `${rawName}.md`

  const { Filesystem, Directory, Encoding } = await fs()
  try {
    await Filesystem.writeFile({
      path: name,
      data: '',
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
    })
    return DOCS_PREFIX + name
  } catch {
    return null
  }
}

export async function renameFile(path, newName) {
  if (isElectron) return window.electronAPI.renameFile(path, newName)

  const { Filesystem, Directory } = await fs()
  try {
    await Filesystem.rename({
      from: toDocsName(path),
      to: newName,
      directory: Directory.Documents,
      toDirectory: Directory.Documents,
    })
    return DOCS_PREFIX + newName
  } catch {
    return null
  }
}

export async function deleteFile(path) {
  if (isElectron) return window.electronAPI.deleteFile(path)

  const { Filesystem, Directory } = await fs()
  try {
    await Filesystem.deleteFile({
      path: toDocsName(path),
      directory: Directory.Documents,
    })
    return true
  } catch {
    return false
  }
}

export function openExternal(url) {
  if (isElectron) return window.electronAPI.openExternal(url)
  window.open(url, '_blank', 'noopener')
}

// ── Window controls (Electron only) ─────────────────────────────────────────

export const windowControls = {
  minimize:   () => isElectron && window.electronAPI.minimize(),
  maximize:   () => isElectron && window.electronAPI.maximize(),
  close:      () => isElectron && window.electronAPI.close(),
  fullscreen: () => isElectron && window.electronAPI.fullscreen(),
}
