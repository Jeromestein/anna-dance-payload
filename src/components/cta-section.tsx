import Link from "next/link";
import { ArrowIcon } from "./arrow-icon";

export function CtaSection() {
  return (
    <section className="cta-section">
      <div className="page-shell cta-inner">
        <p className="eyebrow eyebrow-light">Find the right starting point</p>
        <h2>Every dancer&apos;s path begins with a conversation.</h2>
        <p>Tell us about your dancer&apos;s age, experience, goals, and availability. A teacher will help recommend the most suitable current class.</p>
        <Link href="/schedule#book" className="button button-light">Request placement <ArrowIcon /></Link>
      </div>
    </section>
  );
}
