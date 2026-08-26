import type { CollectionConfig } from 'payload'

import { authenticated } from '../access/authenticated'

export const Videos: CollectionConfig = {
  slug: 'videos',
  labels: {
    singular: 'Video',
    plural: 'Videos',
  },
  admin: {
    defaultColumns: ['filename', 'title', 'updatedAt'],
    description: 'Upload MP4 or WebM videos once, then reuse them in website sections.',
    group: 'Media Library',
    useAsTitle: 'title',
  },
  access: {
    create: authenticated,
    delete: authenticated,
    read: () => true,
    update: authenticated,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Video name',
      required: true,
      admin: {
        description: 'A short internal name, such as “Spring recital highlights”.',
      },
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Video description',
      required: true,
      admin: {
        description: 'Briefly describe the video for accessibility and future reuse.',
        rows: 3,
      },
    },
    {
      name: 'posterImage',
      type: 'upload',
      label: 'Cover image (optional)',
      relationTo: 'images',
      admin: {
        description: 'Choose an image shown before the visitor plays the video.',
      },
    },
  ],
  trash: true,
  upload: {
    bulkUpload: true,
    displayPreview: false,
    focalPoint: false,
    mimeTypes: ['video/mp4', 'video/webm'],
    pasteURL: false,
  },
}
