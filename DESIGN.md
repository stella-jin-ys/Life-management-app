---
title: The Daylight Ledger
product: Life Management
platform: web
status: implemented
---

# Design System

## North Star

Life Management should feel like a quiet morning notebook rather than a performance dashboard. The interface makes progress tangible without urgency: generous paper-like surfaces, soft daylight color, editorial headings, and plainspoken encouragement turn daily tracking into a gentle act of noticing.

## Experience Principles

- Celebrate evidence, not streaks. Small wins receive the strongest narrative emphasis.
- Comfort before correction. Low-energy states are named without diagnosis or shame.
- Keep momentum legible. Every progress view pairs its measure with a humane next step.
- Mark simulated data honestly. Community percentages are always labeled as demo signals.
- Preserve calm at every size. Desktop uses a persistent rail; mobile becomes a focused single column.

## Color

| Token | Value | Use |
| --- | --- | --- |
| Canvas | `#f7f2e9` | Page background |
| Paper | `#fffaf3` | Cards and inset surfaces |
| Rail | `#efe6d8` | Desktop navigation |
| Ink | `#332638` | Primary text |
| Muted | `#71636e` | Supporting copy |
| Line | `#ded4c8` | Borders and separators |
| Coral | `#ef8e7d` | Warm action and highlight accent |
| Deep coral | `#a74642` | Strong action and focus outline |
| Peach | `#f7c6ae` | Selected and celebratory surfaces |
| Moss | `#879468` | Physical wellbeing progress |
| Lavender | `#c8b9d8` | Emotional comfort |
| Gold | `#d6a856` | Goal momentum |

Color never carries state alone; selected controls also use weight, borders, labels, or native semantics.

## Typography

- Display: Fraunces, 600–700. Used for the greeting, card titles, affirmations, and key numbers.
- Interface and body: Manrope, 400–700. Used for navigation, controls, labels, and explanatory text.
- Fallbacks: Georgia for display; system sans-serif for interface text.
- Tone: editorial hierarchy with compact, readable supporting copy. Avoid all-caps except short eyebrow labels.

## Shape, Spacing, and Depth

- Primary card radius: `18px`.
- Compact control and inset radius: `13–14px`.
- Pills and progress tracks: `999px`.
- Card shadow: `0 18px 50px rgb(78 59 66 / 10%)`.
- Desktop rail: fixed at `280px`; dashboard content begins after the rail.
- Content spacing is generous and consistent, using a loose 4px-derived rhythm.

## Components

### Navigation

Desktop keeps the primary destinations and upcoming features in a fixed left rail. Upcoming items include Tasks, Finance, Study, Workout, Sleeping, Diary, and Settings; they are visibly disabled and labeled “Coming soon.” Below `960px`, navigation moves into a menu opened from the mobile header.

### Hero and Mood Check-in

The hero establishes the day with a personal greeting and abstract daylight mark. Mood choices are real buttons with visible pressed state and a supporting sentence, not decorative tags.

### Highlights

Daily wins read like a short evidence journal. Each entry combines time, the user’s own words, and a specific local compliment. The add action supports empty-input recovery.

### Low Battery

Feelings are selectable pills. The meter, percentage, demo label, and calming affirmation change together. Language remains validating and avoids clinical claims.

### Diet & Health

The ring gives one summary value while every metric retains its own label, quantity, and accessible progress value. Coral, moss, lavender, and gold differentiate metrics without replacing text.

### Goals

Milestones use checkbox semantics. Completion percentage and the next incomplete milestone update together so progress always points forward.

## Motion and Interaction

- Feedback is restrained: short `300–420ms` progress transforms and a 1px pressed movement.
- Progress animation uses `transform: scaleX()` from the left to avoid layout work.
- Keyboard focus uses a 3px deep-coral outline with a 3px offset.
- Navigation scroll is deliberate; document-level smooth scrolling is disabled for predictable capture and accessibility.

## Responsive Behavior

- `960px` and wider: fixed 280px rail and multi-column dashboard.
- `768–959px`: mobile header and responsive dashboard cards.
- Below `768px`: single-column reading order, full-width controls, and reduced decorative overlap.

## Content Guidance

Use warm, direct sentences that acknowledge effort without exaggerating it. Prefer “You made room for yourself” over achievement language. Never present demo community data as population research, and never frame the product as medical care.
