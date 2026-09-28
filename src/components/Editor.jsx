import CodeMirror from '@uiw/react-codemirror'
import { markdown } from '@codemirror/lang-markdown'
import { html } from '@codemirror/lang-html'
import { EditorView } from '@codemirror/view'

// Layout/structure — theme-neutral
const layoutTheme = EditorView.theme({
  '&': { height: '100%', backgroundColor: 'transparent' },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': { overflow: 'auto', padding: '0 32px' },
  '.cm-content': { maxWidth: '720px', margin: '0 auto', padding: '28px 0' },
  '.cm-activeLineGutter': { backgroundColor: 'transparent' },
  '.cm-lineNumbers .cm-gutterElement': { minWidth: '2.4em' },
  '.cm-line': { lineHeight: '1.75', fontFamily: 'inherit', fontSize: '14px' },
  '.cm-gutters': { border: 'none', paddingRight: '8px' },
})

function accentTheme(isDark) {
  const accent = isDark ? '#7c6aff' : '#6355d8'
  const gutterColor = isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.22)'
  return EditorView.theme(
    {
      '.cm-content': { caretColor: accent },
      '.cm-cursor': { borderLeftColor: accent, borderLeftWidth: '2px' },
      '.cm-activeLine': { backgroundColor: isDark ? 'rgba(124,106,255,0.04)' : 'rgba(99,85,216,0.04)' },
      '.cm-gutters': { color: gutterColor, backgroundColor: 'transparent' },
      '.cm-selectionBackground, .cm-focused .cm-selectionBackground': {
        backgroundColor: isDark ? 'rgba(124,106,255,0.2) !important' : 'rgba(99,85,216,0.15) !important',
      },
      '.cm-searchMatch': { backgroundColor: isDark ? 'rgba(124,106,255,0.25)' : 'rgba(99,85,216,0.2)', borderRadius: '2px' },
      '.cm-searchMatch.cm-searchMatch-selected': { backgroundColor: isDark ? 'rgba(124,106,255,0.5)' : 'rgba(99,85,216,0.4)' },
    },
    { dark: isDark }
  )
}

const baseExtensions = [EditorView.lineWrapping, layoutTheme]

export default function Editor({ value, onChange, theme = 'dark', fileType = 'markdown' }) {
  const isDark = theme === 'dark'
  const langExt = fileType === 'html' ? html() : markdown()
  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      height="100%"
      theme={theme}
      extensions={[langExt, ...baseExtensions, accentTheme(isDark)]}
      basicSetup={{
        lineNumbers: true,
        highlightActiveLine: true,
        foldGutter: false,
        autocompletion: false,
        bracketMatching: true,
        closeBrackets: false,
        searchKeymap: true,
        highlightSelectionMatches: true,
      }}
      style={{ height: '100%', fontFamily: "'Cascadia Code', 'Fira Code', 'Consolas', monospace" }}
    />
  )
}
