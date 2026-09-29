# MD Reader

A Windows desktop app for reading and editing Markdown and HTML files. Built with Electron + React + Vite. Android/Capacitor build scaffold is also present in the same repo.

## Stack

- **Electron 32** — native Windows app shell, frameless window with custom title bar
- **React 18 + Vite 5** — renderer process (loads from localhost:5173 in dev)
- **CodeMirror 6** (`@uiw/react-codemirror`) — markdown editor
- **marked** — markdown → HTML rendering in preview pane
- **`@codemirror/lang-html`** — HTML syntax highlighting in editor
- **Capacitor 6** (Android scaffold only) — `@capacitor/filesystem` + `@capawesome/capacitor-file-picker`; not installed by default, see Android section

## Project structure

```
electron/
  main.js      — main process: window creation, IPC handlers (file system, window controls, fullscreen,
                 process.argv file-open on launch), single-instance lock
  preload.js   — context bridge: exposes window.electronAPI to renderer
src/
  platform.js  — unified file API: routes every call to window.electronAPI (Electron) or Capacitor
                 plugins (Android); isElectron / isAndroid baked in at build time via VITE_PLATFORM
  App.jsx      — root component: tabs state ({id, filePath, content, savedContent, isNew}),
                 activeTabId, mode, theme; Ctrl+S save, Ctrl+W close tab, F11 fullscreen (Electron only);
                 TitleBar hidden on Android; listens for open-file IPC to handle default-app launches
  index.css    — all styles; CSS variables for dark/light theme on :root / [data-theme="light"]
  components/
    TitleBar.jsx  — custom frameless title bar with min/max/close (Electron only, not rendered on Android)
    TabBar.jsx    — horizontal tab strip; each tab shows filename, dirty dot, close button; hidden when no tabs open
    Sidebar.jsx   — desktop: file tree, rename (inline), delete (trash), new file, refresh
                    Android: "My Files" header with import/new/refresh buttons, lists app Documents directory
    Editor.jsx    — CodeMirror wrapper; receives theme + fileType props
    Preview.jsx   — marked renderer for .md; sandboxed iframe srcdoc for .html
capacitor.config.json — Capacitor project config (appId, webDir: dist)
```

## Dev

```bash
npm run dev          # starts Vite + Electron concurrently
npm run build        # builds renderer then packages .exe installer to release/
npm run build:android  # builds for Android (requires android packages — see below)
npm run android:open   # opens Android Studio after build:android
```

Electron binary was manually extracted from the npm cache — `node_modules/electron/path.txt` must contain `electron.exe` (no BOM, no path prefix).

## Features

- Dark / light theme toggle (sun/moon icon in toolbar), persisted to `localStorage`
- Edit / Split / Preview mode toggle
- Multi-tab support: opening a file opens it in a new tab; clicking an already-open file switches to its tab; tabs show dirty state; Ctrl+W closes the active tab; a `+` button at the end of the tab bar opens another file when tabs are already open
- **New File**: toolbar "New" button and empty-state button create a blank unsaved tab; Ctrl+S / Save opens a Save dialog to pick name + location (extension decides file type)
- Ctrl+S save, F11 fullscreen (desktop only)
- Sidebar: open folder, new file, rename (right-click → inline input), move to trash
- **Default app / double-click**: when Windows launches the app with a `.md` file, the file and its containing folder are opened automatically; single-instance lock prevents duplicate windows
- Supports `.md`, `.markdown`, `.txt`, `.html`, `.htm` files
- HTML files: CodeMirror uses `lang-html` in editor; preview renders in sandboxed iframe; link interceptor sends external URLs via `postMessage` → `platform.openExternal`
- `fileType` is derived from the file extension in `App.jsx` and passed as a prop to Editor and Preview

## Platform abstraction (`src/platform.js`)

All file system calls go through `platform.js` — never call `window.electronAPI` directly from components.

- `isElectron` / `isAndroid` are set at Vite build time via `import.meta.env.VITE_PLATFORM`
- Capacitor dynamic imports use `/* @vite-ignore */` and are excluded via `rollupOptions.external` in the Electron build so the packages don't need to be installed
- Android file paths use the `@docs/` prefix (e.g. `@docs/notes.md`) which maps to Capacitor's `Directory.Documents`

## Android build

Capacitor packages are **not** in `dependencies` (to keep the Electron build clean). Before building for Android:

```bash
npm run android:install   # installs @capacitor/core, @capacitor/filesystem, etc.
npx cap add android       # one-time: creates the android/ project
npm run build:android     # vite build --mode android && npx cap sync
npm run android:open      # opens Android Studio to build the APK
```

The `--mode android` flag sets `VITE_PLATFORM=android` and switches Vite's `base` to `/` (Capacitor requires absolute paths; Electron requires `./`).

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

`Editor.jsx` receives `theme` prop and builds two `EditorView.theme()` instances — `layoutTheme` (theme-neutral sizing/padding) and `accentTheme(isDark)` (gutter color, cursor, selection).

Light-mode-only overrides are at the bottom of `index.css` and are kept minimal.

## Known quirks

- The Vite CJS deprecation warning in the console is harmless — ignore it.
- The SmartScreen warning on first install is expected (app is unsigned). Click "More info" → "Run anyway".
- Electron binary requires manual extraction if `npm install` doesn't download it: extract the zip from `%LOCALAPPDATA%\electron\Cache\` into `node_modules\electron\dist\`, then write `electron.exe` (no BOM) into `node_modules\electron\path.txt`.
- If `npm run build` fails with a Capacitor-related Rollup error, check that the packages are listed in `rollupOptions.external` in `vite.config.js` (they should be excluded for non-Android builds).
