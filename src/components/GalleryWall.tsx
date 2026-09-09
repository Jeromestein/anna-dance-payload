import { SectionEditLink } from '@/components/SectionEditLink'
import { AwardCertificate } from '@/components/award-certificate'

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
  const interviews = sectionKey === 'faculty-interviews'
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
      className={`mediaGallerySection${interviews ? ' interviewGallery' : ''}`}
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
              <SectionEditLink canEdit={canEdit} href={`/admin/collections/media-galleries/${gallery.id}`} label={gallery.internalName} />
            </div>
          ) : null}

          <div aria-label="Selected photos and videos" className="galleryWall" role="list">
            {items.map((item, index) => {
              const caption = item.caption?.trim()

              const hasAward = sectionKey === 'home-studio' && item.type === 'video' && item.media.filename === 'competition-duet-stage-performance-web.mp4'

              return (
                <div
                  className={`galleryItem galleryItem${(index % 6) + 1}${hasAward ? ' galleryItemWithAward' : ''}`}
                  key={item.id || `${item.type}-${item.media.id}-${index}`}
                  role="listitem"
                >
                  <figure className="galleryMedia">
                  {item.type === 'image' ? (
                    // Payload serves local and S3-backed files through the same stored URL.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img alt={item.media.altText} loading="lazy" src={item.media.url || ''} />
                  ) : (
                    <video
                      aria-label={item.media.description}
                      autoPlay={!interviews}
                      controls
                      loop={!interviews}
                      muted={!interviews}
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
                  {hasAward ? <AwardCertificate /> : null}
                </div>
              )
            })}
            {gallery.showSocialLinks && socialProfiles ? (
              <SocialFollow canEdit={canEdit} profiles={socialProfiles} variant="gallery" />
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
          <SectionEditLink canEdit={canEdit} href={`/admin/collections/media-galleries/${gallery.id}`} label={gallery.internalName} />
        </div>
      )}
    </section>
  )
}
