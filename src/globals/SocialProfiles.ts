import type { GlobalConfig } from 'payload'

import { authenticated } from '../access/authenticated'

function validateWebsiteUrl(value: null | string | undefined) {
  if (!value?.trim()) return true

  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) || 'Use an http:// or https:// URL.'
  } catch {
    return 'Enter a complete URL, including https://.'
  }
}

export const SocialProfiles: GlobalConfig = {
  slug: 'social-profiles',
  label: 'Social Profiles',
  admin: {
    description:
      'Manage one reusable set of social links for galleries, the footer, and other website sections. Empty platforms stay hidden.',
    group: 'Website Content',
  },
  access: {
    read: () => true,
    update: authenticated,
  },
  fields: [
    {
      name: 'heading',
      type: 'text',
      label: 'Invitation heading',
      defaultValue: 'Follow our journey.',
      required: true,
    },
    {
      name: 'message',
      type: 'textarea',
      label: 'Invitation message',
      defaultValue: 'See classes, rehearsal moments, and performances beyond the studio.',
      required: true,
      admin: {
        rows: 3,
      },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'facebookUrl',
          type: 'text',
          label: 'Facebook page URL',
          validate: validateWebsiteUrl,
          admin: {
            description: 'Leave blank to hide Facebook everywhere.',
            placeholder: 'https://www.facebook.com/your-page',
            width: '50%',
          },
        },
        {
          name: 'instagramUrl',
          type: 'text',
          label: 'Instagram profile URL',
          validate: validateWebsiteUrl,
          admin: {
            description: 'Leave blank to hide Instagram everywhere.',
            placeholder: 'https://www.instagram.com/your-profile',
            width: '50%',
          },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'wechatId',
          type: 'text',
          label: 'WeChat ID',
          admin: {
            description: 'Leave both WeChat fields blank to hide WeChat everywhere.',
            width: '50%',
          },
        },
        {
          name: 'wechatQrCode',
          type: 'upload',
          label: 'WeChat QR code (optional)',
          relationTo: 'images',
          admin: {
            description: 'Upload a QR code so visitors can scan it from the website.',
            width: '50%',
          },
        },
      ],
    },
    {
      name: 'showInFooter',
      type: 'checkbox',
      label: 'Show in website footer',
      defaultValue: true,
      admin: {
        description: 'Gallery display is controlled separately on each Media Gallery.',
        position: 'sidebar',
      },
    },
  ],
  versions: {
    drafts: true,
    max: 20,
  },
}
