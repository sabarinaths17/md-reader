# MD Reader

A Windows desktop app for reading and editing Markdown and HTML files. Built with Electron + React + Vite.

## Stack

- **Electron 32** — native Windows app shell, frameless window with custom title bar
- **React 18 + Vite 5** — renderer process (loads from localhost:5173 in dev)
- **CodeMirror 6** (`@uiw/react-codemirror`) — markdown editor
- **marked** — markdown → HTML rendering in preview pane
- **`@codemirror/lang-html`** — HTML syntax highlighting in editor

## Project structure

```
electron/
  main.js      — main process: window creation, IPC handlers (file system, window controls, fullscreen)
  preload.js   — context bridge: exposes window.electronAPI to renderer
src/
  App.jsx      — root component: tabs state (array of {id, filePath, content, savedContent}), activeTabId, mode, theme; Ctrl+S save, Ctrl+W close tab, F11 fullscreen
  index.css    — all styles; CSS variables for dark/light theme on :root / [data-theme="light"]
  components/
    TitleBar.jsx  — custom frameless title bar with min/max/close
    TabBar.jsx    — horizontal tab strip; each tab shows filename, dirty dot, close button; hidden when no tabs open
    Sidebar.jsx   — file tree, rename (inline), delete (trash), new file, refresh
    Editor.jsx    — CodeMirror wrapper; receives theme + fileType props; switches dark/light theme, accent colors, and language (markdown vs html)
    Preview.jsx   — marked renderer for .md; sandboxed iframe srcdoc for .html (sandbox="allow-scripts" only — no allow-same-origin to prevent navigation blanking)
```

## Dev

```bash
npm run dev     # starts Vite + Electron concurrently
npm run build   # builds renderer then packages .exe installer to release/
```

Electron binary was manually extracted from the npm cache — `node_modules/electron/path.txt` must contain `electron.exe` (no BOM, no path prefix).

## Features

- Dark / light theme toggle (sun/moon icon in toolbar), persisted to `localStorage`
- Edit / Split / Preview mode toggle
- Multi-tab support: opening a file opens it in a new tab; clicking an already-open file switches to its tab; tabs show dirty state; Ctrl+W closes the active tab; a `+` button at the end of the tab bar opens another file when tabs are already open
- Ctrl+S save, F11 fullscreen
- Sidebar: open folder, new file, rename (right-click → inline input), move to trash
- Supports `.md`, `.markdown`, `.txt`, `.html`, `.htm` files
- HTML files: CodeMirror uses `lang-html` in editor; preview renders in sandboxed iframe with `sandbox="allow-scripts allow-same-origin"` (both flags needed for full in-page JS); blanking is prevented by an interceptor script injected into the srcdoc that captures all `<a>` clicks — hash links scroll in-place, `http(s)://` and `mailto:` links are sent via `postMessage` to the parent which calls `electronAPI.openExternal`, and relative/other navigation is blocked
- `fileType` is derived from the file extension in `App.jsx` and passed as a prop to Editor and Preview

## Theming rules

All colors must use CSS variables — never hardcode a color outside of `:root` or `[data-theme="light"]`.

Variables defined in `:root` (dark defaults):
- `--bg`, `--sidebar-bg`, `--titlebar-bg`, `--toolbar-bg`
- `--border`, `--border-strong`
- `--text`, `--text-muted`, `--text-faint`
- `--accent`, `--accent-h`, `--accent-bg`, `--accent-bg-h`
- `--danger`, `--danger-bg`
- `--code-bg`, `--pre-bg`

`[data-theme="light"]` overrides all of the above. The `data-theme` attribute is set on `<html>` by App.jsx.

`Editor.jsx` receives `theme` prop and builds two `EditorView.theme()` instances — `layoutTheme` (theme-neutral sizing/padding) and `accentTheme(isDark)` (gutter color, cursor, selection) — so CodeMirror line numbers and cursor adapt correctly to both themes.

Light-mode-only overrides are at the bottom of `index.css` and are kept minimal (inline code color, pre code color, context menu background).

## Known quirks

- The Vite CJS deprecation warning in the console is harmless — ignore it.
- Electron binary requires manual extraction if `npm install` doesn't download it (network/proxy issue): extract the zip from `%LOCALAPPDATA%\electron\Cache\` into `node_modules\electron\dist\`, then write `electron.exe` (no BOM) into `node_modules\electron\path.txt`.
