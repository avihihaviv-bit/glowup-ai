# GLOWUP AI development checklist

Legend: ✅ implemented and tested · 🟡 partial · ⚙️ needs external configuration · ⬜ not started

Last updated after: Phase 6 (progress center: weekly report, habit heatmap, scan history, photo quality coach).

## Blue redesign roadmap
| Phase | Status |
|---|---|
| 1. Design system (blue/white, Inter + Heebo), collapsible sidebar, top bar (date, streak, level, notifications), dashboard (hero scan card, score with calculation breakdown, today's checklist with importance, smart recommendation, tip of the day, routine, recent analysis, saved products, timeline, customizable widgets) | ✅ |
| 2. Face scan: guided front/left/right capture, in-browser 2D landmarks (MediaPipe), landmark overlay and labeled 3D approximation (Three.js), 14 analysis cards, Face Profile Card export, scan comparison | ✅ (3D view is a labeled approximation from 2D landmarks; the 14 AI cards need ANTHROPIC_API_KEY, otherwise only on-device measurements are shown) |
| 3. Skin (4 areas), hair (4 angles), Hairstyle Studio with real image generation, grooming, debloat, oral care, fragrance | ✅ (Hairstyle Studio preview ⚙️ needs OPENAI_API_KEY; skin scan needs ANTHROPIC_API_KEY) |
| 4. 350+ tip library with evidence labels and verified sources, search/filters/favorites | ✅ 350 tips (250 daily + 100 outing), every "evidence" tip links a verified source |
| 5. Outing Mode, product scanner (Open Beauty Facts), outfit studio, barber brief, morning reset, weather (Open-Meteo) | ✅ (product label reading ⚙️ needs ANTHROPIC_API_KEY; database lookup and weather work without a key) |
| 6. Progress center, heatmap, weekly report (PNG export), scan history, photo quality coach (on-device), polish | ✅ |

User-entered body measurements (weight, measured body-fat % for adults, circumferences) with trend chart: ✅. Nothing is estimated from photos and there are no weight targets.

## Foundation
| Item | Status | Notes |
|---|---|---|
| Design system (#09090D / #14141C / #9865FF / #8BFF9B, glass cards, dark default) | ✅ | Light theme still available in Settings |
| Responsive shell: sidebar on desktop, bottom nav on mobile | ✅ | Mobile bar: Home, My Concerns, Coach, Progress, More |
| Hebrew RTL + English LTR with language switcher | 🟡 | Navigation, onboarding, My Concerns, priorities and the settings language card are translated. Dashboard, plan, face, hair, skin, fitness, style, coach and progress screens (and the built-in plan/task library and demo content) are still Hebrew only. AI replies follow the selected language. |
| Skeleton loading states | 🟡 | Image placeholders only; most screens use spinners |
| Local-first persistence (localStorage + IndexedDB for photos) | ✅ | Versioned store with migration from v1 |
| Supabase auth / database / storage / RLS | ⬜ ⚙️ | Needs a Supabase project. The "Log in" button currently explains this and offers restore from a backup file |
| API rate limits, duplicate-submission protection | ⬜ | Buttons disable while loading, but there is no server-side rate limiting yet |

## Onboarding (7 screens)
| Item | Status |
|---|---|
| Welcome + Get Started + Log in (restore from backup) | ✅ |
| Personal info: name, date of birth, exact age in years and months, height, units, language, country, optional growth chart category with explanation | ✅ |
| Goals (12 options) | ✅ |
| My Concerns entry with free text, category, optional photo and consent | ✅ |
| Lifestyle (sleep, water, exercise, gym experience, equipment, hair/skin routine, diet, restrictions), all skippable | ✅ |
| Initial scan choices with photo guidance (face, hair, skin, posture; body marked "coming soon") | ✅ |
| Personalized plan built from the entered data only | ✅ |
| Previous height measurements | ⬜ (belongs to the Growth module) |

## Modules
| Module | Status | Notes |
|---|---|---|
| Dashboard | 🟡 | Has score, tasks, weekly chart, stats and **Top 3 priorities** (editable). Sleep/water/training tiles exist as stats; no dedicated widgets yet |
| My Concerns | ✅ ⚙️ | Create, per-concern analysis (10 required sections), status, progress log, follow-up chat, tasks to Today. Real analysis needs `ANTHROPIC_API_KEY`; without it, clearly labeled category-level guidance |
| Smart Priority Engine | 🟡 | Rule-based (goals, open concerns, data gaps, recent activity). Not yet AI-ranked. User override works |
| Face analysis | 🟡 ⚙️ | Front photo only. No profile photos, under-eye / "Itachi lines" education, puffiness section, or hairline analysis yet |
| Skin | 🟡 ⚙️ | Routine builder and product list. No multi-area photos, product scanner, or acne library |
| Hair | 🟡 ⚙️ | Analysis, gallery, favorites, tried-cuts log. No multi-angle photos, haircut simulator, or product finder |
| Body + interactive muscle map | ⬜ | |
| Training generator + log | 🟡 | Workout log, strength chart and level-based sample plans. No personalized generator |
| Posture coach | 🟡 | Routine + self-rating. No photo analysis or reminders |
| Height & growth tracker | ⬜ | Needs licensed/verified reference chart data (CDC or WHO) |
| Nutrition intelligence / meal builder | ⬜ | Needs a verified food database |
| Debloat intelligence | ⬜ | |
| AI coach | 🟡 ⚙️ | Streaming, knows profile and progress. No persistent, user-editable memory yet |
| XP, levels, streaks | 🟡 | Levels and XP exist (7 levels with different names than the spec). No weekly challenges or achievements |
| Video academy | ⬜ | Must use verified links only |
| Style studio | 🟡 ⚙️ | Outfit analysis. No wardrobe or saved outfits |
| Smart progress | 🟡 | Charts, streaks, photo comparison |
| Settings & privacy | 🟡 | Export, delete photos/all data, language, theme. No account deletion (no accounts), notification settings, or minor-specific consent flow beyond a notice |

## Photo ratings (personal mode)
Face (overall, potential, jawline, cheekbones, skin, grooming, masculinity/femininity), hair and body ratings with a note and one tip per score, photo-quality badge, score trend across scans and share. Needs real AI, 18+ only, and the "personal mode" switch in Settings (off by default). Demo mode never shows scores. Verified: age gate (client and server), switch gating, tile rendering and trend with sample data. **Not verified with real AI output** (no API key available). Body ratings never estimate body fat, weight, muscle mass or strength.

## Safety rules enforced
No ancestry/age/health prediction from photos, no diagnosis, no body-fat estimates, no extreme diets, no XP for appearance or weight. Numeric photo ratings only for adults who enabled personal mode.

## Verified by automated browser test (mobile viewport)
Onboarding in English and Hebrew, exact-age calculation, form validation, concern creation and demo analysis, status change, progress logging, priorities and manual override, RTL/LTR switching with persistence after reload, no horizontal overflow, no console errors. Real AI calls are **not** tested end to end (no API key available).
