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

  it('loads reusable media galleries by stable page reference', async () => {
    const galleries = await payload.find({
      collection: 'media-galleries',
      limit: 10,
      overrideAccess: true,
      where: {
        slug: {
          in: ['home-studio', 'about-academy'],
        },
      },
    })

    expect(galleries).toBeDefined()
    expect(galleries.docs).toHaveLength(2)
  })

  it('loads the reusable social profiles settings', async () => {
    const socialProfiles = await payload.findGlobal({
      slug: 'social-profiles',
      depth: 1,
      overrideAccess: true,
    })

    expect(socialProfiles).toBeDefined()
    expect(socialProfiles.showInFooter).toBe(true)
    expect(socialProfiles.facebookUrl).toBeTruthy()
    expect(socialProfiles.instagramUrl).toBeTruthy()
    expect(socialProfiles.wechatId).toBeTruthy()
  })
})
