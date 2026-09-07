# Life Management App — Final Design

A personal wellbeing platform that helps users notice and hold onto positive moments, find comfort in shared feelings, track physical health gently, and stay motivated toward goals — alongside everyday practical tracking (tasks, study, workouts, sleep, finances, diary).

Reference implementation: [stella-jin-ys/Life-management-app](https://github.com/stella-jin-ys/Life-management-app)

---

## 1. Architecture

The reference repo's `PRODUCT.md` (source of truth) describes the current build as **a local prototype with authored demo data and local UI state** — not a live backend yet. `README.md` describes an aspirational hosted architecture; treat that as the target, not the current state.

| Layer | Current (prototype) | Target (per README) |
|---|---|---|
| Frontend | React + Vite | React + Vite |
| Data & auth | Local UI state, demo data | Supabase Postgres + Auth + Row Level Security |
| Highlights compliments | Deterministic local phrase bank | OpenAI generation, deterministic fallback |
| Low Battery data | Demo community signal (not real research) | Real aggregated check-ins, hidden until 10+ exist (privacy floor) |
| Testing | — | Playwright e2e, `test:functions`, `test:db` |

**Environment note:** this session can read the repo's docs but cannot clone or run it (no network access, no GitHub tree browsing). Hand the repo off to an environment that can actually check it out (e.g. Claude Code) for implementation.

---

## 2. Design system — "Daylight Ledger" (adjusted)

Typography: **Fraunces** (600/700) for greetings, card titles, affirmations, and key numbers. **Manrope** (400–700) for body, labels, nav, buttons. Fallback: Georgia (serif) / system sans.

Radius: 18px cards · 13–14px compact controls/inputs · 999px pills and progress bars.
Shadow: `0 18px 50px rgba(60,70,55,0.10)` on Paper cards.
Desktop nav rail: fixed width (280px in the source spec; scaled to ~190px in these preview mockups for chat width).

### Color tokens

| Token | Original (repo) | **Adjusted (this session)** | Use |
|---|---|---|---|
| Canvas | `#f7f2e9` (beige) | **`#e9f2e6`** (mint) | Page background |
| Rail | `#efe6d8` | **`#dcebd7`** | Sidebar background |
| Line | `#ded4c8` | **`#d3ddd0`** | Borders, dividers, track backgrounds |
| Paper | `#fffaf3` | **`#fbfefa`** | Card surfaces |
| Ink | `#332638` | unchanged | Primary text |
| Muted | `#71636e` | unchanged | Secondary text |
| Coral | `#ef8e7d` | unchanged | Highlights accent |
| Deep coral | `#a74642` | unchanged | Primary buttons, focus states |
| Peach | `#f7c6ae` | unchanged | Celebratory / selected surfaces |
| Moss | `#879468` | unchanged | Physical wellbeing (Diet, Workout, Sleeping) |
| Lavender | `#c8b9d8` | unchanged | Emotional comfort (Low Battery) |
| Gold | `#d6a856` | unchanged | Goal momentum |

*Canvas/Rail/Line were changed at the user's request for a more energetic feel; this diverges from the repo's intentionally calm "quiet morning notebook" brief — worth a final gut-check before shipping.*

---

## 3. Navigation

Flat list, sorted by logging frequency (no section headers):

Dashboard · Highlights · Diet · Sleeping · Diary · Tasks · Study · Workout · Goals · Finance · — divider — · Settings

*Open question: Low Battery is intentionally **not** in the sidebar (dashboard-access only), per explicit decision — though it's one of the four core modules in the reference repo's own scope. Confirm this is still wanted.*

---

## 4. Dashboard

Bento-style grid: Highlights is a large 2×2 tile; the rest are compact tiles. Includes a daily mood check-in row above the grid (smile / neutral / sad / cloud-rain icons).

---

## 5. Core modules

### Highlights — "Your garden"
- Log a daily win → instantly paired with a compliment from a curated phrase bank (deterministic, not live AI — matches prototype scope)
- Each entry visualized as a **flower planted in a garden** (chosen over stars-in-sky and leaves-on-plant alternatives)
- **Everyday log streak reward**: current streak count, 7-day dot tracker, progress toward a milestone reward ("2 days to a rare bloom")
- Icon: `ti-sparkles`, accent Coral/Deep coral

### Low Battery
- User selects a feeling; app shows a **demo** "% of people feel this too" figure, clearly labeled as a demo signal (not real research)
- Calming affirmations
- Icon: `ti-heart-handshake` (chosen after two earlier iterations — battery icon, then rain-cloud — for being the most direct representation of shared empathy)
- Accent: Lavender

### Diet
- General food log (no exact meal/time labels required) — e.g. "Oatmeal, eggs, greens, water"
- Paired with a short **AI encouragement/suggestion**, not a review or score (e.g. "Nice balance today")
- Logged content is structured for later AI wellbeing analysis, not point-in-time judgment
- Icon: `ti-apple`, accent Moss

### Goals
- **No progress bar.** A short achievement list instead — each goal marked achieved (filled check) or open (dashed circle)
- Purpose is a sense of accomplishment, not percentage tracking
- Icon: `ti-target-arrow`, accent Gold

---

## 6. Supporting modules

| Module | Behavior | Visualization |
|---|---|---|
| Tasks | Simple daily checklist | Count + thin progress bar |
| Study | **Free-text log of what was studied** (e.g. "UI design"), not time tracked | Logged text only |
| Workout | Logged **by day** | 7-day bar chart, today highlighted in Moss; rest days shown as thin bars |
| Sleeping | Logged by day, compared to weekly average | 7-day **line graph** against a dashed average line — nights above average filled Moss, below average shown in a muted (non-alarming) tone, today's point ringed and enlarged |
| Diary | Free-form daily journal | Not yet designed in detail |
| Finance | Basic tracking | Not yet designed in detail |
| Settings | Account/app preferences | Not yet designed in detail |

---

## 7. Open items for next round

- Confirm Low Battery's sidebar placement (see §3)
- Diary, Finance, and Settings pages still need their own mockups
- Decide whether to keep the energetic mint Canvas or revert toward the repo's calmer original palette
- Full Highlights/Diet/Goals page-level mockups (beyond the dashboard tiles) still need the Daylight Ledger reskin applied — only the dashboard has been fully reskinned
- Hand off to an environment with repo/network access (e.g. Claude Code) to reconcile this design against the actual `src/` components before implementation begins
