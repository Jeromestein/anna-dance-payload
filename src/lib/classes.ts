import { getPayload } from 'payload'

import { classes as fallbackClasses } from '@/lib/site-data'
import type { Image } from '@/payload-types'
import config from '@/payload.config'

export type WebsiteClass = {
  age: string
  description: string
  features: string[]
  id: number | string
  image: string
  title: string
  tone: string
}

export async function getPublicClasses(): Promise<WebsiteClass[]> {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'classes',
    depth: 1,
    draft: false,
    limit: 100,
    overrideAccess: false,
    sort: '_order',
  })

  if (result.docs.length === 0) {
    return fallbackClasses.map((item) => ({
      ...item,
      id: item.title,
    }))
  }

  return result.docs.map((item) => {
    const image = typeof item.image === 'object' && item.image !== null ? (item.image as Image) : null

    return {
      age: item.audience,
      description: item.description,
      features: item.highlights?.map((highlight) => highlight.label) || [],
      id: item.id,
      image: image?.url || '',
      title: item.title,
      tone: item.cardTone,
    }
  })
}
