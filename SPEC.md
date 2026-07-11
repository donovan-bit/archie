# Don Dashboard ("Archie") — Feature Spec

*Working document — updated as features get added or scoped. Build target: a real hosted web app (own database + hosting), not a Claude artifact, so it doesn't depend on staying embedded in a Claude.ai tab.*

---

## Phase 1 — Core Dashboard (build first)

- To-do/goals system — day / week / month / quarter / year, chunked by category, focus beacon (already prototyped as "The Bridge")
- Rollover system — unfinished items carry forward automatically (design TBD: fully automatic vs. review-and-carry step)
- Google Calendar — full read/write

---

## Phase 2 — Connections

### Google Ecosystem
| Service | What it does | Notes |
|---|---|---|
| Gmail | Inbox, triage, drafts | Already using triage rules |
| Google Calendar | Full read/write | Phase 1 |
| Google Drive | File search/reference | Same idea as OneDrive on the Microsoft side |
| Google Business Profile | Read/reply to reviews, profile insights, post updates | High value given existing review strategy |
| Search Console | Queries, clicks, impressions, position, index coverage | Useful given the ongoing indexing-lag tracking |
| Google Ads | Campaign performance, keywords, spend, conversions | Needs a developer token — same-week approval, not partner-gated |
| GA4 | Traffic, conversion events, audience behaviour | More useful day-to-day than Tag Manager itself |

*(Tag Manager considered — its API mainly manages containers/tags, not performance. GA4 covers the "how's the site doing" question better.)*

### Business
- **Xero** — revenue, invoices, reconciliation status
- **Cliniko (read-only)** — pull appointments to cross-reference tasks (e.g. "Clint Davis's PMP is due before his next visit"). *Needs confirming directly against Cliniko's API docs before assuming feasibility.*
- **Tyro/HealthPoint** — settlement tracking
- **Subscription audit** — recurring tool costs + renewal dates (OfficeHQ, Heidi, Lovable, PeptalkR, Fingerink, etc.) — also a natural place to track the dashboard's *own* running API costs

### Socials
| Platform | Draft → approve → publish | Comments/replies | Messages | Ad performance |
|---|---|---|---|---|
| Meta (FB + IG) | ✅ | ✅ | ✅ (needs Meta app review + business verification) | ✅ |
| YouTube | ✅ | ✅ | N/A — no DM equivalent on YouTube | Only via Google Ads (separate from YouTube API) |
| LinkedIn | ✅ (free tier is enough for this) | ❌ blocked behind enterprise-only partner program | ❌ not available to third parties at all | ❌ same partner-program blocker |

**LinkedIn note:** deprioritized per Don — account is only maintained for local SEO/citation info, not active management. Scope down to basic profile-info only; skip comment/message/ad monitoring entirely rather than chasing a partner-tier approval that isn't worth it here.

---

## Personal Finance
- Mortgage & expense tracking
- **Bank/credit card data** — Australia's Consumer Data Right (Open Banking) makes this genuinely safe: consent-based, revocable anytime from your own bank's app, currently read-only (no third party can move money). Never share actual bank login credentials directly with a custom app — the CDR flow never requires this.
  - Direct accreditation isn't realistic for a personal project — instead connect through an already-accredited provider (e.g. **Basiq**, an Australian open banking API). Their pricing is cheap per user (~$0.39/user/month cited), but plans require talking to their sales team and carry a **12-month minimum commitment** — more friction than anything else in this stack.
  - **Simpler option worth starting with:** periodic CSV/statement export from the bank, manually imported into the dashboard. No accreditation, no contract, less "live," but far lower friction for a family-scale budget. Revisit Basiq only if manual import becomes genuinely annoying.
- Insurance/recurring cost review — Archie can surface current costs and flag when it's worth shopping around; final comparisons/decisions sit with Don or a broker, not treated as financial advice

## Family Budget
- Shared household view of income/expenses across mortgage, bills, groceries, and discretionary spend
- Sits alongside (not replacing) the existing business financial view via Xero — kept as a separate, clearly-labelled section so personal and business numbers never blur together

## Health & Performance
- CrossFit programming pull-through — today's WOD + expected time commitment
- Nutrition/supplement tracker
- Injury/recovery log — given this year's CrossFit goals were lost to injury, a simple log could help catch the next one earlier

## Home & Family
- Shed/build project tracker — Ezibuilt correspondence, Form 15 compliance
- Family layer — kids' events, birthdays (ties to the "be a great dad" Year goal)
- Asset/vehicle maintenance reminders — company car, quad, dirt bike, mower

---

## Phase 3 — Voice ("Archie" layer)
- Speech-to-text (e.g. ElevenLabs Scribe) + text-to-speech (Flash/Multilingual)
- Wake-word activation via **openWakeWord** (free, open-source, runs locally — no cloud cost for the "always listening" part itself)
- Only post-wake-word audio gets sent to paid APIs — cost stays low even with always-on listening
- **Note:** build this phase last, once the rest is stable and it's clear what voice actually needs to do

---

## Estimated Costs
| Item | Est. cost |
|---|---|
| Claude Code | Included in existing subscription |
| Hosting + database | ~$0–20/month (Vercel/Supabase free tiers likely cover this scale) |
| Google APIs (Calendar, Drive, GBP, Search Console, Ads, GA4) | Free |
| Xero API | Free (already paying for Xero itself) |
| Voice (STT + TTS) | ~$5–10/month at personal usage scale |
| Wake-word detection | Free (openWakeWord) |
| **Total new spend, realistically** | **~$10–30/month** |

---

## Known Constraints
- The current Claude-artifact version of the task board only reliably saves while embedded inside a Claude.ai conversation page — not in a detached tab. This is the core reason to build a real hosted app rather than keep patching the artifact.
- Meta messaging access requires app review + business verification, plus a strict messaging-window policy on replying to contacts.
- Cliniko's API capability for this use case needs confirming directly — not yet verified.
- Financial/insurance "audit" features should surface information, not make the final call — Archie isn't a licensed adviser.

## Build Recommendation
- Build with the standard Claude Code model (included in subscription) rather than the temporary Fable access — save that for a genuinely hard problem if one comes up mid-build.
- Suggested order: **Phase 1 (dashboard + calendar) → Google ecosystem + Xero + Meta (most mature/self-serve) → Cliniko + remaining socials → personal finance/health trackers → voice.**
