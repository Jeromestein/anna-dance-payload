'use client'

import { useEffect, useId, useState } from 'react'

import type { Image, SocialProfile } from '@/payload-types'

type SocialFollowProps = {
  profiles: SocialProfile
  variant: 'footer' | 'gallery'
}

type SocialIconProps = {
  platform: 'facebook' | 'instagram' | 'wechat'
}

function SocialIcon({ platform }: SocialIconProps) {
  if (platform === 'facebook') {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M13.7 21v-8h2.7l.4-3h-3.1V8.1c0-.9.3-1.5 1.6-1.5H17V4a22 22 0 0 0-2.4-.1c-2.4 0-4.1 1.5-4.1 4.2V10H7.8v3h2.7v8h3.2Z" />
      </svg>
    )
  }

  if (platform === 'instagram') {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <rect height="15.5" rx="4.4" width="15.5" x="4.25" y="4.25" />
        <circle cx="12" cy="12" r="3.6" />
        <circle className="socialIconDot" cx="17.25" cy="6.9" r="1" />
      </svg>
    )
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M9.8 5.2c-4 0-7.2 2.5-7.2 5.7 0 1.8 1 3.4 2.7 4.5l-.7 2.3 2.7-1.3c.8.2 1.6.3 2.5.3h.7a5.6 5.6 0 0 1-.2-1.5c0-3.2 2.9-5.8 6.6-6.2-.9-2.2-3.6-3.8-7.1-3.8Z" />
      <path d="M21.5 15.2c0-2.8-2.7-5-6-5s-6 2.2-6 5 2.7 5 6 5c.7 0 1.4-.1 2.1-.3l2.3 1.1-.6-2c1.4-.9 2.2-2.3 2.2-3.8Z" />
      <circle className="socialIconEye" cx="7.4" cy="10.4" r=".7" />
      <circle className="socialIconEye" cx="12" cy="10.4" r=".7" />
      <circle className="socialIconEye" cx="13.7" cy="14.8" r=".65" />
      <circle className="socialIconEye" cx="17.6" cy="14.8" r=".65" />
    </svg>
  )
}

function getQrCode(image: number | Image | null | undefined): Image | null {
  return typeof image === 'object' && image !== null ? image : null
}

export function SocialFollow({ profiles, variant }: SocialFollowProps) {
  const [isWeChatOpen, setIsWeChatOpen] = useState(false)
  const dialogId = useId()
  const facebookUrl = profiles.facebookUrl?.trim()
  const instagramUrl = profiles.instagramUrl?.trim()
  const wechatId = profiles.wechatId?.trim()
  const wechatQrCode = getQrCode(profiles.wechatQrCode)
  const hasWeChat = Boolean(wechatId || wechatQrCode?.url)

  useEffect(() => {
    if (!isWeChatOpen) return

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsWeChatOpen(false)
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [isWeChatOpen])

  if (!facebookUrl && !instagramUrl && !hasWeChat) return null

  return (
    <section
      aria-label="Social media"
      className={`socialFollow socialFollow--${variant}`}
      role={variant === 'gallery' ? 'listitem' : undefined}
    >
      <div className="socialFollowCopy">
        <p className="socialFollowLabel">Stay connected</p>
        <h3>{profiles.heading}</h3>
        <p>{profiles.message}</p>
      </div>

      <div aria-label="Social profiles" className="socialIconRow">
        {facebookUrl ? (
          <a
            aria-label="Visit our Facebook page"
            className="socialLink socialLink--facebook"
            href={facebookUrl}
            rel="noreferrer"
            target="_blank"
          >
            <SocialIcon platform="facebook" />
            <span>Facebook</span>
          </a>
        ) : null}
        {instagramUrl ? (
          <a
            aria-label="Visit our Instagram profile"
            className="socialLink socialLink--instagram"
            href={instagramUrl}
            rel="noreferrer"
            target="_blank"
          >
            <SocialIcon platform="instagram" />
            <span>Instagram</span>
          </a>
        ) : null}
        {hasWeChat ? (
          <button
            aria-controls={dialogId}
            aria-expanded={isWeChatOpen}
            aria-label="Open our WeChat details"
            className="socialLink socialLink--wechat"
            onClick={() => setIsWeChatOpen(true)}
            type="button"
          >
            <SocialIcon platform="wechat" />
            <span>WeChat</span>
          </button>
        ) : null}
      </div>

      {isWeChatOpen ? (
        <div className="wechatModal" onMouseDown={() => setIsWeChatOpen(false)} role="presentation">
          <div
            aria-labelledby={`${dialogId}-title`}
            aria-modal="true"
            className="wechatDialog"
            id={dialogId}
            onMouseDown={(event) => event.stopPropagation()}
            role="dialog"
          >
            <button
              aria-label="Close WeChat details"
              className="wechatClose"
              onClick={() => setIsWeChatOpen(false)}
              type="button"
            >
              ×
            </button>
            <p className="socialFollowLabel">WeChat</p>
            <h3 id={`${dialogId}-title`}>Connect on WeChat</h3>
            {wechatQrCode?.url ? (
              // Payload serves local and S3-backed files through the same stored URL.
              // eslint-disable-next-line @next/next/no-img-element
              <img alt={wechatQrCode.altText} src={wechatQrCode.url} />
            ) : null}
            {wechatId ? (
              <p className="wechatId">
                WeChat ID <strong>{wechatId}</strong>
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  )
}
