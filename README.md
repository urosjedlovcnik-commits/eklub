# eKlub — Plavalni klub Ljubljana

Spletna aplikacija za vodenje prisotnosti, plavalcev, trenerjev in financ v programih za odrasle Plavalnega kluba Ljubljana (PKL).

- **Produkcija:** https://eklub.vercel.app
- **Podrobna tehnična dokumentacija:** [HANDOFF.md](HANDOFF.md) (poslovna pravila, obračun, PDF za računovodstvo, ključne funkcije)

## Strani

| Pot | Datoteka | Namen |
|-----|----------|-------|
| `/` | `index.html` + `script.js` | Koledar terminov in beleženje prisotnosti |
| `/login.html` | `login.html` + `trainer-auth.js` | Prijava trenerjev (Supabase Auth) |
| `/admin-login.html` | `admin-login.html` + `auth.js` | Prijava administratorja |
| `/admin.html` | `admin.html` + `admin.js` | Administracija |
| `/swimmers-list.html` | `swimmers-list.html` + `swimmers-list.js` | Seznam plavalcev |
| `/reset-password.html` | `reset-password.html` | Ponastavitev gesla trenerja |

### Admin razdelki

- **Pregled** — ključni kazalniki za izbrani mesec
- **Plavalci** — dodajanje, urejanje, dodeljevanje terminov, povzetek obiska (Vsi / OLY)
- **Termini** — treningi po dnevih v tednu
- **Sezone** — obdobja sezon, faktorji vadnine
- **Trenerji** — trenerji, urne postavke, ure, odsotnosti
- **Finance** — mesečne vadnine, članarina, popusti, OLY, osebe za obračun, poročilo in PDF za računovodstvo, projekcija sezone
- **Mailing** — e-poštni seznami (plavalci, OLY, trenerji, po terminih)
- **CSV** — uvoz in izvoz podatkov

Izbira sezone v zgornji vrstici admina določa skoraj vso logiko financ in dodeljevanja.

## Tehnologija

- **Frontend:** čisti HTML, CSS in JavaScript, brez build koraka. Knjižnice prek CDN: `@supabase/supabase-js` (pripeta verzija), pdfMake.
- **Podatki:** Supabase Postgres z vklopljenim RLS. URL in javni `anon` ključ sta v `config.js`.
- **Strežnik:** Vercel serverless funkcije v `api/` (prijava administratorja s podpisanim žetonom).
- **Edge funkcija:** `supabase/functions/invite-trainer` (vabila trenerjem).
- **Migracije baze:** `SQL/` — zaganjajo se ročno v Supabase SQL urejevalniku.

## Prijava administratorja

Gesla ni v kodi. Na Vercelu morajo biti nastavljene okoljske spremenljivke:

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ADMIN_SESSION_SECRET`

Predloga je v `.env.example`, navodila v [VERCEL_ENV.md](VERCEL_ENV.md). Varnostne opombe so v [SECURITY.md](SECURITY.md).

## Objava

Vsak push na vejo `main` se samodejno objavi na Vercel produkcijo. Lokalno strani lahko odpreš s poljubnim statičnim strežnikom, vendar prijava administratorja deluje samo prek Vercela (npr. `vercel dev`), ker potrebuje `api/`.

## Ostala navodila

- [CSV_UVOZ_IZVOZ_NAVODILA.md](CSV_UVOZ_IZVOZ_NAVODILA.md), [CSV_UVOZ_FORMAT_TERMINOV.md](CSV_UVOZ_FORMAT_TERMINOV.md), [CSV_UVOZ_VADNIN.md](CSV_UVOZ_VADNIN.md) — formati CSV
- [TRAINER_AUTH_SYSTEM.md](TRAINER_AUTH_SYSTEM.md) — prijava trenerjev
- [NAVODILA_UCITELJI.html](NAVODILA_UCITELJI.html) — navodila za trenerje

Mapa `test Authentication/` vsebuje stare poskuse in se v produkciji ne uporablja.
