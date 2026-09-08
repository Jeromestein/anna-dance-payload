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
              <span>Area</span>
              <p>Tampa / Lutz Area</p>
            </div>
          </div>
          <ContactForm />
        </div>
      </div>
    </section>
  );
}
