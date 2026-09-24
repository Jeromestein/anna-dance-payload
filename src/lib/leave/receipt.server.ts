import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'

export type LeaveEmailPayload = {
  from: string
  to: string[]
  subject: string
  html: string
  text: string
}
export type LeaveReceipt = {
  owner: string
  submittedAt: string
  remaining: number
  expiresAt: number
  emails: [LeaveEmailPayload, LeaveEmailPayload]
}

function secret() {
  const value = process.env.PAYLOAD_SECRET
  if (!value) throw new Error('Leave notifications are not configured.')
  return value
}
export function signLeaveReceipt(receipt: LeaveReceipt) {
  const body = Buffer.from(JSON.stringify(receipt)).toString('base64url')
  return `${body}.${createHmac('sha256', secret()).update(body).digest('base64url')}`
}
export function readLeaveReceipt(token: string, owner: string): LeaveReceipt | null {
  if (token.length > 60000) return null
  try {
    const [body, signature, extra] = token.split('.')
    if (!body || !signature || extra) return null
    const actual = Buffer.from(signature, 'base64url')
    const expected = createHmac('sha256', secret()).update(body).digest()
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null
    const value = JSON.parse(Buffer.from(body, 'base64url').toString()) as LeaveReceipt
    if (value.owner !== owner || !Number.isFinite(value.expiresAt) || value.expiresAt <= Date.now())
      return null
    return value
  } catch {
    return null
  }
}
