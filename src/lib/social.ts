import { getPayload } from 'payload'

import config from '@/payload.config'

export async function getSocialProfiles() {
  const payload = await getPayload({ config })
  const profiles = await payload.findGlobal({
    slug: 'social-profiles',
    depth: 1,
    draft: false,
    overrideAccess: false,
  })

  const hasFacebook = Boolean(profiles.facebookUrl?.trim())
  const hasInstagram = Boolean(profiles.instagramUrl?.trim())
  const hasWeChat = Boolean(
    profiles.wechatId?.trim() ||
    (typeof profiles.wechatQrCode === 'object' && profiles.wechatQrCode?.url),
  )

  return hasFacebook || hasInstagram || hasWeChat ? profiles : null
}
