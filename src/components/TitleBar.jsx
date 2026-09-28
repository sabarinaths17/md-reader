export default function TitleBar({ fileName, isDirty }) {
  return (
    <div className="titlebar">
      <div className="titlebar-drag">
        <svg className="titlebar-logo" width="14" height="14" viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="8" fill="rgba(124,106,255,0.3)"/>
          <path d="M10 13h28M10 20h18M10 27h22M10 34h14" stroke="#7c6aff" strokeWidth="4" strokeLinecap="round"/>
        </svg>
        <span className="app-name">MD Reader</span>
        {fileName && (
          <>
            <span className="titlebar-sep">/</span>
            <span className="titlebar-file">{isDirty && <span className="dirty-dot">●</span>}{fileName}</span>
          </>
        )}
      </div>
      <div className="titlebar-controls">
        <button className="wc-btn wc-min" onClick={() => window.electronAPI.minimize()} title="Minimize">
          <svg width="10" height="1" viewBox="0 0 10 1"><rect width="10" height="1.5" fill="currentColor"/></svg>
        </button>
        <button className="wc-btn wc-max" onClick={() => window.electronAPI.maximize()} title="Maximize">
          <svg width="9" height="9" viewBox="0 0 9 9">
            <rect x="0.75" y="0.75" width="7.5" height="7.5" fill="none" stroke="currentColor" strokeWidth="1.5"/>
          </svg>
        </button>
        <button className="wc-btn wc-close" onClick={() => window.electronAPI.close()} title="Close">
          <svg width="10" height="10" viewBox="0 0 10 10">
            <line x1="1" y1="1" x2="9" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="9" y1="1" x2="1" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
    </div>
  )
}
