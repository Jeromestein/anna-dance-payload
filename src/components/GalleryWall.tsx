import Link from 'next/link'

import { SocialFollow } from '@/components/SocialFollow'
import type { Image, MediaGallery, SocialProfile, Video } from '@/payload-types'

type GalleryWallProps = {
  canEdit?: boolean
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

export function GalleryWall({ canEdit = false, gallery, sectionKey, socialProfiles }: GalleryWallProps) {
  const items: ResolvedGalleryItem[] = []
  const headingId = `media-gallery-${sectionKey}-heading`
  const eyebrow = gallery.eyebrow?.trim()
  const heading = gallery.heading?.trim()
  const introduction = gallery.introduction?.trim()
  const hasTitleContent = Boolean(eyebrow || heading)
  const hasHeaderContent = Boolean(hasTitleContent || introduction)

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
    <section
      aria-label={heading ? undefined : eyebrow || 'Selected photos and videos'}
      aria-labelledby={heading ? headingId : undefined}
      className="mediaGallerySection"
    >
      {hasHeaderContent ? (
        <div
          className={`gallerySectionHeader${hasTitleContent && introduction ? '' : ' gallerySectionHeaderSingle'}`}
        >
          {hasTitleContent ? (
            <div>
              {eyebrow ? <p className="sectionLabel">{eyebrow}</p> : null}
              {heading ? <h2 id={headingId}>{heading}</h2> : null}
            </div>
          ) : null}
          {introduction ? <p>{introduction}</p> : null}
        </div>
      ) : null}

      {items.length > 0 ? (
        <div className="galleryWallFrame">
          {canEdit ? (
            <div className="galleryEditBar">
              <Link
                aria-label={`Edit ${gallery.internalName} in the administrator`}
                className="galleryEditLink"
                href={`/admin/collections/media-galleries/${gallery.id}`}
                rel="noopener noreferrer"
                target="_blank"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24">
                  <path d="M12 8.75a3.25 3.25 0 1 0 0 6.5 3.25 3.25 0 0 0 0-6.5Z" />
                  <path d="M19.1 13.5c.06-.49.06-1.01 0-1.5l1.62-1.27-1.75-3.03-1.91.77a7.6 7.6 0 0 0-2.6-1.5L14.18 5h-3.5l-.28 1.97a7.6 7.6 0 0 0-2.6 1.5L5.89 7.7l-1.75 3.03L5.76 12a6.4 6.4 0 0 0 0 1.5l-1.62 1.27 1.75 3.03 1.91-.77a7.6 7.6 0 0 0 2.6 1.5l.28 1.97h3.5l.28-1.97a7.6 7.6 0 0 0 2.6-1.5l1.91.77 1.75-3.03-1.62-1.27Z" />
                </svg>
                EDIT
              </Link>
            </div>
          ) : null}

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
                      autoPlay
                      controls
                      loop
                      muted
                      playsInline
                      poster={getImage(item.media.posterImage)?.url || undefined}
                      preload="metadata"
                    >
                      <source
                        src={item.media.url || ''}
                        type={item.media.mimeType || 'video/mp4'}
                      />
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
