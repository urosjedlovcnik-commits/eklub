# Admin Autentikacija - Prisotnost plavalcev

## Pregled sistema

Sistem ima dva načina dostopa:

1. **Admin dostop** - za administratorja sistema (vas)
2. **Trener portal** - za trenerje preko Supabase autentikacije

## Admin dostop

### Prijava
- **Email:** `uros.jedlovcnik@gmail.com`
- **Geslo:** `uros2024`

### Zaščitene strani
- `index.html` - glavna stran aplikacije
- `admin-trainers.html` - upravljanje trenerjev
- `assign-terms.html` - povezovanje trenerjev s termini

### Funkcionalnosti
- Dodajanje in urejanje trenerjev
- Povezovanje trenerjev s termini
- Upravljanje plavalcev in terminov
- Izvoz CSV podatkov
- Celotno upravljanje sistema

## Trener portal

### Dostop
- Stran: `auth-index.html`
- Trenerji se prijavijo z emailom in geslom, ki jih nastavi administrator
- Dostop preko Supabase autentikacije

### Funkcionalnosti
- Vnašanje prisotnosti plavalcev
- Upravljanje svojih skupin
- Ogled povzetkov prisotnosti
- Izvoz CSV podatkov za svoje skupine

## Vstop v sistem

### Glavna vstopna stran
- `login.html` - izbira med admin dostopom in trener portalom

### Direktni dostop
- Admin login: `admin-login.html`
- Trener portal: `auth-index.html`

## Varnost

### Admin autentikacija
- Preprost JWT token, shranjen v localStorage
- Veljavnost: 24 ur
- Samo en admin račun (vas)

### Trener autentikacija
- Supabase Auth sistem
- Varno geslo in email preverjanje
- Možnost ponastavitve gesla

## Navodila za uporabo

### 1. Prva prijava
1. Odprite `login.html`
2. Kliknite "Admin dostop"
3. Prijavite se z:
   - Email: `uros.jedlovcnik@gmail.com`
   - Geslo: `uros2024`

### 2. Dodajanje trenerjev
1. Pojdite na "Upravljanje trenerjev"
2. Vnesite podatke trenerja (email, geslo, ime, priimek)
3. Kliknite "Shrani trenerja"

### 3. Povezovanje trenerjev s termini
1. Pojdite na "Dodeli termine"
2. Izberite trenerja in termin
3. Kliknite "Poveži"

### 4. Odjava
- Kliknite "Odjava" v zgornjem desnem kotu

## Sprememba gesla

Za spremembo admin gesla uredite:
1. `admin-login.html` - vrstica z `ADMIN_PASSWORD`
2. `admin-auth.js` - vrstica z `this.ADMIN_PASSWORD`

## Opombe

- Admin token se shrani v localStorage in velja 24 ur
- Po poteku tokena se avtomatsko preusmeri na login
- Trener portal ostane dostopen preko Supabase
- Vse admin strani so zaščitene z autentikacijo

## Struktura datotek

```
├── login.html              # Glavna vstopna stran
├── admin-login.html        # Admin prijava
├── admin-auth.js          # Admin autentikacija
├── index.html             # Glavna aplikacija (zaščitena)
├── admin-trainers.html    # Upravljanje trenerjev (zaščitena)
├── assign-terms.html      # Povezovanje terminov (zaščitena)
├── auth-index.html        # Trener portal (Supabase)
├── auth-script.js         # Trener portal logika
└── README-ADMIN.md        # Ta datoteka
```
