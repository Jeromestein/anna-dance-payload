import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { s3Storage } from '@payloadcms/storage-s3'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Faculty } from './collections/Faculty'
import { Images } from './collections/Images'
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

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Faculty, MediaGalleries, Images, Videos, Users],
  editor: lexicalEditor(),
  globals: [SocialProfiles],
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
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
