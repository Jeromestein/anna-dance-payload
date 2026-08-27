import type { CSSProperties } from "react";

type Review = {
  kind: "review";
  author: string;
  detail: string;
  quote: string;
  href: string;
};

type FamilyTheme = {
  kind: "theme";
  title: string;
  description: string;
};

type ReviewItem = Review | FamilyTheme;
type EntryDirection = "left" | "right" | "top" | "bottom";

type MotionSlot = {
  x: number;
  y: number;
  width: number;
  delay: number;
  duration: number;
  rotate: number;
  direction: EntryDirection;
  align?: "left" | "center" | "right";
};

const reviews: Review[] = [
  {
    kind: "review",
    author: "Jean Wu",
    detail: "Local Guide",
    quote: "Anna is truly an amazing dance instructor! I had the pleasure of watching her students perform last Sunday night, and I was absolutely blown away. Their technique, confidence, and energy on stage were incredible—it’s clear they’ve been trained with a lot of passion and professionalism. You can really see Anna’s influence in every detail of their performance. Highly recommend her if you’re looking for someone who not only teaches dance but truly inspires her students!",
    href: "https://www.google.com/maps/contrib/105517441030684588717/reviews?hl=en",
  },
  {
    kind: "review",
    author: "Michelle G",
    detail: "Parent review",
    quote: "My daughter has been learning dance here for two years and has made tremendous progress. Ms. Anna is very dedicated and responsible—she always encourages the children and teaches with great patience. This year, my daughter even won second place in The Movement competition.",
    href: "https://www.google.com/maps/contrib/104431077027093056745/reviews?hl=en",
  },
  {
    kind: "review",
    author: "Aspen Li",
    detail: "Google reviewer",
    quote: "The best Chinese folk dance academy in the Tampa Bay area.",
    href: "https://www.google.com/maps/contrib/103051242572317235820/reviews?hl=en",
  },
  {
    kind: "review",
    author: "Lynn Sam",
    detail: "Local Guide",
    quote: "My daughter learns dance with Anna couple years already, highly recommend !!!",
    href: "https://www.google.com/maps/contrib/103002258965232874704/reviews?hl=en",
  },
  {
    kind: "review",
    author: "Nan Li",
    detail: "Google reviewer",
    quote: "Great studio! The teachers are professional and very dedicated!",
    href: "https://www.google.com/maps/contrib/113545806041030058736/reviews?hl=en",
  },
];

const familyThemes: FamilyTheme[] = [
  {
    kind: "theme",
    title: "Patient teaching",
    description: "Families consistently notice Anna’s patience, encouragement, dedication, and care for every dancer.",
  },
  {
    kind: "theme",
    title: "Visible progress",
    description: "Parents describe stronger technique, growing confidence, and meaningful progress that carries onto the stage.",
  },
  {
    kind: "theme",
    title: "Professional artistry",
    description: "Reviewers recognize detailed training, energetic performances, and a clear passion for dance education.",
  },
  {
    kind: "theme",
    title: "Culture with heart",
    description: "Families value a welcoming place where Chinese dance traditions are shared with professionalism and joy.",
  },
];

const items: ReviewItem[] = [
  reviews[0], familyThemes[0], reviews[1], reviews[2], familyThemes[1],
  reviews[3], familyThemes[2], reviews[4], familyThemes[3],
];

const motionSlots: MotionSlot[] = [
  { x: 3, y: 5, width: 44, delay: -7, duration: 29, rotate: -1.3, direction: "left" },
  { x: 64, y: 4, width: 28, delay: -18, duration: 23, rotate: 1.8, direction: "top", align: "right" },
  { x: 51, y: 24, width: 43, delay: -3, duration: 31, rotate: .8, direction: "right" },
  { x: 69, y: 57, width: 25, delay: -13, duration: 26, rotate: -2.2, direction: "right", align: "right" },
  { x: 37, y: 67, width: 28, delay: -21, duration: 25, rotate: 1.2, direction: "bottom", align: "center" },
  { x: 6, y: 66, width: 30, delay: -2, duration: 27, rotate: -1.7, direction: "left" },
  { x: 4, y: 40, width: 27, delay: -16, duration: 24, rotate: 2.1, direction: "left" },
  { x: 36, y: 50, width: 27, delay: -9, duration: 28, rotate: -1, direction: "bottom", align: "center" },
  { x: 66, y: 79, width: 29, delay: -5, duration: 30, rotate: 1.5, direction: "bottom", align: "right" },
];

type ReviewCloudProps = {
  eyebrow: string;
  title: string;
  accent: string;
  description: string;
  tone?: "light" | "dark";
};

function FloatingReview({ item, index }: { item: ReviewItem; index: number }) {
  const slot = motionSlots[index];
  const style = {
    "--review-x": `${slot.x}%`,
    "--review-y": `${slot.y}%`,
    "--review-width": `${slot.width}%`,
    "--review-delay": `${slot.delay}s`,
    "--review-duration": `${slot.duration}s`,
    "--review-rotate": `${slot.rotate}deg`,
    "--review-mobile-delay": `${index * -18}s`,
    textAlign: slot.align ?? "left",
  } as CSSProperties;

  if (item.kind === "theme") {
    return (
      <article className={`kinetic-review kinetic-review-theme kinetic-review-from-${slot.direction}`} style={style}>
        <span>What families value</span>
        <h3>{item.title}</h3>
        <p>{item.description}</p>
      </article>
    );
  }

  return (
    <article className={`kinetic-review kinetic-review-quote kinetic-review-from-${slot.direction}`} style={style}>
      <span>Google review</span>
      <blockquote>{item.quote}</blockquote>
      <p>
        <a href={item.href} target="_blank" rel="noreferrer">{item.author}<span aria-hidden="true"> ↗</span></a>
        <small>{item.detail}</small>
      </p>
    </article>
  );
}

export function ReviewCloud({ eyebrow, title, accent, description, tone = "light" }: ReviewCloudProps) {
  return (
    <section className={`review-cloud review-cloud-${tone} section-space`}>
      <div className="page-shell review-cloud-heading">
        <div>
          <p className={`eyebrow ${tone === "dark" ? "eyebrow-light" : ""}`}>{eyebrow}</p>
          <h2 className="display-title">{title}<br /><em>{accent}</em></h2>
        </div>
        <p>{description}</p>
      </div>

      <div className="review-kinetic-stage" role="region" aria-label="Family reviews of Anna Dance Academy">
        <div className="review-orbit review-orbit-one" aria-hidden="true" />
        <div className="review-orbit review-orbit-two" aria-hidden="true" />
        {items.map((item, index) => (
          <FloatingReview item={item} index={index} key={item.kind === "review" ? item.author : item.title} />
        ))}
      </div>
    </section>
  );
}
