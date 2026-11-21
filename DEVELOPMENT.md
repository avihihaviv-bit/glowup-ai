# GLOWUP AI development checklist

Legend: ✅ implemented and tested · 🟡 partial · ⚙️ needs external configuration · ⬜ not started

Last updated after: foundation + onboarding + My Concerns + priorities (phases 2-4 of the master prompt).

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

## Safety rules enforced
No attractiveness/PSL/beauty scores, no ancestry/age/health prediction from photos, no diagnosis, no body-fat estimates, no extreme diets, no XP for appearance or weight.

## Verified by automated browser test (mobile viewport)
Onboarding in English and Hebrew, exact-age calculation, form validation, concern creation and demo analysis, status change, progress logging, priorities and manual override, RTL/LTR switching with persistence after reload, no horizontal overflow, no console errors. Real AI calls are **not** tested end to end (no API key available).
