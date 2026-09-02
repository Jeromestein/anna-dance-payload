import Image from 'next/image'

export function AnnaDanceAdminLogo() {
  return (
    <div className="anna-admin-brand anna-admin-brand--logo">
      <Image
        alt=""
        className="anna-admin-brand__mark"
        height="72"
        src="/images/branding/anna-dance-academy-mark.png"
        width="72"
      />
      <span className="anna-admin-brand__wordmark">
        <span className="anna-admin-brand__name">Anna Dance</span>
        <span className="anna-admin-brand__label">Academy CMS</span>
      </span>
    </div>
  )
}

export function AnnaDanceAdminIcon() {
  return (
    <span className="anna-admin-brand anna-admin-brand--icon">
      <Image
        alt="Anna Dance Academy"
        className="anna-admin-brand__mark"
        height="44"
        src="/images/branding/anna-dance-academy-mark.png"
        width="44"
      />
    </span>
  )
}
