# Course Package Configuration

Date: September 24, 2026

Source: [舞蹈课程与费用汇总_2026-09-24.csv](./舞蹈课程与费用汇总_2026-09-24.csv), together with the decisions confirmed in this conversation.

This document records the agreed configuration. The database migration has been applied and isolated sandbox payment acceptance has passed. Production deployment and acceptance are tracked separately. See [implementation and rollout notes](./docs/operations/course-package-sales-20260924.md).

## Sales model

- Three categories: Group Class, Duet Class, and Solo Class.
- Nine individually identifiable course packages, each covering the full term's stated lesson count.
- Each purchase is for one student. Duet prices are also per student; there is no joint payment for two students.
- Charge the full package price once. The per-lesson rate is a reference, not a single-lesson purchase option or recurring subscription.
- Discounts change the amount payable, not the package's included lesson count.
- Use the identifiers below exactly, including capitalization. Group identifiers are `level-1`, `level-2`, and `level-3`.

## Course catalog

All times use the 24-hour clock and are afternoon or evening times. Rates and totals below reproduce the CSV. The CSV does not specify a currency; the existing website billing flow uses USD.

| Package ID | Category | Display label | Day | Start | End | Minutes per lesson | Reference rate per student | Lessons per term | Full-term price per student |
| --- | --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| level-1 | Group Class | level-1 | Saturday | 13:00 | 14:00 | 60 | 31 | 10 | 310 |
| level-2 | Group Class | level-2 | Saturday | 16:00 | 17:00 | 60 | 31 | 10 | 310 |
| level-3 | Group Class | level-3 | Monday | 17:00 | 18:00 | 60 | 31 | 10 | 310 |
| DUET-01 | Duet Class | Duet Class | Monday | 16:00 | 17:00 | 60 | 75 | 10 | 750 |
| DUET-02 | Duet Class | Duet Class | Friday | 17:30 | 18:30 | 60 | 75 | 9 | 675 |
| DUET-03 | Duet Class | Duet Class | Friday | 18:30 | 19:30 | 60 | 75 | 9 | 675 |
| DUET-04 | Duet Class | Duet Class | Saturday | 14:00 | 15:00 | 60 | 75 | 8 | 600 |
| SOLO-01 | Solo Class | Solo Class · 30 min | Friday | 16:30 | 17:00 | 30 | 40 | 9 | 360 |
| SOLO-02 | Solo Class | Solo Class · 60 min | Monday | 18:00 | 19:00 | 60 | 90 | 10 | 900 |

Source label mapping:

- `level-1`: 启蒙班.
- `level-2`: Level 班.
- `level-3`: 群舞比赛.
- `DUET-01` through `DUET-04`: 双人比赛.
- `SOLO-01` and `SOLO-02`: 单人比赛.

The nine listed package prices add up to **4,890**. This is a catalog reconciliation total, not a combined package or an individual student's amount due.

## Classes page

| Visitor state | Level-Based Group Classes | Competition Solo & Duet |
| --- | --- | --- |
| Signed out | Show only Book a Free Placement | Show only Book a Free Placement |
| Signed in | Show level-1, level-2, and level-3 | Show four Duet options and two Solo options |

- Show the day and time on each package button to distinguish the slots.
- Keep Book a Free Placement linked to `/schedule`.
- Enforce the login requirement on purchase pages and server actions as well as on button visibility.
- Course buttons link to authenticated `/classes/[packageId]` confirmation pages. Existing purchases redirect to their saved bill.

## Standard purchases from Classes

Clicking a package will open a confirmation page showing the selected course, day and time, included lesson count, student, and full-term price from the shared configuration.

| Payment choice | Intended flow | When lessons become available |
| --- | --- | --- |
| Pay Online | Create or reuse the student's unpaid order, then open Stripe Checkout for its saved amount | After verified successful payment |
| Pay in Cash | Create or reuse an unpaid cash order and show offline payment instructions | After an administrator confirms receipt |

- Choosing cash does not mark the order as paid.
- Cash is settled offline. No online discount calculation is needed for this path; staff records the settlement and confirms the associated package.
- Standard online purchases use the full-term catalog price.
- Repeated clicks should return the existing applicable unpaid order instead of creating duplicate charges.
- An existing paid purchase for the same student and term should show its purchase status instead of inviting an accidental duplicate purchase.
- Payment confirmation must not grant the same lesson entitlement twice.

## Special prices through Admin

Use the existing Admin payment-link and email workflow for individually agreed prices:

1. Select the student and one of the nine packages.
2. Populate the package's lesson count and default price.
3. Enter the final amount to collect.
4. Issue a student-specific payment link and use the existing email function to send it.
5. After successful payment, make the package's full lesson count available to that student.

Example: an Admin-issued `level-1` order for **280** still includes **10 lessons**. Its catalog price remains **310** for other purchases.

The Classes page does not need a discount field, coupon code, or promotion interface. Do not introduce a separate discount rules system. If a student already has an applicable Admin-issued unpaid order, reuse that order rather than generate another order at the catalog price.

## Configuration and database approach

Do not add a dedicated course-package table for this version. Maintain one shared application configuration keyed by the nine package IDs. Classes buttons, Admin package selection, and checkout must use that same configuration.

Each configuration entry contains:

- Package ID and category.
- Display name and level, where applicable.
- Weekday, start time, end time, and lesson duration.
- Full-term lesson count and catalog price.
- Currency for checkout.

Store the package identifier, sale identifier, immutable catalog snapshot, and cash preference on the existing order. Each package order has one existing course-credit item. Reuse existing order, student, amount, payment-status, lesson-count, and lesson-duration fields where possible. The legacy keys `group`, `duet`, `solo30`, and `solo60` may remain for historical compatibility; they do not uniquely identify the nine packages.

An issued order must retain the purchased package's name, schedule, lesson count, duration, and agreed amount. Later configuration edits must not rewrite existing purchases. Determine the payable amount on the server from the configuration or an authorized Admin-issued order, never from a customer-editable amount.

Track lessons against the purchased package/order item so that different Duet slots and Group levels remain distinguishable. Preserve historical bills and existing lesson records.

The CSV does not supply a term name, calendar start/end dates, or holiday exceptions. Do not infer those values. When later terms are introduced, distinguish them in purchase records rather than treating a previous term's purchase as the current one.

## Stripe approach

- Continue using the existing one-time Stripe Checkout flow, with the amount saved on the student's order.
- No advance manual creation of nine Stripe Products or fixed Payment Links is required.
- The current integration can supply product details and pricing when creating Checkout; Stripe may create Product and Price objects as part of that flow.
- Include the local order reference for reconciliation. The website's order and package configuration remain the source for course identity and lesson entitlements.
- Do not add a second discount mechanism inside Stripe Checkout for this version.
- Verify payment before making lessons available. Cash confirmation remains an administrator operation.
- Before changing an issued price or switching an active online payment to cash, reconcile the payment state and close obsolete payment sessions so the same order cannot be collected twice.
