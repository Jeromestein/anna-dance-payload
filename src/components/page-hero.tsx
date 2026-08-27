import type { CSSProperties } from "react";
import Link from "next/link";
import { ArrowIcon } from "./arrow-icon";

type PageHeroProps = {
  eyebrow: string;
  title: string;
  description: string;
  image?: string;
  mobileImage?: string;
  imageClassName?: string;
  heroClassName?: string;
  showCta?: boolean;
};

export function PageHero({
  eyebrow,
  title,
  description,
  image,
  mobileImage,
  imageClassName,
  heroClassName,
  showCta = true,
}: PageHeroProps) {
  const imageStyles = image
    ? ({
        "--page-hero-image": `url("${image}")`,
        "--page-hero-mobile-image": `url("${mobileImage ?? image}")`,
      } as CSSProperties)
    : undefined;

  return (
    <section className={`page-hero ${image ? "page-hero-with-image" : ""} ${heroClassName ?? ""}`}>
      {image && (
        <div
          className={`page-hero-image ${imageClassName ?? ""}`}
          style={imageStyles}
        />
      )}
      <div className="page-hero-overlay" />
      <div className="page-shell page-hero-content">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="page-hero-description">{description}</p>
        {showCta && <Link href="/schedule#book" className="text-link">Request placement <ArrowIcon /></Link>}
      </div>
    </section>
  );
}
