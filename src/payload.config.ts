import { postgresAdapter } from '@payloadcms/db-postgres'
import { resendAdapter } from '@payloadcms/email-resend'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { s3Storage } from '@payloadcms/storage-s3'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Faculty } from './collections/Faculty'
import { Images } from './collections/Images'
import { Classes } from './collections/Classes'
import { MediaGalleries } from './collections/MediaGalleries'
import { Users } from './collections/Users'
import { Videos } from './collections/Videos'
import { SocialProfiles } from './globals/SocialProfiles'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const isSupabaseStorageConfigured = [
  process.env.S3_BUCKET,
  process.env.S3_ENDPOINT,
  process.env.S3_REGION,
  process.env.S3_ACCESS_KEY_ID,
  process.env.S3_SECRET_ACCESS_KEY,
].every(Boolean)

const resendFrom = process.env.RESEND_FROM_EMAIL?.trim() || ''
const resendFromAddress = resendFrom.match(/<([^<>]+)>/)?.[1]?.trim() || resendFrom
const payloadEmailAdapter = process.env.RESEND_API_KEY
  ? resendAdapter({
      apiKey: process.env.RESEND_API_KEY,
      defaultFromAddress: resendFromAddress || 'onboarding@resend.dev',
      defaultFromName: 'Anna Dance Academy',
    })
  : undefined

export default buildConfig({
  admin: {
    user: Users.slug,
    components: {
      graphics: {
        Icon: '/components/admin/AnnaDanceAdminBrand#AnnaDanceAdminIcon',
        Logo: '/components/admin/AnnaDanceAdminBrand#AnnaDanceAdminLogo',
      },
      afterNavLinks: [
        '/components/admin/StudentNavLink#StudentNavLink',
        '/components/admin/VisitWebsiteNavLink#VisitWebsiteNavLink',
      ],
      views: {
        studentList: {
          Component: '/components/admin/StudentAdminViews#StudentListView',
          exact: true,
          path: '/students',
        },
        studentDetail: {
          Component: '/components/admin/StudentAdminViews#StudentDetailView',
          exact: true,
          path: '/students/:id',
        },
      },
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
    meta: {
      applicationName: 'Anna Dance Academy CMS',
      description: 'Manage Anna Dance Academy website content and media.',
      icons: [
        {
          rel: 'icon',
          type: 'image/png',
          url: '/images/branding/anna-dance-academy-mark.png',
        },
      ],
      titleSuffix: ' — Anna Dance Academy',
    },
  },
  collections: [Faculty, Classes, MediaGalleries, Images, Videos, Users],
  editor: lexicalEditor(),
  email: payloadEmailAdapter,
  globals: [SocialProfiles],
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
    tablesFilter: ['!user_profiles', '!student_profiles', '!app_*'],
  }),
  sharp,
  plugins: [
    s3Storage({
      alwaysInsertFields: true,
      bucket: process.env.S3_BUCKET || '',
      collections: {
        images: {
          prefix: 'images',
        },
        videos: {
          prefix: 'videos',
        },
      },
      config: {
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
        },
        endpoint: process.env.S3_ENDPOINT,
        forcePathStyle: true,
        region: process.env.S3_REGION || '',
      },
      enabled: isSupabaseStorageConfigured,
    }),
  ],
  upload: {
    abortOnLimit: true,
    limits: {
      fileSize: 50 * 1024 * 1024,
    },
    responseOnLimit: 'The file is larger than the 50 MB media-library limit.',
  },
})
