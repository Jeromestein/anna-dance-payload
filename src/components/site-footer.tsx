import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { SocialFollow } from "@/components/SocialFollow";
import { navigation } from "@/lib/site-data";
import type { SocialProfile } from "@/payload-types";

type SiteFooterProps = {
  socialProfiles?: SocialProfile | null;
};

export function SiteFooter({ socialProfiles }: SiteFooterProps) {
  return (
    <footer className="site-footer">
      <div className="footer-main page-shell">
        <div className="footer-brand">
          <Link href="/" className="wordmark wordmark-light">
            <BrandLogo />
          </Link>
          <p>Personalized, bilingual dance training rooted in Chinese classical and ethnic folk traditions for young dancers ages 2½ and up.</p>
        </div>

        <div className="footer-links">
          <span className="footer-label">Explore</span>
          {navigation.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}
          <Link href="/#faq">FAQ</Link>
        </div>

        <div className="footer-contact">
          <span className="footer-label">Visit & connect</span>
          <a
            href="https://www.google.com/maps/search/?api=1&query=19421+Sandy+Springs+Cir%2C+Lutz%2C+FL+33558"
            target="_blank"
            rel="noreferrer"
          >
            19421 Sandy Springs Cir, Lutz, FL 33558
          </a>
          <a href="mailto:annadanceacademy@gmail.com">annadanceacademy@gmail.com</a>
          <a href="tel:+17014009213">701-400-9213</a>
        </div>

        {socialProfiles ? (
          <div className="footer-social">
            <SocialFollow profiles={socialProfiles} variant="footer" />
          </div>
        ) : null}
      </div>
      <div className="footer-bottom page-shell">
        <span>© {new Date().getFullYear()} Anna Dance Academy</span>
        <div aria-label="Legal">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </div>
      </div>
    </footer>
  );
}
