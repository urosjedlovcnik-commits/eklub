# eKlub — Claude Code Handoff

**Purpose:** Complete context so Claude Code (or any new agent) can continue work without rediscovering tribal knowledge.

**Last updated:** 2026-10-29  
**Primary language for UI + commits:** Slovenian  
**Repo:** https://github.com/urosjedlovcnik-commits/eklub  
**Branch:** `main` (auto-deploy)  
**Production:** https://eklub.vercel.app  

---

## 1. What this product is

**eKlub** is an admin + attendance system for **Plavalni klub Ljubljana (PKL)** adult swimming programs.

| Surface | URL path | Role |
|--------|----------|------|
| Attendance calendar | `/` (`index.html`) | Mark who attended which training slot |
| Trainer login | `/login.html` | Trainers (Supabase Auth) |
| Admin login | `/admin-login.html` | Club admin (Vercel API session) |
| Admin app | `/admin.html` | Swimmers, terms, seasons, trainers, **finance**, mailing, CSV |
| Public swimmers list | `/swimmers-list.html` | Directory-style list |

**Owner / admin contact:** `uros.jedlovcnik@gmail.com`

---

## 2. Stack & architecture

### 2.1 Frontend (no build step)

- Vanilla **HTML / CSS / JS** (no React, no bundler, no TypeScript).
- CDN: Supabase JS v2, pdfMake (admin PDF).
- Main files:
  - `admin.html` + **`admin.js` (~680KB — the brain of the product)**
  - `index.html` + `script.js` (calendar / attendance)
  - `style.css`
  - `config.js` — Supabase URL + anon key + helpers
  - `auth.js`, `trainer-auth.js`, `change-password.js`

### 2.2 Backend

- **Supabase Postgres** (project ref: `tizjimlwfkoniixbetgr`)
  - URL: `https://tizjimlwfkoniixbetgr.supabase.co`
  - Client uses **anon key** from `config.js` (public by design).
  - **RLS is enabled** on tables; many policies still allow broad `anon` access (legacy). See `SECURITY.md`, `SQL/phase1_*.sql`, `SQL/phase2_rls_security.sql`.
- **Vercel serverless** under `api/`:
  - `api/admin-login.js` — email/password → signed session token
  - `api/admin-verify.js` — verify token
  - `api/_lib/session.js` — HMAC session helpers
- Env vars (Vercel): `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`  
  Template: `.env.example` / `VERCEL_ENV.md`  
  **Do not commit real secrets.** Rotate anything that was ever committed in docs.

### 2.3 Deploy

- GitHub `main` → Vercel production.
- Workspace rule (`.cursor/rules/auto-push-github.mdc`): after meaningful code changes → **commit in Slovenian** + **`git push origin main`**, report hash + repo URL.
- Git identity historically: `urosjedlovcnik-commits` / `uros.jedlovcnik@gmail.com` (use inline `-c` if needed; never rewrite global git config).

### 2.4 Local / Cursor notes

- Windows paths; PowerShell — **no bash heredocs**; use `git commit -m "..."`.
- Sandbox often needs `required_permissions: ["all"]` for git.
- Folders `Backup/`, `Good version/` are gitignored / legacy; ignore them.

---

## 3. Admin app map (`admin.html` sections)

| Section id | UI label | What it does |
|------------|----------|--------------|
| `overview-section` | Pregled | KPIs for selected month |
| `swimmers-section` | Plavalci | CRUD swimmers, assign terms, attendance summary toggle **Vsi / OLY** |
| `terms-section` | Termini | Training slots by weekday |
| `seasons-section` | Sezone | Season date ranges, fee factors, invoice offset settings |
| `trainers-section` | Trenerji | Trainers, rates, hours, notes, absences |
| `finance-section` | Finance | **Core money UI** — fees, membership, accounting PDF, season report |
| `mailing-section` | Mailing | Email lists (swimmers / OLY / trainers / by term) |
| `csv-section` | CSV | Import/export |

Global **season filter** in the admin top bar drives almost all finance and assignment logic (`getAdminSeasonFilterId()`).

---

## 4. Domain model (business rules)

### 4.1 Seasons

- Table: `seasons` (`date_from`, `date_to`, name like `2026/2027`).
- Terms (`terms.season_id`) belong to a season.
- Current working season in production conversations: **2026/27**, typically **Sept → June**.

### 4.2 Payment plans (`swimmer_season_billing.payment_plan`)

| Value | Meaning | Billing months (relative to season start) |
|-------|---------|-------------------------------------------|
| `monthly` | Monthly fee | Every month in season (from billing start) |
| `two_installments` | 2 installments | **billing1** = season start month; **billing2** = +4 months (e.g. Sept + Jan) |
| `lump_sum` | One payment | **billing1** only |

**Important:** Club “invoice offset” / bank payment slips are **not** what drives the monthly fee UI.  
`getSeasonBillingSchedule(season)` uses **season start month** as first billing month (not `first_invoice_offset_months`). Offset may still exist in season settings / localStorage for other notes.

### 4.3 Membership (`članarina`)

- Default **30 €** (`MEMBERSHIP_FEE_EUR` / settings).
- Stored per season on `swimmer_season_billing`:
  - `membership_charged_month` / `membership_charged_year`
  - `NULL` = not charged this season
- **Checkbox charges the currently viewed month** (fees table or accounting report).  
  Do **not** auto-force September anymore (changed 2026-10-29).
- **OLY never pays membership** (UI + cleanup when OLY is set).

### 4.4 OLY

- Flag on `swimmer_monthly_fees.is_oly` (propagated for remaining season months when toggled).
- Fee shown as **0 €**; contributes **40 €/month** in finance projections (`OLY_MONTHLY_CONTRIBUTION_EUR`).
- Max **15** OLY swimmers.
- Blue row highlight in fees table; separate attendance summary tab.

### 4.5 Discounts

- Per month on `swimmer_monthly_fees`: `discount`, `discount_is_percent`.
- Fees UI: € or % toggle.
- **Accounting PDF:** final net fee only (no discount column).

### 4.6 Late start / billing start

- `billing_start_month` / `billing_start_year` on `swimmer_season_billing`.
- Swimmer only enters billing from that month; membership often aligned to that month.

### 4.7 Billing-only persons (`billing_only`)

- People who **pay** (club / third party) but have **no training terms**.
- Column: `swimmer_season_billing.billing_only`.
- Migration: `SQL/add_swimmer_billing_only.sql` (already applied on prod).
- UI: Finance → Mesečne pristojbine → **"+ Oseba za obračun"**.
  - Existing person or new person
  - Choose **month** + **fee amount**
  - Sets `billing_only`, payment plan, optional late `billing_start_*`, writes fee row, jumps finance month to that month
- Orange styling / badge `obračun`; PDF marks with `*`.
- Included via `isSwimmerInSeasonBillingList()` = has terms in season **OR** `billing_only`.

### 4.8 Half-month factor

- Season start/end fee factors (`SQL/add_season_fee_factors.sql`).
- **Half fee applies to monthly payers only**; lump / 2× keep full installment amounts.
- Button “Uporabi 1/2 samo za mesečne”.

### 4.9 Default fee tariff (PKL 2026/27)

Configured in `admin.js` (`defaultFeeSettings`) — monthly / installment / lump by 1× / 2× / 3× terms per week. Changing payment plan auto-applies tariff amounts for billing months.

---

## 5. Finance / accounting PDF (critical recent behavior)

### 5.1 Where to edit fees

**Finance → Mesečne pristojbine** (not the accounting editor amounts).  
Accounting report / PDF **read** fee + membership state.

### 5.2 Who appears on the PDF

`filterAccountingRowsForExport`:

- Include if **net training fee > 0**, **OR**
- **Membership charged in that month** (even if fee is 0 — “samo članarina”).

Exclude OLY from fee rows; people with neither fee nor membership stay out.

### 5.3 Sort order on PDF / report

1. Group by payment plan: monthly → two_installments → lump_sum.
2. Within group: saved order from `accounting_report_swimmer_order` (season-scoped).
3. IDs not in saved order: append alphabetically (within group).
4. **Then:** anyone **not on the previous calendar month’s real export set** is moved to the **bottom of their payment-plan group**.

**Previous-month membership for ordering** (`getAccountingExportSwimmerIdSet`):

- Uses **stored** `swimmer_monthly_fees` with net > 0 after discount, **or** membership charged that month.
- Does **not** invent default tariff fees (that bug kept Sara/Juš/Gregor mid-list).

Example Oct 2026 (verified in DB): first-timers vs Sept → bottom:

- Sara Breznikar, Juš Gašparič, Gregor Plevelj (fees appear in Oct)
- Milenko Bursač, Marko Jermaniš (membership only in Oct)

### 5.4 Returning swimmers

- `isReturningSwimmer` — was in a previous season (blue / ✓ in PDF).
- Visual only once saved order + previous-month rule apply; do not re-partition returning-first when a saved order exists.

### 5.5 Key functions (all in `admin.js`)

| Function | Role |
|----------|------|
| `isSwimmerInSeasonBillingList` | Terms or billing_only |
| `getSeasonBillingSchedule` | billing1 / billing2 |
| `shouldIncludeSwimmerInBillingMonth` | Plan + late start |
| `updateSwimmerMembershipFee` | Membership = **viewed month** |
| `buildAccountingReportRows` | Fetch + order + previous-month append |
| `filterAccountingRowsForExport` | Fee>0 or membership |
| `getAccountingExportSwimmerIdSet` | Real prior-month IDs |
| `reorderAccountingRowsByPreviousMonth` | Move first-timers to bottom |
| `downloadAccountingReportPdf` | pdfMake landscape PDF |
| `openAddBillingPersonModal` / `confirmAddBillingPerson` | Billing-only add flow |
| `refreshSwimmerFees` | Fees table (+ % attendance column) |

### 5.6 Attendance % on fees table

Column **% obiska** for the fees’ month (`loadAttendanceForMonth` + `calculateSwimmerSummaryData`). Click opens attendance detail modal.

---

## 6. Database tables (high level)

| Table | Purpose |
|-------|---------|
| `swimmers` | People (`terms` uuid[], contact, soft delete `is_deleted`) |
| `terms` | Weekly slots + date range + `season_id` |
| `seasons` | Season metadata / fee factors |
| `attendance` | Per date/term/swimmer presence |
| `term_status` | Cancelled / inactive days |
| `swimmer_term_assignments` | Assignment history with dates |
| `swimmer_monthly_fees` | Per month: `monthly_fee`, `discount`, `discount_is_percent`, `is_oly` |
| `swimmer_season_billing` | Per season: plan, membership month, billing_start_*, **billing_only** |
| `accounting_report_swimmer_order` | Manual PDF order per season |
| `trainers`, `trainer_terms`, `trainer_attendance`, `substitute_trainers` | Staff |
| `trainer_rates` | Monthly (season-wide application in UI) |
| `term_costs` | Pool lane costs |
| `manual_costs` | Extra costs |

SQL migrations live in `SQL/` — apply via Supabase SQL editor or MCP `apply_migration` / `execute_sql`. Prefer additive `IF NOT EXISTS` migrations.

**Recent migrations to know:**

- `SQL/add_swimmer_billing_start.sql`
- `SQL/add_swimmer_billing_only.sql`
- `SQL/add_discount_percent_and_season_invoice_offset.sql`
- `SQL/add_season_fee_factors.sql`
- `SQL/create_swimmer_season_billing.sql`
- `SQL/create_accounting_report_order.sql`

Code often **falls back** if a column is missing (e.g. strip `billing_only` from upsert on error) so old DBs don’t hard-crash — but production should have columns applied.

---

## 7. Auth flows

### Admin

1. `admin-login.html` → `POST /api/admin-login`
2. Token stored client-side; `admin-verify` on load
3. Not the same as Supabase Auth

### Trainers

- Supabase Auth (`trainer-auth.js`, `login.html`)
- See `TRAINER_AUTH_SYSTEM.md`, `SQL/phase1_trainer_auth.sql`

---

## 8. Conventions for agents

1. **Speak to the user in Slovenian** (product UI strings too).
2. **Commits in Slovenian**, short “what/why”; push `origin main` unless told not to.
3. Prefer **surgical edits** in `admin.js` / `admin.html`; file is huge — search before rewriting.
4. Do not invent new frameworks; stay vanilla unless explicitly asked to migrate.
5. Finance changes: verify **season filter**, **viewed month**, **payment plan**, **OLY**, **billing_only**, **PDF filter/order**.
6. After schema changes: add SQL under `SQL/` and apply to Supabase project `tizjimlwfkoniixbetgr`.
7. Never commit `.env`; be careful with passwords in markdown (legacy docs may contain them — prefer Vercel dashboard).

---

## 9. Known pitfalls

| Pitfall | Detail |
|---------|--------|
| README outdated | Still mentions localStorage; real store is Supabase |
| Default fees vs stored 0 | Past months: UI hides people without fee rows; PDF “previous list” must use **stored** nets only |
| Membership “always September” | Fixed: checkbox uses **current month** |
| Billing-only invisible in past month | Without a fee row + past month filter, they disappear — add flow writes fee for chosen month |
| `partitionReturningFirst` vs saved order | With saved order, don’t re-sort returning to top; previous-month rule handles “new on this list” |
| PowerShell | No `<<EOF` heredocs for git |
| Monolithic `admin.js` | Many duplicate `window.updateSwimmerFee` assignments — search all call sites |
| RLS | Enabled but historically permissive for `anon`; don’t assume strong security |

---

## 10. Recent work (Oct 2026) — chronological intent

1. Payment plans + returning sort in accounting  
2. Membership checkbox; installment auto fee; season Sept billing  
3. Trainer rates season-wide; discounts €/%; half fee monthly-only; late start  
4. OLY through year boundary; OLY filter/blue; no OLY membership  
5. Season revenue **projection** vs actual  
6. PDF UX: visibility, returning marks, drop 0-fee (later re-added membership-only), final amount only  
7. **Billing-only persons** + month/amount on add  
8. Attendance summary **Vsi / OLY toggle**  
9. Fees table **% obiska**  
10. Membership charged in **viewed month**  
11. PDF includes **membership-only**; first-timers vs **previous month** go to **bottom** (fixed to use real stored fees)

HEAD at handoff time: see `git log -1` on `main` (expected around `2e469c3` or later).

---

## 11. How to verify a finance change (checklist)

1. Season filter = `2026/2027` (or current).  
2. Finance month = month under test (e.g. oktober 2026).  
3. Mesečne pristojbine: fees, membership checkboxes, OLY, billing-only badge.  
4. Poročilo za računovodstvo: refresh editor, check order.  
5. Prenesi PDF: groups, returning marks, membership column, first-timers at bottom.  
6. Spot-check DB if needed:
   - `swimmer_monthly_fees` for month/year  
   - `swimmer_season_billing` for membership_* / billing_only / payment_plan  

---

## 12. Useful entry points for Claude Code

```text
# Fees UI
admin.js → refreshSwimmerFees, openAddBillingPersonModal

# Accounting / PDF
admin.js → buildAccountingReportRows, downloadAccountingReportPdf,
           filterAccountingRowsForExport, reorderAccountingRowsByPreviousMonth

# Billing helpers
admin.js → isSwimmerInSeasonBillingList, upsertSwimmerSeasonBilling,
           updateSwimmerMembershipFee, getSeasonBillingSchedule

# Attendance %
admin.js → calculateSwimmerSummaryData, loadAttendanceForMonth

# Config / deploy
config.js, api/admin-login.js, VERCEL_ENV.md, .cursor/rules/auto-push-github.mdc
```

---

## 13. Open / follow-up ideas (not requested, for awareness)

- Tighten RLS (stop open `anon` write policies).  
- Move Supabase anon key fully to env injection at build/deploy.  
- Split `admin.js` into modules if maintainability becomes painful.  
- Align September PDF generation with “stored fees only” for past months (same as previous-list logic).  
- Rotate any passwords that appeared in repo markdown.

---

## 14. Quick glossary (SI → EN)

| Slovenian | English |
|-----------|---------|
| Vadnina | Training / membership fee (monthly class fee) |
| Članarina | Club membership fee (once per season) |
| Termin | Training time slot |
| Sezona | Season |
| Obračun | Billing / accounting export |
| Vračajoči | Returning swimmer (prior season) |
| Obračunska oseba / samo obračun | Billing-only person |
| Način plačila | Payment plan |
| Poročilo za računovodstvo | Accounting report / PDF |

---

*End of handoff. Prefer this file + `git log` + live Supabase over outdated README.*
