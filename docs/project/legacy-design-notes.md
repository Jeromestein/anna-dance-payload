# Anna Dance Academy Design System

## 1. Purpose

This document defines the visual and responsive design direction for the Anna Dance Academy website. The experience should feel alive, caring, polished, and trustworthy while remaining clearly rooted in dance education rather than healthcare or corporate branding.

The design must solve three current problems:

1. Desktop navigation, labels, and supporting copy are often too small.
2. The mobile brand name is too small and lacks presence.
3. Mobile layouts leave too much unused space and stack too many cards vertically.

The overall direction is warm editorial minimalism: expressive photography, confident typography, soft color transitions, generous but efficient spacing, and rounded cards with clear information hierarchy.

## 2. Brand Translation

The supplied card reference uses deep purple and gold as its dark-card colors. For Anna Dance Academy, preserve the same hierarchy and interaction behavior but map those roles to the approved palette:

- Deep purple role → Deep Teal
- Gold accent role → Rose Pink or Soft Pink
- Medical professionalism → Professional dance education
- Clinical care → Personal attention, confidence, safety, and artistic growth

Do not introduce a separate purple-and-gold brand system. Use the current teal, lagoon blue, rose, mint, lilac, and ivory palette consistently.

## 3. Design Principles

### Warm and alive

- Use organic color transitions, expressive dance photography, and soft rounded forms.
- Favor a sense of movement without adding decorative clutter.
- Let photography and typography carry the emotional weight.

### Caring and professional

- Keep information easy to scan and actions easy to find.
- Use calm spacing, consistent alignment, and restrained motion.
- Avoid sharp corners, heavy shadows, glossy card effects, and excessive ornament.

### Readable at every size

- Small text must be the exception, never the default.
- Body copy should remain comfortable on both desktop and mobile.
- Decorative typography must not reduce clarity.

### Efficient on mobile

- Reduce empty vertical space before reducing font size.
- Use horizontal card rails for related cards instead of long vertical stacks.
- Keep the next card partially visible to communicate horizontal movement.

## 4. Color System

### Core palette

| Token | Value | Primary use |
| --- | --- | --- |
| Deep Teal | `#073F52` | Primary text, dark surfaces, fixed header |
| Teal Dark | `#08788E` | Dark gradients, emphasized sections |
| Lagoon Blue | `#0A93AB` | Decorative gradients and active accents |
| Aqua | `#59B3B8` | Soft visual accents and image overlays |
| Rose | `#C74783` | Primary actions and emphasized words |
| Rose Dark | `#A8326A` | Hover states and high-contrast rose text |
| Pink | `#DF6FA6` | Decorative highlights |
| Soft Pink | `#F2C5DB` | Highlights on dark surfaces |
| Mint | `#BCE1D3` | Soft card and section backgrounds |
| Mint Soft | `#DCEFE7` | Large low-contrast surfaces |
| Blush | `#F3DCE7` | Warm card backgrounds |
| Lavender | `#E8DCE9` | Secondary card backgrounds |
| Ivory | `#FAF8F5` | Default page and card background |
| Soft White | `#FFFFFF` | Forms and high-contrast surfaces |

### Color rules

- Deep Teal is the primary structural color.
- Rose is an accent, not the default background for entire sections.
- Lagoon Blue and Aqua should appear mainly in gradients, decorative areas, and image treatments.
- Mint, Blush, Lavender, and Ivory should create gentle alternation between content groups.
- Dark cards use Deep Teal with Soft White text and Soft Pink emphasis.
- Never place small white text directly on Lagoon Blue or Pink without a darker overlay.
- All text and interactive states must meet WCAG 2.2 AA contrast requirements.

## 5. Typography

### Font family

Use **Poppins** for all text, including display headings, navigation, body copy, labels, buttons, and card titles.

- Regular: 400
- Medium: 500
- Semibold: 600
- Bold: 700, used sparingly
- Editorial emphasis may use Poppins Italic, but not a separate serif family.

### Readability baseline

- Global body text: `1rem` minimum, line-height `1.7`
- Compact supporting copy: `0.95rem` minimum, line-height `1.65–1.75`
- Do not use text below `0.8rem` except for nonessential legal metadata.
- Avoid reducing type to make a layout fit. Adjust spacing or wrapping first.

### Desktop type scale

| Element | Size | Weight | Line height |
| --- | --- | --- | --- |
| Hero title | `clamp(4.75rem, 7.2vw, 7.5rem)` | 500–600 | `0.92–0.98` |
| Section title | `clamp(3rem, 4.6vw, 5rem)` | 500–600 | `1.02` |
| Card title | `1.55–1.8rem` | 600 | `1.15` |
| Body copy | `1rem–1.08rem` | 400 | `1.7` |
| Card body | `0.95–1rem` | 400 | `1.7` |
| Desktop navigation | `0.95–1rem` | 600 | `1.2` |
| Header brand name | `1.1–1.2rem` | 600 | `1.2` |
| Category label | `0.8rem` | 600–700 | `1.3` |
| Button label | `0.9–0.95rem` | 600 | `1.2` |

### Mobile type scale

| Element | Size | Weight | Line height |
| --- | --- | --- | --- |
| Hero title | `clamp(3.25rem, 14vw, 4.6rem)` | 500–600 | `0.95` |
| Section title | `clamp(2.5rem, 11vw, 3.6rem)` | 500–600 | `1.02` |
| Card title | `1.45–1.65rem` | 600 | `1.15` |
| Body copy | `1rem` | 400 | `1.7` |
| Card body | `0.95rem` | 400 | `1.7` |
| Mobile brand name | `clamp(1rem, 4.4vw, 1.1rem)` | 600 | `1.15` |
| Mobile menu links | `clamp(2.4rem, 11vw, 3.25rem)` | 500 | `1.1` |
| Category label | `0.8rem` | 600–700 | `1.3` |

### Labels and eyebrow text

- Use uppercase Poppins Semibold.
- Minimum size: `0.8rem`.
- Letter spacing: `0.12–0.16em`.
- Use Rose Dark on light backgrounds and Soft Pink on dark backgrounds.
- Do not use labels as the only source of important information.

## 6. Fixed Header

The Header is the only component allowed to use a liquid-glass treatment.

### Desktop

- Position: fixed, with `14–18px` space from the top and sides.
- Minimum height: `72px`.
- Horizontal padding: `24–30px`.
- Background: translucent Deep Teal or warm white, selected for reliable contrast over the current page.
- Backdrop blur: `18–24px`.
- Border: `1px solid rgba(255, 255, 255, 0.18)` on dark glass.
- Radius: `24–32px` or a restrained capsule shape.
- Shadow: soft and low opacity; never a heavy floating shadow.
- Navigation labels must be at least `0.95rem` and Semibold.
- The desktop brand name must be at least `1.1rem`.
- Keep navigation gaps between `28–36px`.
- Header CTA height: `46–50px`.

### Mobile

- Position: fixed, with `10–12px` space from the viewport edges.
- Minimum height: `64–68px`.
- Horizontal padding: `14–18px`.
- Brand mark: `40–44px` diameter.
- Brand name: at least `1rem`, Semibold, on one line.
- Hamburger tap target: at least `44 × 44px`.
- The expanded menu may fill the viewport, but its internal spacing should remain compact enough to avoid unnecessary scrolling on common phone heights.
- Use the same Deep Teal–Lagoon glass language as the collapsed Header.

### Header behavior

- Maintain readable contrast over both photography and light sections.
- Do not shrink the Header typography when scrolling.
- A subtle background-opacity increase on scroll is allowed.
- All Header actions require visible keyboard focus states.

## 7. Layout and Spacing

### Desktop

- Main content width: `min(1180px, calc(100vw - 48px))`.
- Section spacing: `96–120px` depending on content density.
- Related card grids: `14–16px` gap.
- Keep cards in the same group equal in height whenever practical.
- Prefer two or three balanced columns; avoid narrow four-column cards containing body copy.

### Mobile

- Page gutter: `16–18px`.
- Standard section spacing: `64–72px`.
- Compact section spacing: `48–56px`.
- Hero height should use content-aware sizing or `svh`; avoid fixed heights that create large empty areas.
- Keep important content within the first viewport whenever possible.
- Reduce oversized vertical margins before reducing typography.
- Allow visual sections and card rails to extend to the viewport edge while their text remains aligned to the page gutter.

## 8. Card System

Liquid glass must not be used on ordinary content cards.

### Standard content card

- Radius: approximately `28px`.
- Border: `1px solid rgba(130, 116, 142, 0.18)` or an equivalent low-contrast lavender-gray.
- Background: Ivory, Lavender, Mint, or `rgba(255, 252, 248, 0.62)`.
- Padding: `28–38px`.
- Relaxed editorial cards may use up to `42px` padding.
- Shadow at rest: none or extremely subtle.
- Each card should communicate one primary idea and expose one clear action.

### Large visual card

- Use for photography, faculty, studio stories, and featured programs.
- Radius: approximately `44px`.
- Clip images to the card boundary.
- Keep image crops consistent within the same group.
- Use a stable aspect ratio rather than arbitrary fixed heights.

### Dark feature card

- Background: Deep Teal, optionally with a subtle Teal Dark gradient.
- Primary text: Soft White.
- Supporting text: white at approximately `76%–82%` opacity.
- Emphasis: Soft Pink or Rose.
- Do not introduce gold or unrelated deep purple.

### Card typography

- Card title: Poppins Semibold 600, `1.55–1.8rem` desktop and `1.45–1.65rem` mobile.
- Card body: `0.95–1rem`, line-height `1.65–1.75`.
- Category label: approximately `0.8rem`, uppercase, with increased letter spacing.
- Avoid more than three text hierarchy levels inside one card.

### Icons and actions

- Place icons inside circular containers sized `46–62px`.
- Place arrow actions at the lower-right corner or directly after the final line of content.
- Avoid adding a second full-size button when an arrow action is sufficient.
- Arrow hover movement: `3–4px` maximum.
- All icon-only actions require an accessible label.

### Card interaction

- Interactive cards may move upward by a maximum of `5px` on hover.
- Add only a soft shadow on hover: approximately `0 18px 45px rgba(7, 63, 82, 0.10)`.
- Image zoom must not exceed `1.025`.
- Transition duration: `220–280ms` with a soft ease-out curve.
- Selected feature cards may transition to Deep Teal with Soft White text and Soft Pink emphasis.
- Mobile press state: `transform: scale(0.985)`.
- Use `:focus-visible` states that are at least as clear as hover states.
- Respect `prefers-reduced-motion` and remove nonessential transforms when enabled.

## 9. Mobile Horizontal Card Rails

Within the same Section, sibling cards must become a horizontal swipe rail on mobile instead of stacking vertically.

### Rail behavior

- Use `display: grid` with `grid-auto-flow: column` or a horizontal flex layout.
- Enable horizontal overflow and `scroll-snap-type: x mandatory`.
- Hide the visual scrollbar without disabling scrolling.
- Card gap: approximately `14px`.
- Add end padding so the final card does not touch the viewport edge.
- Preserve a visible preview of the next card.

### Card width

- Standard card: approximately `82vw`, maximum `360px`.
- Large faculty, location, or image card: approximately `84vw`, maximum `370px`.
- Each card uses `scroll-snap-align: start`.
- Do not center a single remaining card if doing so breaks alignment with the Section heading.

### Rail ergonomics

- Keep Section headings and optional “View all” links above the rail.
- The entire image-card surface may be interactive when there is a clear destination.
- Keyboard users must be able to reach every interactive card and action.
- Do not auto-scroll or continuously animate the rail.

## 10. Component Application

### Home class cards

- Use large visual cards with `44px` outer radius.
- Keep all class cards equal in height.
- On desktop, use a clean two-column grid with `16px` gaps.
- On mobile, use one horizontal rail with `82–84vw` cards and visible next-card preview.
- Keep a single arrow action in the lower-right corner.

### Faculty cards

- Use large portrait cards with `44px` radius and consistent image aspect ratios.
- Name and role must remain visible without relying on hover.
- On mobile, use an `84vw` horizontal rail instead of a vertical list.

### Values and testimonials

- Values may use standard `28px` cards rather than full-width narrow columns on mobile.
- Testimonials should use one clear quote per card.
- Dark feature versions use Deep Teal, Soft White, and Soft Pink.
- Mobile presentation should be horizontally swipeable when more than one item exists.

### Program list

- Desktop may preserve an editorial list if each row remains spacious and scannable.
- Mobile program items should become large cards in a horizontal rail.
- Keep age, title, summary, and one action only.
- Supporting bullet points should be limited or moved to the detail page.

### Schedule

- Desktop may remain a structured schedule table.
- Mobile schedule entries should become horizontally swipeable day or class cards when multiple entries appear in one group.
- Time, class name, age range, and action must remain visible at a glance.

### Contact form

- The form may use a standard `28px` card with a low-contrast border.
- Avoid glass effects.
- Inputs require at least `48px` tap height.
- Form labels must be at least `0.9rem` and remain visible above fields.

## 11. Buttons and Links

- Minimum interactive height: `46px` desktop and `48px` mobile.
- Primary button: Rose background with Soft White text.
- Primary hover: Rose Dark.
- Secondary action: text link with arrow and a restrained underline.
- Avoid multiple competing primary buttons in one card or content block.
- Provide visible `:focus-visible` outlines using Rose or Soft Pink with sufficient contrast.

## 12. Imagery

- Prefer photography with authentic movement, confident expression, and human warmth.
- Keep image saturation restrained enough to work with the teal and rose palette.
- Preserve natural skin tones.
- Avoid applying the same crop to all breakpoints; define purposeful mobile crops.
- Image overlays must protect text readability without making photography muddy.

## 13. Accessibility

- Meet WCAG 2.2 AA contrast for all body text, labels, controls, and navigation.
- Do not communicate state using color alone.
- Every interactive card must be keyboard reachable.
- Every icon-only action needs an accessible name.
- Maintain a visible focus indicator with at least `2px` effective thickness.
- Touch targets must be at least `44 × 44px`.
- Avoid continuous animation, autoplaying rails, or motion that interferes with reading.
- Respect `prefers-reduced-motion`.
- Horizontal rails must still work with keyboard, trackpad, touch, and assistive technology.

## 14. Responsive Acceptance Criteria

### Desktop

- Header navigation is comfortably readable at normal browser zoom.
- Brand name is visually balanced with the navigation and CTA.
- No essential body copy is smaller than `0.95rem`.
- Related cards align to a consistent grid with `14–16px` gaps.
- Card title, body, and action positions remain consistent across each group.

### Mobile

- The brand name remains at least `1rem` and fits on one line.
- The Header controls have `44px` minimum tap targets.
- Hero content uses the available viewport without excessive empty space.
- Related cards scroll horizontally with scroll snap.
- A partial next card is visible before the user begins scrolling.
- Standard cards stay near `82vw`; large visual cards stay near `84vw`.
- No horizontal page overflow occurs outside intentional card rails.
- Body text remains at least `1rem`; card body text remains at least `0.95rem`.

## 15. Implementation Checklist

- [ ] Replace mixed typefaces with Poppins across the entire site.
- [ ] Increase desktop Header brand, navigation, and CTA typography.
- [ ] Increase mobile brand name and mark size.
- [ ] Convert the Header to the only liquid-glass surface.
- [ ] Replace fixed mobile hero heights with content-aware or `svh` sizing.
- [ ] Establish `28px` standard and `44px` visual card radius tokens.
- [ ] Normalize card padding, borders, title sizes, and action placement.
- [ ] Convert related mobile card groups into scroll-snap rails.
- [ ] Preserve next-card preview and end padding in every rail.
- [ ] Add hover, press, focus, and reduced-motion states.
- [ ] Verify WCAG 2.2 AA contrast for every card variant.
- [ ] Test desktop, tablet, and mobile layouts at 200% text zoom.
