import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    description: 'Staff accounts that can access the website content system.',
    group: 'Administration',
    useAsTitle: 'email',
  },
  auth: true,
  fields: [
    {
      name: 'role',
      type: 'select',
      defaultValue: 'administrator',
      options: [
        {
          label: 'Administrator',
          value: 'administrator',
        },
        {
          label: 'Content editor',
          value: 'content-editor',
        },
      ],
      required: true,
      saveToJWT: true,
      admin: {
        description:
          'Administrators can manage student operations. Content editors only manage website content.',
        position: 'sidebar',
      },
    },
  ],
}
