"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function FloatingBookingButton() {
  const pathname = usePathname();

  if (pathname === "/login" || pathname === "/account" || pathname.startsWith("/auth/") || pathname.startsWith("/admin/")) {
    return null;
  }

  return (
    <Link
      href="/schedule"
      className="floating-booking-button"
      aria-label="View class schedule"
    >
      <span className="floating-booking-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="21" height="21" fill="none">
          <path d="M7 3v3M17 3v3M4.5 9h15M6.5 5h11a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="m9.3 14.2 1.7 1.7 3.9-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="floating-booking-copy">
        <strong>Book a consultation</strong>
        <small>Ages 2.5+ · Teacher-guided</small>
      </span>
      <span className="floating-booking-arrow" aria-hidden="true">→</span>
    </Link>
  );
}
