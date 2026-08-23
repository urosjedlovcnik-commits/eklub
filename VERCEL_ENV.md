# Vercel okoljske spremenljivke (obvezno po zadnjem deployu)

V **Vercel Dashboard → Project → Settings → Environment Variables** dodajte:

| Spremenljivka | Vrednost |
|---|---|
| `ADMIN_EMAIL` | `uros.jedlovcnik@gmail.com` |
| `ADMIN_PASSWORD` | `PlavalnaSola2025!` (isto geslo kot prej) |
| `ADMIN_SESSION_SECRET` | naključen niz, min. 32 znakov (npr. `openssl rand -hex 32`) |

Po shranjevanju **Redeploy** projekta. Brez tega admin prijava ne deluje.
