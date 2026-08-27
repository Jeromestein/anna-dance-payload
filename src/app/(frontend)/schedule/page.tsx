import type { Metadata } from "next";
import Link from "next/link";
import { ArrowIcon } from "@/components/arrow-icon";
import { CalBooking } from "@/components/cal-booking";
import { schedule } from "@/lib/site-data";

export const metadata: Metadata = { title: "Schedule" };

export default function SchedulePage() {
  return (
    <>
      <section className="schedule-booking-page" id="book" aria-labelledby="schedule-booking-title">
        <div className="page-shell schedule-booking-heading">
          <div>
            <p className="eyebrow">Current availability</p>
            <h1 id="schedule-booking-title">Schedule a consultation</h1>
          </div>
          <p className="schedule-booking-copy">
            Choose an available time for a complimentary placement conversation. Questions? <a href="tel:+17014009213">701-400-9213</a>
          </p>
        </div>
        <div className="page-shell booking-frame schedule-booking-frame">
          <CalBooking />
          <p className="booking-fallback">
            Having trouble with the calendar? <a href="https://cal.com/anna-dance/trial-class-consultation" target="_blank" rel="noreferrer">Open the booking page <ArrowIcon /></a>
          </p>
        </div>
      </section>
      <section className="schedule-section section-space">
        <div className="page-shell schedule-layout">
          <aside className="schedule-note">
            <p className="eyebrow">Program rhythm</p>
            <h2>Current training format</h2>
            <p>Exact class times, term dates, lesson counts, and availability are shared for each registration period after placement. Level-Based Group Classes generally meet once each week for 60 minutes.</p>
            <Link href="#book" className="text-link">Request placement <ArrowIcon /></Link>
          </aside>
          <div className="schedule-table" role="region" aria-label="Program training format" tabIndex={0}>
            <div className="schedule-head"><span>Timing</span><span>Program</span><span>Session</span></div>
            {schedule.map((item) => (
              <div className="schedule-row" key={item.program}>
                <strong>{item.timing}</strong>
                <div><b>{item.program}</b><small>{item.note}</small></div>
                <span>{item.duration}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
