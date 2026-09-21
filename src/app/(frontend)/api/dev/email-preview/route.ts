import {
  emailPreviewNames,
  renderEmailPreview,
  type EmailPreviewName,
} from '@/lib/email/preview-fixtures'

export async function GET(request: Request) {
  if (process.env.NODE_ENV !== 'development') return new Response(null, { status: 404 })
  const name = new URL(request.url).searchParams.get('template')
  if (name && !emailPreviewNames.includes(name as EmailPreviewName)) {
    return new Response('Unknown email template', { status: 404 })
  }
  const html = name
    ? await renderEmailPreview(name as EmailPreviewName)
    : `<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Anna Dance email previews</title></head>
      <body style="font:16px/1.6 Arial,sans-serif;background:#faf5f7;color:#302630;padding:24px;max-width:800px;margin:auto">
      <h1>Anna Dance email previews</h1><p>Fictional sample data. No emails are sent. Select a template to preview.</p>
      <ul>${emailPreviewNames.map((key) => `<li><a style="color:#a8326a" href="?template=${key}">${key.replaceAll('_', ' ')}</a></li>`).join('')}</ul>
      </body></html>`
  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}
