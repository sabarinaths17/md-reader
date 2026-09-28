import { useMemo, useEffect } from 'react'
import { marked } from 'marked'

marked.use({ gfm: true, breaks: false })

const INTERCEPTOR = `
<script>
(function () {
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href]');
    if (!a) return;
    var href = a.getAttribute('href');
    if (!href || href === 'javascript:;' || href === 'javascript:void(0)') return;

    if (href.startsWith('#')) {
      e.preventDefault();
      var id = href.slice(1);
      if (!id) return;
      var el = document.getElementById(id) || document.querySelector('[name="' + id + '"]');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    if (/^https?:\\/\\//.test(href) || /^mailto:/.test(href)) {
      e.preventDefault();
      window.parent.postMessage({ type: 'open-external', url: href }, '*');
      return;
    }

    // relative / other — block navigation so the frame doesn't blank
    e.preventDefault();
  }, true);
})();
<\/script>
`

function injectInterceptor(html) {
  if (/<\/body>/i.test(html)) return html.replace(/<\/body>/i, INTERCEPTOR + '</body>')
  if (/<\/html>/i.test(html)) return html.replace(/<\/html>/i, INTERCEPTOR + '</html>')
  return html + INTERCEPTOR
}

export default function Preview({ content, fileType = 'markdown' }) {
  useEffect(() => {
    const handler = (e) => {
      if (e.data?.type === 'open-external' && typeof e.data.url === 'string') {
        window.electronAPI.openExternal(e.data.url)
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  const html = useMemo(() => {
    if (fileType === 'html') return null
    if (!content?.trim()) return '<p class="preview-empty">Nothing to preview yet.</p>'
    return marked.parse(content)
  }, [content, fileType])

  if (fileType === 'html') {
    return (
      <iframe
        className="html-preview-frame"
        srcDoc={injectInterceptor(content || '')}
        sandbox="allow-scripts allow-same-origin"
        title="HTML Preview"
      />
    )
  }

  return (
    <div
      className="preview-content"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
