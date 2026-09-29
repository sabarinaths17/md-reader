import { useState, useRef } from 'react'
import { isAndroid } from '../platform.js'

function basename(p) {
  return p.replace(/\\/g, '/').split('/').pop()
}

function FileNode({ node, currentFile, onSelectFile, onDeleteFile, onRenameFile, depth }) {
  const [expanded, setExpanded] = useState(depth < 1)
  const [renaming, setRenaming] = useState(false)
  const [renameVal, setRenameVal] = useState(node.name)
  const [showMenu, setShowMenu] = useState(false)
  const inputRef = useRef(null)

  const commitRename = () => {
    setRenaming(false)
    const v = renameVal.trim()
    if (v && v !== node.name) onRenameFile(node.path, v)
  }

  if (node.type === 'directory') {
    return (
      <div className="tree-node">
        <div
          className="tree-item tree-dir"
          style={{ paddingLeft: `${10 + depth * 14}px` }}
          onClick={() => setExpanded(v => !v)}
        >
          <span className="tree-arrow">{expanded ? '▾' : '▸'}</span>
          <svg className="tree-file-icon" width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M1 3.5C1 2.67 1.67 2 2.5 2h2.618a1 1 0 01.707.293L6.5 3H10.5A1.5 1.5 0 0112 4.5v5A1.5 1.5 0 0110.5 11h-8A1.5 1.5 0 011 9.5v-6z" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.3)" strokeWidth="0.8"/>
          </svg>
          <span className="tree-name">{node.name}</span>
        </div>
        {expanded && node.children?.map(child => (
          <FileNode
            key={child.path}
            node={child}
            currentFile={currentFile}
            onSelectFile={onSelectFile}
            onDeleteFile={onDeleteFile}
            onRenameFile={onRenameFile}
            depth={depth + 1}
          />
        ))}
      </div>
    )
  }

  const isActive = currentFile === node.path

  return (
    <div
      className={`tree-item tree-file ${isActive ? 'active' : ''}`}
      style={{ paddingLeft: `${10 + depth * 14}px` }}
      onClick={() => onSelectFile(node.path)}
      onContextMenu={(e) => { e.preventDefault(); setShowMenu(true) }}
      title={node.path}
    >
      <svg className="tree-file-icon" width="12" height="13" viewBox="0 0 12 13" fill="none">
        <path d="M1.5 1.5h6L10.5 5v6.5A.5.5 0 0110 12H2a.5.5 0 01-.5-.5v-10z" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.25)" strokeWidth="0.8"/>
        <path d="M7.5 1.5V5H10.5" stroke="rgba(255,255,255,0.2)" strokeWidth="0.8"/>
      </svg>
      {renaming ? (
        <input
          ref={inputRef}
          className="rename-input"
          value={renameVal}
          autoFocus
          onChange={e => setRenameVal(e.target.value)}
          onBlur={commitRename}
          onKeyDown={e => {
            if (e.key === 'Enter') commitRename()
            if (e.key === 'Escape') setRenaming(false)
            e.stopPropagation()
          }}
          onClick={e => e.stopPropagation()}
        />
      ) : (
        <span className="tree-name">{node.name}</span>
      )}
      {showMenu && (
        <ContextMenu
          onRename={() => { setRenaming(true); setShowMenu(false) }}
          onDelete={() => { onDeleteFile(node.path); setShowMenu(false) }}
          onClose={() => setShowMenu(false)}
        />
      )}
    </div>
  )
}

function ContextMenu({ onRename, onDelete, onClose }) {
  return (
    <>
      <div className="context-overlay" onClick={onClose} />
      <div className="context-menu" onClick={e => e.stopPropagation()}>
        <button className="context-item" onClick={onRename}>Rename</button>
        <button className="context-item context-danger" onClick={onDelete}>Move to Trash</button>
      </div>
    </>
  )
}

export default function Sidebar({
  folder, fileTree, currentFile,
  onSelectFile, onOpenFolder, onCreateFile, onRefresh, onDeleteFile, onRenameFile,
}) {
  const folderName = folder && folder !== '@android' ? basename(folder) : null

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        {isAndroid ? (
          // Android: show "Import File" + "New File" + "Refresh"
          <>
            <span className="sidebar-folder-name">My Files</span>
            <div className="sidebar-actions">
              <button className="icon-btn" onClick={onOpenFolder} title="Import File">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M6 1v7M3 5l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M1 9.5h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
              </button>
              <button className="icon-btn" onClick={onCreateFile} title="New File">
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                  <line x1="5.5" y1="1" x2="5.5" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <line x1="1" y1="5.5" x2="10" y2="5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
              <button className="icon-btn" onClick={onRefresh} title="Refresh">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M10.5 6a4.5 4.5 0 11-1.32-3.18" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none"/>
                  <path d="M9.5 1.5v3h-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                </svg>
              </button>
            </div>
          </>
        ) : folder ? (
          <>
            <span className="sidebar-folder-name" title={folder}>{folderName}</span>
            <div className="sidebar-actions">
              <button className="icon-btn" onClick={onCreateFile} title="New File">
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                  <line x1="5.5" y1="1" x2="5.5" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <line x1="1" y1="5.5" x2="10" y2="5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
              <button className="icon-btn" onClick={onRefresh} title="Refresh">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M10.5 6a4.5 4.5 0 11-1.32-3.18" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none"/>
                  <path d="M9.5 1.5v3h-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                </svg>
              </button>
            </div>
          </>
        ) : (
          <button className="open-folder-btn" onClick={onOpenFolder}>
            Open Folder…
          </button>
        )}
      </div>
      <div className="sidebar-tree">
        {(folder || isAndroid) && fileTree.length === 0 && (
          <div className="sidebar-empty">
            {isAndroid ? 'No files yet — tap ↓ to import' : 'No markdown files found'}
          </div>
        )}
        {fileTree.map(node => (
          <FileNode
            key={node.path}
            node={node}
            currentFile={currentFile}
            onSelectFile={onSelectFile}
            onDeleteFile={onDeleteFile}
            onRenameFile={onRenameFile}
            depth={0}
          />
        ))}
      </div>
    </div>
  )
}
