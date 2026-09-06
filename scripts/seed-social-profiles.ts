import path from 'node:path'

import { getPayload } from 'payload'

import config from '../src/payload.config'

const payload = await getPayload({ config })

try {
  const qrCodePath = path.resolve(
    process.cwd(),
    'public/images/social/wechat-wudaolaoshi0717.png',
  )
  const qrCodeTitle = 'Anna Dance Academy WeChat QR code'
  const existingQrCodes = await payload.find({
    collection: 'images',
    limit: 1,
    overrideAccess: true,
    where: {
      title: {
        equals: qrCodeTitle,
      },
    },
  })
  const existingQrCode = existingQrCodes.docs[0]
  const qrCode = existingQrCode
    ? await payload.update({
        id: existingQrCode.id,
        collection: 'images',
        data: {
          altText: 'WeChat QR code for wudaolaoshi0717',
          title: qrCodeTitle,
        },
        filePath: qrCodePath,
        overrideAccess: true,
        overwriteExistingFiles: true,
      })
    : await payload.create({
        collection: 'images',
        data: {
          altText: 'WeChat QR code for wudaolaoshi0717',
          title: qrCodeTitle,
        },
        filePath: qrCodePath,
        overrideAccess: true,
      })

  const profiles = await payload.updateGlobal({
    slug: 'social-profiles',
    data: {
      _status: 'published',
      wechatId: 'wudaolaoshi0717',
      wechatQrCode: qrCode.id,
    },
    depth: 0,
    draft: false,
    overrideAccess: true,
  })

  payload.logger.info(
    `Updated ${profiles.heading} with the wudaolaoshi0717 WeChat ID and QR code`,
  )
} finally {
  await payload.destroy()
}
