import { getPayload, Payload } from 'payload'
import config from '@/payload.config'

import { describe, it, beforeAll, expect } from 'vitest'

let payload: Payload

describe('API', () => {
  beforeAll(async () => {
    const payloadConfig = await config
    payload = await getPayload({ config: payloadConfig })
  })

  it('fetches users', async () => {
    const users = await payload.find({
      collection: 'users',
    })
    expect(users).toBeDefined()
  })

  it('loads reusable media galleries and their fixed placements', async () => {
    const galleries = await payload.find({
      collection: 'media-galleries',
      limit: 1,
      overrideAccess: true,
    })
    const placements = await payload.findGlobal({
      slug: 'gallery-placements',
      depth: 1,
      overrideAccess: true,
    })

    expect(galleries).toBeDefined()
    expect(placements).toBeDefined()
  })
})
