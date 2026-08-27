import Link from 'next/link'

import { SocialFollow } from '@/components/SocialFollow'
import type { Image, MediaGallery, SocialProfile, Video } from '@/payload-types'

type GalleryWallProps = {
  gallery: MediaGallery
  sectionKey: string
  socialProfiles?: SocialProfile | null
}

type GalleryRow = NonNullable<MediaGallery['items']>[number]

type ResolvedGalleryItem =
  | (GalleryRow & {
      media: Image
      type: 'image'
    })
  | (GalleryRow & {
      media: Video
      type: 'video'
    })

function getImage(image: number | Image | null | undefined): Image | null {
  return typeof image === 'object' && image !== null ? image : null
}

function getVideo(video: number | Video | null | undefined): Video | null {
  return typeof video === 'object' && video !== null ? video : null
}

export function GalleryWall({ gallery, sectionKey, socialProfiles }: GalleryWallProps) {
  const items: ResolvedGalleryItem[] = []
  const headingId = `media-gallery-${sectionKey}-heading`

  for (const item of gallery.items || []) {
    if (item.mediaType === 'video') {
      const video = getVideo(item.video)

      if (video?.url) {
        items.push({ ...item, media: video, type: 'video' })
      }

      continue
    }

    const image = getImage(item.image)

    if (image?.url) {
      items.push({ ...item, media: image, type: 'image' })
    }
  }

  return (
    <section aria-labelledby={headingId} className="mediaGallerySection">
      <div className="gallerySectionHeader">
        <div>
          <p className="sectionLabel">{gallery.eyebrow}</p>
          <h2 id={headingId}>{gallery.heading}</h2>
        </div>
        <p>{gallery.introduction}</p>
      </div>

      {items.length > 0 ? (
        <div aria-label="Selected photos and videos" className="galleryWall" role="list">
          {items.map((item, index) => {
            const caption = item.caption?.trim()

            return (
              <figure
                className={`galleryItem galleryItem${(index % 6) + 1}`}
                key={item.id || `${item.type}-${item.media.id}-${index}`}
                role="listitem"
              >
                {item.type === 'image' ? (
                  // Payload serves local and S3-backed files through the same stored URL.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt={item.media.altText} loading="lazy" src={item.media.url || ''} />
                ) : (
                  <video
                    aria-label={item.media.description}
                    controls
                    playsInline
                    poster={getImage(item.media.posterImage)?.url || undefined}
                    preload="metadata"
                  >
                    <source src={item.media.url || ''} type={item.media.mimeType || 'video/mp4'} />
                  </video>
                )}
                {caption ? <figcaption>{caption}</figcaption> : null}
              </figure>
            )
          })}
          {gallery.showSocialLinks && socialProfiles ? (
            <SocialFollow profiles={socialProfiles} variant="gallery" />
          ) : null}
        </div>
      ) : (
        <div className="emptyState galleryEmptyState">
          <p className="sectionLabel">No gallery items yet</p>
          <h3>Choose the first photo or video</h3>
          <p>
            Add a row in this Media Gallery, choose a file from the Media Library, and publish the
            change. Every Next.js page using its reference will update automatically.
          </p>
          <Link className="primaryButton" href={`/admin/collections/media-galleries/${gallery.id}`}>
            Edit Media Gallery
          </Link>
        </div>
      )}
    </section>
  )
}
