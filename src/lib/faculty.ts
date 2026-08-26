import { getPayload } from 'payload'

import config from '@/payload.config'

export async function getPublicFaculty() {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'faculty',
    depth: 1,
    draft: false,
    limit: 100,
    overrideAccess: false,
    sort: '_order',
  })

  return result.docs
}
