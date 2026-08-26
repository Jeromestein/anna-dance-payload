import type { CollectionConfig } from 'payload'

import { authenticated } from '../access/authenticated'

export const Faculty: CollectionConfig = {
  slug: 'faculty',
  labels: {
    singular: 'Faculty member',
    plural: 'Faculty',
  },
  admin: {
    defaultColumns: ['name', 'title', 'showOnWebsite', '_status', 'updatedAt'],
    description: 'Add teachers and update the profile information shown on the website.',
    group: 'Website Content',
    useAsTitle: 'name',
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
      name: 'name',
      type: 'text',
      label: 'Name',
      required: true,
    },
    {
      name: 'title',
      type: 'text',
      label: 'Title',
      required: true,
      admin: {
        description: 'For example: Founder & Artistic Director or Teaching Artist.',
      },
    },
    {
      name: 'introduction',
      type: 'textarea',
      label: 'Introduction',
      required: true,
      admin: {
        description: 'A short profile shown below the teacher’s name and title.',
        rows: 6,
      },
    },
    {
      name: 'profilePhoto',
      type: 'upload',
      label: 'Profile photo',
      relationTo: 'images',
      required: true,
      admin: {
        description: 'Choose an existing photo from Images or upload a new one.',
      },
    },
    {
      name: 'showOnWebsite',
      type: 'checkbox',
      label: 'Show on website',
      defaultValue: false,
      admin: {
        description: 'Turn this off to hide the profile without deleting it.',
        position: 'sidebar',
      },
    },
  ],
  orderable: true,
  trash: true,
  versions: {
    drafts: true,
    maxPerDoc: 20,
  },
}
