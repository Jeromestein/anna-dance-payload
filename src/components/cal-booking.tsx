"use client";

import Cal, { getCalApi } from "@calcom/embed-react";
import { useEffect } from "react";

const calLink = "anna-dance/trial-class-consultation";
const namespace = "trial-class-consultation";

export function CalBooking() {
  useEffect(() => {
    void (async () => {
      const cal = await getCalApi({ namespace });
      cal("ui", { hideEventTypeDetails: false, layout: "month_view" });
    })();
  }, []);

  return (
    <div className="cal-booking-shell">
      <Cal
        namespace={namespace}
        calLink={calLink}
        style={{ width: "100%", height: "100%", overflow: "auto" }}
        config={{ layout: "month_view", useSlotsViewOnSmallScreen: "true" }}
      />
    </div>
  );
}
