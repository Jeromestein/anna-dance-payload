import { afterEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/(frontend)/api/contact/route'
import { GET } from '@/app/(frontend)/api/dev/email-preview/route'
import { emailPreviewNames, renderEmailPreview } from '@/lib/email/preview-fixtures'
import { renderContactEmail, renderRegistrationEmail } from '@/lib/email/templates'
import { emailLogoUrl } from '@/lib/email/email-brand-logo'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('branded email output', () => {
  it.each(emailPreviewNames)('renders %s with a public logo and actionable links', async (name) => {
    const html = await renderEmailPreview(name)
    const document = new DOMParser().parseFromString(html, 'text/html')
    expect(document.documentElement.lang).toBe('en')
    expect(document.querySelector('img')?.src).toBe(emailLogoUrl)
    expect(document.querySelector('img')?.alt).toContain('Anna Dance Academy')
    expect(document.querySelectorAll('h1')).toHaveLength(1)
    expect(document.querySelectorAll('script')).toHaveLength(0)
    for (const link of document.querySelectorAll('a')) {
      expect(link.href).toMatch(/^(https:\/\/|mailto:|tel:)/)
    }
    if (name !== 'contact' && name !== 'registration') {
      expect(document.body.textContent).toContain('$240.00')
      expect(document.body.textContent).toContain('$180.00')
      expect(document.querySelectorAll('th[scope="col"]')).toHaveLength(2)
      expect(html.includes('/admin/students/')).toBe(name.endsWith('_admin'))
      expect(html.includes('sophie@example.com')).toBe(name.endsWith('_admin'))
    }
  })

  it('escapes user-supplied markup and preserves multiline inquiry text', async () => {
    const message = '<script>alert("test")</script>\n<img src=x onerror=alert(1)> & ballet'
    const html = await renderContactEmail({
      name: '<b>Parent</b>',
      email: 'parent@example.com',
      age: '8',
      interest: 'Ballet',
      message,
    })
    const document = new DOMParser().parseFromString(html, 'text/html')
    expect(document.querySelectorAll('script, [onerror]')).toHaveLength(0)
    expect(document.querySelectorAll('img')).toHaveLength(1)
    expect(document.body.textContent).toContain(message)
    expect(document.body.textContent).toContain('<b>Parent</b>')
    expect(document.querySelector('a[href="mailto:parent@example.com"]')).not.toBeNull()
  })

  it('does not invent a registration account link when URL configuration is unavailable', async () => {
    const html = await renderRegistrationEmail({
      studentName: 'Student',
      email: 'student@example.com',
      studentPhone: 'Not provided',
      guardianName: 'Not provided',
      guardianPhone: 'Not provided',
      registeredAt: '2026-09-21',
    })
    expect(html).not.toContain('/admin/students/')
    expect(html).not.toContain('undefined')
  })

  it('includes HTML and the original text in contact delivery while preserving reply-to', async () => {
    vi.stubEnv('RESEND_API_KEY', 'test-key')
    vi.stubEnv('CONTACT_TO_EMAIL', 'school@example.com')
    vi.stubEnv('RESEND_FROM_EMAIL', 'Academy <accounts@example.com>')
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const response = await POST(
      new NextRequest('http://localhost/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Parent',
          email: 'parent@example.com',
          age: '8',
          interest: 'Ballet',
          message: 'Class times, please?',
        }),
      }),
    )
    expect(response.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledOnce()
    const payload = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(payload).toMatchObject({
      to: ['school@example.com'],
      reply_to: 'parent@example.com',
      subject: 'New Ballet Inquiry from Parent',
    })
    expect(payload.text).toContain('Class times, please?')
    expect(payload.html).toContain('Class times, please?')
    expect(payload.html).toContain(emailLogoUrl)
  })
})

describe('local email previews', () => {
  it('is unavailable in production and rejects unknown templates in development', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    expect((await GET(new Request('http://localhost/api/dev/email-preview'))).status).toBe(404)
    vi.stubEnv('NODE_ENV', 'development')
    expect(
      (await GET(new Request('http://localhost/api/dev/email-preview?template=unknown'))).status,
    ).toBe(404)
  })

  it('renders fictional sample data without fetching accounts or sending email', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const response = await GET(
      new Request('http://localhost/api/dev/email-preview?template=request'),
    )
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(await response.text()).toContain('Emma Chen')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
