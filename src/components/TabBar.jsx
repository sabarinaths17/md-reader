export default function TabBar({ tabs, activeTabId, onSelect, onClose, onOpen }) {
  if (tabs.length === 0) return null

  return (
    <div className="tab-bar">
      {tabs.map(tab => {
        const name = tab.filePath.replace(/\\/g, '/').split('/').pop()
        const isActive = tab.id === activeTabId
        const isDirty = tab.content !== tab.savedContent
        return (
          <div
            key={tab.id}
            className={`tab ${isActive ? 'active' : ''}`}
            onClick={() => onSelect(tab.id)}
            title={tab.filePath}
          >
            {isDirty && <span className="tab-dirty">●</span>}
            <span className="tab-name">{name}</span>
            <button
              className="tab-close"
              onClick={e => { e.stopPropagation(); onClose(tab.id) }}
              title="Close"
            >×</button>
          </div>
        )
      })}
      <button className="tab-new" onClick={onOpen} title="Open file">+</button>
    </div>
  )
}
