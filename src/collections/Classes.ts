import type { CollectionConfig } from 'payload'

import { authenticated } from '../access/authenticated'

export const Classes: CollectionConfig = {
  slug: 'classes',
  labels: {
    singular: 'Class',
    plural: 'Classes',
  },
  admin: {
    defaultColumns: ['title', 'audience', 'showOnWebsite', '_status', 'updatedAt'],
    description: 'Add programs and update the class information shown on the website.',
    group: 'Website Content',
    useAsTitle: 'title',
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
      name: 'title',
      type: 'text',
      label: 'Class name',
      required: true,
    },
    {
      name: 'audience',
      type: 'text',
      label: 'Age / availability line',
      required: true,
      admin: {
        description: 'For example: Ages 2½+ · Placement required or Saturday training.',
      },
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Description',
      required: true,
      admin: {
        rows: 4,
      },
    },
    {
      name: 'image',
      type: 'upload',
      label: 'Class photo',
      relationTo: 'images',
      required: true,
      admin: {
        description: 'Choose an existing photo from Images or upload a new one.',
      },
    },
    {
      name: 'highlights',
      type: 'array',
      label: 'Highlights',
      minRows: 1,
      maxRows: 5,
      required: true,
      admin: {
        description: 'Short points such as Weekly, 60 minutes or English & Chinese.',
        initCollapsed: true,
      },
      fields: [
        {
          name: 'label',
          type: 'text',
          label: 'Highlight',
          required: true,
        },
      ],
    },
    {
      name: 'cardTone',
      type: 'select',
      label: 'Card color',
      defaultValue: 'blush',
      options: [
        { label: 'Blush', value: 'blush' },
        { label: 'Cream', value: 'cream' },
        { label: 'Sage', value: 'sage' },
        { label: 'Lavender', value: 'lavender' },
      ],
      required: true,
      admin: {
        description: 'Select the soft background color used on the Homepage card.',
        position: 'sidebar',
      },
    },
    {
      name: 'showOnWebsite',
      type: 'checkbox',
      label: 'Show on website',
      defaultValue: false,
      admin: {
        description: 'Turn this off to hide the class without deleting it.',
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
