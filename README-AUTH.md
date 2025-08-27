# Autentikacija za aplikacijo prisotnosti plavalcev

Ta dokument opisuje, kako nastaviti verzijo aplikacije z autentikacijo, kjer vsak trener vidi samo svoje skupine.

## Datoteke

- `auth-index.html` - Glavna HTML datoteka z login obrazcem
- `auth-script.js` - JavaScript z autentikacijsko logiko
- `setup-auth-tables.sql` - SQL skripta za nastavitev podatkovnih tabel
- `admin-trainers.html` - Admin vmesnik za upravljanje trenerjev
- `assign-terms.html` - Admin vmesnik za povezovanje trenerjev s termini
- `style.css` - Obstojajoča CSS datoteka (uporablja se ista)

## Koraki za nastavitev

### 1. Nastavitev podatkovne baze

1. Odprite Supabase Dashboard
2. Pojdite v SQL Editor
3. Kopirajte in izvedite vsebino datoteke `setup-auth-tables.sql`

### 2. Nastavitev autentikacije v Supabase

1. V Supabase Dashboard pojdite v **Authentication** > **Settings**
2. Omogočite **Email auth**
3. Nastavite **Site URL** na vašo domeno
4. Dodajte **Redirect URLs** (npr. `https://yourdomain.com/auth-index.html`)

### 3. Ustvarjanje uporabniških računov

#### Možnost A: Preko Supabase Dashboard
1. Pojdite v **Authentication** > **Users**
2. Kliknite **Add user**
3. Vnesite email in geslo
4. Ustvarite zapis v tabeli `trainers`:

```sql
INSERT INTO trainers (email, first_name, last_name) 
VALUES ('trener@example.com', 'Ime', 'Priimek');
```

#### Možnost B: Preko SQL
```sql
-- Najprej ustvarite uporabnika v auth.users
INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES ('trener@example.com', crypt('geslo123', gen_salt('bf')), NOW(), NOW(), NOW());

-- Nato dodajte zapis v tabelo trainers
INSERT INTO trainers (email, first_name, last_name) 
VALUES ('trener@example.com', 'Ime', 'Priimek');
```

### 4. Povezovanje trenerjev s termini

Za vsakega trenerja povežite termine, ki mu pripadajo:

```sql
-- Poiščite ID trenerja
SELECT id FROM trainers WHERE email = 'trener@example.com';

-- Povežite z termini (prilagodite ID-je terminov)
INSERT INTO trainer_terms (trainer_id, term_id) VALUES
('trainer-uuid', 'pon-17:00-18:00'),
('trainer-uuid', 'sre-18:00-19:00');
```

### 5. Nastavitev aplikacije

1. Kopirajte vse datoteke v vašo mapo:
   - `auth-index.html`
   - `auth-script.js`
   - `admin-trainers.html`
   - `assign-terms.html`
2. Preverite, da so URL-ji in ključi v `auth-script.js` pravilni
3. Odprite `auth-index.html` v brskalniku

### 6. Admin vmesniki

Za upravljanje trenerjev in povezav:
- `admin-trainers.html` - Dodajanje, urejanje in brisanje trenerjev
- `assign-terms.html` - Povezovanje trenerjev s termini

## Funkcionalnosti

### Za trenerje:
- **Prijava/odjava** z email in geslom
- **Prikaz samo svojih terminov** v koledarju
- **Upravljanje plavalcev** samo v svojih skupinah
- **Vnos prisotnosti** samo za svoje termine
- **Povzetek udeležbe** samo za svoje skupine

### Varnost:
- **Row Level Security (RLS)** v Supabase
- **Filtriranje podatkov** na strani odjemalca
- **Preverjanje avtorizacije** pred vsako operacijo
- **Ločitev admin in trener vmesnikov**

### Admin funkcionalnosti:
- **Upravljanje trenerjev** - dodajanje, urejanje, brisanje
- **Povezovanje s termini** - dodeljevanje terminov trenerjem
- **Pregled povezav** - vizualni prikaz kdo ima katere termine

## Struktura podatkov

### Tabela `trainers`:
- `id` - UUID primarni ključ
- `email` - Email trenerja (povezan z auth.users)
- `first_name` - Ime trenerja
- `last_name` - Priimek trenerja
- `created_at` - Čas ustvarjanja
- `updated_at` - Čas zadnje posodobitve

### Tabela `trainer_terms`:
- `id` - UUID primarni ključ
- `trainer_id` - Reference na trainers.id
- `term_id` - Reference na terms.id
- `created_at` - Čas ustvarjanja

## Administracija

### Dodajanje novega trenerja:
1. Ustvarite uporabnika v Supabase Auth
2. Dodajte zapis v tabelo `trainers`
3. Povežite z ustreznimi termini v `trainer_terms`

### Spreminjanje terminov trenerja:
```sql
-- Odstranite obstoječe povezave
DELETE FROM trainer_terms WHERE trainer_id = 'trainer-uuid';

-- Dodajte nove povezave
INSERT INTO trainer_terms (trainer_id, term_id) VALUES
('trainer-uuid', 'nov-termin-id');
```

## Odpravljanje težav

### Trener se ne more prijaviti:
1. Preverite, da uporabnik obstaja v `auth.users`
2. Preverite, da obstaja zapis v tabeli `trainers`
3. Preverite, da je email enak v obeh tabelah

### Trener ne vidi terminov:
1. Preverite, da obstajajo povezave v `trainer_terms`
2. Preverite, da so ID-ji terminov pravilni
3. Preverite konzolo brskalnika za napake

### Napake pri nalaganju podatkov:
1. Preverite RLS politike v Supabase
2. Preverite, da so vse tabele ustvarjene
3. Preverite konzolo za podrobnosti napak

## Razlike od originalne verzije

1. **Autentikacija** - Dodan login sistem
2. **Filtriranje** - Trenerji vidijo samo svoje termine
3. **Varnost** - RLS politike v podatkovni bazi
4. **UI spremembe** - Dodan prikaz prijavljenega trenerja
5. **Poenostavitev** - Odstranjeni nekateri admin elementi

## Migracija iz originalne verzije

1. Ustvarite nove tabele z `setup-auth-tables.sql`
2. Dodajte trenerje in povežite z obstoječimi termini
3. Testirajte novo verzijo vzporedno z originalno
4. Ko je vse v redu, lahko preklopite na novo verzijo
