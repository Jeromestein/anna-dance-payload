import type { Metadata } from "next";
import { ContactForm } from "@/components/contact-form";
import "./contact.css";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <section className="contact-section">
      <div className="page-shell">
        <header className="contact-intro">
          <div>
            <p className="eyebrow">Let&apos;s connect</p>
            <h1>We’d love to hear from you.</h1>
          </div>
          <p>
            Have a question about classes, placement, or the studio? Send us a
            note and our team will be happy to help.
          </p>
        </header>
        <div className="contact-grid">
          <div className="contact-details">
            <p className="eyebrow">Contact details</p>
            <div><span>Email</span><a href="mailto:annadanceacademy@gmail.com">annadanceacademy@gmail.com</a></div>
            <div><span>Phone</span><a href="tel:+17014009213">701-400-9213</a></div>
            <div>
              <span>Studio</span>
              <a
                href="https://www.google.com/maps/search/?api=1&query=19421+Sandy+Springs+Cir%2C+Lutz%2C+FL+33558"
                target="_blank"
                rel="noreferrer"
              >
                19421 Sandy Springs Cir, Lutz, FL 33558
              </a>
            </div>
            <section id="studio-map" className="contact-map-card" aria-labelledby="studio-map-title">
              <div className="contact-map-copy">
                <p id="studio-map-title" className="contact-map-label">Map &amp; directions</p>
                <a
                  href="https://www.google.com/maps/search/?api=1&query=19421+Sandy+Springs+Cir%2C+Lutz%2C+FL+33558"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Open the studio location in Google Maps"
                >
                  Directions <span aria-hidden="true">↗</span>
                </a>
              </div>
              <div className="contact-map-frame">
                <iframe
                  src="https://www.google.com/maps?q=19421%20Sandy%20Springs%20Cir%2C%20Lutz%2C%20FL%2033558&amp;output=embed"
                  title="Google Map showing Anna Dance Academy at 19421 Sandy Springs Circle in Lutz, Florida"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                />
              </div>
            </section>
          </div>
          <ContactForm />
        </div>
      </div>
    </section>
  );
}
