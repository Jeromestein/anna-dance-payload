import type { CollectionConfig } from 'payload'

import {
  administratorFieldAccess,
  administratorOnly,
  administratorOrSelf,
  isAdministratorUser,
} from '../access/staff'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    description: 'Staff accounts that can access the website content system.',
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
          'Administrators can manage student operations. Content editors only manage website content.',
        position: 'sidebar',
      },
    },
  ],
}
