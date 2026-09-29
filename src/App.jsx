import { useState, useEffect, useCallback, useRef } from 'react'
import TitleBar from './components/TitleBar.jsx'
import Sidebar from './components/Sidebar.jsx'
import TabBar from './components/TabBar.jsx'
import Editor from './components/Editor.jsx'
import Preview from './components/Preview.jsx'
import {
  isAndroid, isElectron,
  openFile as platformOpenFile,
  openFolder as platformOpenFolder,
  readFile as platformReadFile,
  writeFile as platformWriteFile,
  readDirectory as platformReadDirectory,
  listAndroidFiles,
  createFile as platformCreateFile,
  renameFile as platformRenameFile,
  deleteFile as platformDeleteFile,
  windowControls,
} from './platform.js'

export default function App() {
  const [folder, setFolder] = useState(null)
  const [fileTree, setFileTree] = useState([])
  const [tabs, setTabs] = useState([])
  const [activeTabId, setActiveTabId] = useState(null)
  const [mode, setMode] = useState('split')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark')

  const activeTab = tabs.find(t => t.id === activeTabId) ?? null

  const loadFolder = useCallback(async (folderPath) => {
    if (isAndroid) {
      const tree = await listAndroidFiles()
      setFolder('@android')
      setFileTree(tree)
    } else {
      const tree = await platformReadDirectory(folderPath)
      setFolder(folderPath)
      setFileTree(tree)
    }
  }, [])

  // On Android, populate the sidebar from the app's Documents directory on mount
  useEffect(() => {
    if (isAndroid) loadFolder('@android')
  }, [loadFolder])

  const openFolder = async () => {
    if (isAndroid) {
      // On Android "Open Folder" imports a file from SAF into Documents
      const p = await platformOpenFile()
      if (p) {
        await loadFolder('@android')
        await selectFile(p)
      }
    } else {
      const p = await platformOpenFolder()
      if (p) loadFolder(p)
    }
  }

  const openFile = async () => {
    if (isAndroid) {
      const p = await platformOpenFile()
      if (p) {
        await loadFolder('@android')
        await selectFile(p)
      }
    } else {
      const p = await platformOpenFile()
      if (p) selectFile(p)
    }
  }

  const selectFile = async (filePath) => {
    const existing = tabs.find(t => t.id === filePath)
    if (existing) {
      setActiveTabId(filePath)
      return
    }
    const text = await platformReadFile(filePath)
    if (text !== null) {
      setTabs(prev => [...prev, { id: filePath, filePath, content: text, savedContent: text }])
      setActiveTabId(filePath)
    }
  }

  // Keep a ref so the open-file IPC listener (registered once) always
  // calls the up-to-date selectFile without needing to re-register.
  const selectFileRef = useRef(selectFile)
  useEffect(() => { selectFileRef.current = selectFile })

  // Open a file passed via command-line (default app / double-click on .md)
  useEffect(() => {
    if (!isElectron) return
    window.electronAPI.onOpenFile((filePath) => {
      const dir = filePath.replace(/\\/g, '/').split('/').slice(0, -1).join('/')
      loadFolder(dir)
      selectFileRef.current(filePath)
    })
  }, [loadFolder])

  const updateActiveContent = useCallback((newContent) => {
    setTabs(prev => prev.map(t =>
      t.id === activeTabId ? { ...t, content: newContent } : t
    ))
  }, [activeTabId])

  const saveFile = useCallback(async () => {
    if (!activeTab) return

    if (activeTab.filePath === null) {
      // Unsaved new file — show Save dialog, write content to chosen path
      const p = await platformCreateFile(folder || '', activeTab.content)
      if (!p) return
      setTabs(prev => prev.map(t =>
        t.id === activeTabId
          ? { ...t, id: p, filePath: p, savedContent: t.content, isNew: false }
          : t
      ))
      setActiveTabId(p)
      if (folder) await loadFolder(folder)
    } else {
      const ok = await platformWriteFile(activeTab.filePath, activeTab.content)
      if (ok) {
        setTabs(prev => prev.map(t =>
          t.id === activeTabId ? { ...t, savedContent: t.content } : t
        ))
      }
    }
  }, [activeTab, activeTabId, folder, loadFolder])

  const closeTab = useCallback((tabId) => {
    setTabs(prev => {
      const idx = prev.findIndex(t => t.id === tabId)
      const next = prev.filter(t => t.id !== tabId)
      if (activeTabId === tabId) {
        const newActive = next[idx] ?? next[idx - 1] ?? null
        setActiveTabId(newActive ? newActive.id : null)
      }
      return next
    })
  }, [activeTabId])

  // Opens a blank tab — content stays in memory until the user saves
  const newFile = () => {
    const id = `unsaved-${Date.now()}`
    setTabs(prev => [...prev, { id, filePath: null, content: '', savedContent: null, isNew: true }])
    setActiveTabId(id)
  }

  // Called from sidebar "New File" button — shows Save dialog immediately
  const createFile = async () => {
    const p = await platformCreateFile(folder || '')
    if (p) {
      await loadFolder(folder || '@android')
      await selectFile(p)
    }
  }

  const deleteFile = async (filePath) => {
    const ok = await platformDeleteFile(filePath)
    if (ok) {
      closeTab(filePath)
      await loadFolder(folder || '@android')
    }
  }

  const renameFile = async (filePath, newName) => {
    const newPath = await platformRenameFile(filePath, newName)
    if (newPath) {
      setTabs(prev => prev.map(t =>
        t.id === filePath ? { ...t, id: newPath, filePath: newPath } : t
      ))
      if (activeTabId === filePath) setActiveTabId(newPath)
      await loadFolder(folder || '@android')
    }
  }

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  useEffect(() => {
    const handle = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        saveFile()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
        e.preventDefault()
        if (activeTabId) closeTab(activeTabId)
      }
      if (isElectron && e.key === 'F11') {
        e.preventDefault()
        windowControls.fullscreen()
      }
    }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [saveFile, closeTab, activeTabId])

  const fileName = activeTab
    ? activeTab.filePath
      ? activeTab.filePath.replace(/\\/g, '/').split('/').pop()
      : 'Untitled'
    : null

  const fileExt = fileName ? fileName.split('.').pop().toLowerCase() : ''
  const fileType = ['html', 'htm'].includes(fileExt) ? 'html' : 'markdown'
  const isDirty = activeTab
    ? activeTab.filePath === null || activeTab.content !== activeTab.savedContent
    : false

  // On Android the empty state shows "Open File" only (no folder concept)
  const showEmptyFolderOpen = !activeTab && !folder

  return (
    <div className="app">
      {isElectron && <TitleBar fileName={fileName} isDirty={isDirty} theme={theme} />}
      <div className="app-body">
        {sidebarOpen && (
          <Sidebar
            folder={folder}
            fileTree={fileTree}
            currentFile={activeTab?.filePath ?? null}
            onSelectFile={selectFile}
            onOpenFolder={openFolder}
            onCreateFile={createFile}
            onRefresh={() => loadFolder(folder || '@android')}
            onDeleteFile={deleteFile}
            onRenameFile={renameFile}
          />
        )}
        <div className="main-content">
          <div className="toolbar">
            <button
              className="icon-btn toolbar-icon"
              onClick={() => setSidebarOpen(v => !v)}
              title="Toggle Sidebar (Ctrl+\\)"
            >
              <svg width="15" height="12" viewBox="0 0 15 12" fill="currentColor">
                <rect y="0" width="15" height="1.5" rx="0.75"/>
                <rect y="5.25" width="15" height="1.5" rx="0.75"/>
                <rect y="10.5" width="15" height="1.5" rx="0.75"/>
              </svg>
            </button>
            <div className="mode-toggle">
              <button className={`mode-btn ${mode === 'edit' ? 'active' : ''}`} onClick={() => setMode('edit')}>Edit</button>
              <button className={`mode-btn ${mode === 'split' ? 'active' : ''}`} onClick={() => setMode('split')}>Split</button>
              <button className={`mode-btn ${mode === 'preview' ? 'active' : ''}`} onClick={() => setMode('preview')}>Preview</button>
            </div>
            <div className="toolbar-spacer" />
            <button className="toolbar-btn" onClick={newFile} title="New File">New</button>
            {showEmptyFolderOpen && (
              <button className="toolbar-btn" onClick={openFile}>Open File</button>
            )}
            {activeTab && (
              <button
                className={`toolbar-btn save-btn ${isDirty ? 'dirty' : ''}`}
                onClick={saveFile}
                title="Save (Ctrl+S)"
              >
                {isDirty ? '● Save' : 'Saved'}
              </button>
            )}
            <button className="icon-btn" onClick={toggleTheme} title="Toggle theme">
              {theme === 'dark' ? (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="3" stroke="currentColor" strokeWidth="1.4"/>
                  <line x1="7" y1="0.5" x2="7" y2="2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                  <line x1="7" y1="12" x2="7" y2="13.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                  <line x1="0.5" y1="7" x2="2" y2="7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                  <line x1="12" y1="7" x2="13.5" y2="7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                  <line x1="2.4" y1="2.4" x2="3.4" y2="3.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                  <line x1="10.6" y1="10.6" x2="11.6" y2="11.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                  <line x1="11.6" y1="2.4" x2="10.6" y2="3.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                  <line x1="3.4" y1="10.6" x2="2.4" y2="11.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
              ) : (
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <path d="M12 7.5A5.5 5.5 0 015.5 1a5.5 5.5 0 100 11A5.5 5.5 0 0012 7.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
            {isElectron && (
              <button className="icon-btn" onClick={() => windowControls.fullscreen()} title="Fullscreen (F11)">
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <path d="M1 4.5V1h3.5M8.5 1H12v3.5M12 8.5V12H8.5M4.5 12H1V8.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )}
          </div>

          <TabBar
            tabs={tabs}
            activeTabId={activeTabId}
            onSelect={setActiveTabId}
            onClose={closeTab}
            onOpen={openFile}
          />

          {!activeTab ? (
            <div className="empty-state">
              <div className="empty-inner">
                <div className="empty-logo">
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                    <rect width="48" height="48" rx="12" fill="rgba(124,106,255,0.12)"/>
                    <path d="M12 14h24M12 20h16M12 26h20M12 32h12" stroke="#7c6aff" strokeWidth="2.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <h2>MD Reader</h2>
                <p>Open a folder to browse your notes, or open a single file.</p>
                <div className="empty-actions">
                  <button className="btn-primary" onClick={newFile}>New File</button>
                  {!isAndroid && <button className="btn-secondary" onClick={openFolder}>Open Folder</button>}
                  <button className="btn-secondary" onClick={openFile}>Open File</button>
                </div>
              </div>
            </div>
          ) : (
            <div className={`content-area mode-${mode}`}>
              {(mode === 'edit' || mode === 'split') && (
                <div className="editor-pane">
                  <Editor
                    key={activeTab.id}
                    value={activeTab.content}
                    onChange={updateActiveContent}
                    theme={theme}
                    fileType={fileType}
                  />
                </div>
              )}
              {mode === 'split' && <div className="pane-divider" />}
              {(mode === 'preview' || mode === 'split') && (
                <div className="preview-pane">
                  <Preview content={activeTab.content} fileType={fileType} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
