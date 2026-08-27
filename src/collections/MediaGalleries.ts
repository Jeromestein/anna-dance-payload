import type { CollectionConfig } from 'payload'

import { authenticated } from '../access/authenticated'

export const MediaGalleries: CollectionConfig = {
  slug: 'media-galleries',
  labels: {
    singular: 'Media Gallery',
    plural: 'Media Galleries',
  },
  admin: {
    defaultColumns: ['internalName', 'slug', 'showOnWebsite', '_status', 'updatedAt'],
    description:
      'Create reusable groups of photos and videos. Next.js pages reference each gallery by its stable slug.',
    group: 'Website Content',
    useAsTitle: 'internalName',
  },
  access: {
    create: authenticated,
    delete: authenticated,
    read: ({ req }) => {
      if (req.user) return true

      return {
        _status: {
          equals: 'published',
        },
        showOnWebsite: {
          equals: true,
        },
      }
    },
    update: authenticated,
  },
  fields: [
    {
      name: 'internalName',
      type: 'text',
      label: 'Internal name',
      required: true,
      unique: true,
      admin: {
        description:
          'Used only in the CMS, for example “Home — Studio Moments” or “Classes — Highlights”.',
      },
    },
    {
      name: 'slug',
      type: 'text',
      label: 'Page reference',
      required: true,
      unique: true,
      admin: {
        description:
          'Used by the website code, for example “home-studio” or “about-academy”. Do not change it after the page is connected.',
        position: 'sidebar',
      },
    },
    {
      name: 'eyebrow',
      type: 'text',
      label: 'Small heading (optional)',
      defaultValue: 'Inside the studio',
      admin: {
        description: 'Leave blank to hide the small heading above this gallery.',
      },
    },
    {
      name: 'heading',
      type: 'text',
      label: 'Heading (optional)',
      defaultValue: 'Movement, moments, and community.',
      admin: {
        description: 'Leave blank to show the gallery without a main heading.',
      },
    },
    {
      name: 'introduction',
      type: 'textarea',
      label: 'Introduction (optional)',
      admin: {
        description: 'Leave blank to hide the introductory paragraph.',
        rows: 3,
      },
    },
    {
      name: 'items',
      type: 'array',
      label: 'Selected photos and videos',
      maxRows: 12,
      admin: {
        description:
          'Add up to 12 items. Choose the media type first, select a file, then drag rows to reorder the wall.',
        initCollapsed: true,
        isSortable: true,
      },
      fields: [
        {
          name: 'mediaType',
          type: 'radio',
          label: 'Media type',
          defaultValue: 'image',
          options: [
            {
              label: 'Image',
              value: 'image',
            },
            {
              label: 'Video',
              value: 'video',
            },
          ],
          required: true,
          admin: {
            layout: 'horizontal',
          },
        },
        {
          name: 'image',
          type: 'upload',
          label: 'Choose image',
          relationTo: 'images',
          required: true,
          admin: {
            condition: (_data, siblingData) => siblingData.mediaType === 'image',
            description: 'Choose an existing image or upload a new one.',
          },
        },
        {
          name: 'video',
          type: 'upload',
          label: 'Choose video',
          relationTo: 'videos',
          required: true,
          admin: {
            condition: (_data, siblingData) => siblingData.mediaType === 'video',
            description: 'Choose an existing video or upload a new one.',
          },
        },
        {
          name: 'caption',
          type: 'text',
          label: 'Caption (optional)',
          admin: {
            description: 'A short line shown over the bottom of this item.',
          },
        },
      ],
    },
    {
      name: 'showSocialLinks',
      type: 'checkbox',
      label: 'Show social links with this gallery',
      defaultValue: true,
      admin: {
        description:
          'Adds the reusable Social Profiles invitation to this gallery. Empty social platforms remain hidden.',
        position: 'sidebar',
      },
    },
    {
      name: 'showOnWebsite',
      type: 'checkbox',
      label: 'Available on website',
      defaultValue: true,
      admin: {
        description: 'Turn this off to hide this gallery everywhere without deleting it.',
        position: 'sidebar',
      },
    },
  ],
  trash: true,
  versions: {
    drafts: true,
    maxPerDoc: 20,
  },
}
