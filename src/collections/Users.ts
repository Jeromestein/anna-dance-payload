import type { CollectionConfig } from 'payload'

import {
  administratorFieldAccess,
  administratorOnly,
  administratorOrSelf,
  isAdministratorUser,
} from '../access/staff'

export const Users: CollectionConfig = {
  slug: 'users',
  labels: {
    singular: 'Staff',
    plural: 'Staff',
  },
  admin: {
    description: 'Staff who can access the website content system.',
    group: 'Administration',
    hidden: ({ user }) => !isAdministratorUser(user),
    useAsTitle: 'email',
  },
  auth: true,
  access: {
    create: administratorOnly,
    delete: administratorOnly,
    read: administratorOrSelf,
    update: administratorOrSelf,
  },
  fields: [
    {
      name: 'role',
      type: 'select',
      access: {
        create: administratorFieldAccess,
        update: administratorFieldAccess,
      },
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
          'Administrators can manage Student information. Content editors only manage website content.',
        position: 'sidebar',
      },
    },
  ],
}
