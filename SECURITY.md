# 🔒 Varnostna navodila

## OPOZORILO - PRED PRODUKCIJO OBVEZNO NASTAVI:

### 1. **Supabase Row Level Security (RLS)**

⚠️ **TRENUTNA NAPAKA**: Tabela `trainer_attendance` ima omogočen RLS, vendar ni nastavljenih policy-jev!

**HITRI POPRAVEK (začasno):**
```sql
-- Začasno onemogoči RLS za trainer_attendance (NE ZA PRODUKCIJO!)
ALTER TABLE trainer_attendance DISABLE ROW LEVEL SECURITY;
```

**PRAVILNA REŠITEV (za produkcijo):**
```sql
-- Omogoči RLS na vseh tabelah
ALTER TABLE swimmers ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainers ENABLE ROW LEVEL SECURITY;
ALTER TABLE terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE term_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainer_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainer_terms ENABLE ROW LEVEL SECURITY;

-- Ustvari policy-je za javni dostop (prilagodi svojim potrebam)
CREATE POLICY "Allow public read" ON swimmers FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public write" ON swimmers FOR ALL TO anon USING (true);

CREATE POLICY "Allow public read" ON trainers FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public write" ON trainers FOR ALL TO anon USING (true);

CREATE POLICY "Allow public read" ON terms FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public write" ON terms FOR ALL TO anon USING (true);

CREATE POLICY "Allow public read" ON attendance FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public write" ON attendance FOR ALL TO anon USING (true);

CREATE POLICY "Allow public read" ON term_status FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public write" ON term_status FOR ALL TO anon USING (true);

CREATE POLICY "Allow public read" ON trainer_attendance FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public write" ON trainer_attendance FOR ALL TO anon USING (true);

CREATE POLICY "Allow public read" ON trainer_terms FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public write" ON trainer_terms FOR ALL TO anon USING (true);
```

**VARNEJŠA REŠITEV (za resno uporabo):**
```sql
-- Ustvari bolj omejene policy-je
CREATE POLICY "Allow authenticated users" ON trainer_attendance 
FOR ALL TO authenticated USING (true);

-- Ali uporabi custom logic za preverjanje dovoljenj
CREATE POLICY "Allow specific users" ON trainer_attendance 
FOR ALL TO anon USING (
  -- Dodaj svojo logiko za preverjanje dovoljenj
  true
);
```

### 2. **Admin geslo (Vercel okolje)**
Geslo **ni več v kodi**. Nastavite v Vercel Dashboard → Settings → Environment Variables:

- `ADMIN_EMAIL` — admin e-pošta
- `ADMIN_PASSWORD` — geslo (isto kot prej, če želite)
- `ADMIN_SESSION_SECRET` — naključen niz (min. 32 znakov)

Glejte `.env.example` za predlogo.

### 3. **Uporabi HTTPS**
- Nikoli ne uporabljaj HTTP v produkciji
- Nastavi SSL certifikat
- Preusmeri HTTP na HTTPS

### 4. **Environment Variables**
V produkciji uporabi environment variable namesto hardkodiranih ključev:
```javascript
const CONFIG = {
    SUPABASE: {
        URL: process.env.SUPABASE_URL || 'fallback-url',
        ANON_KEY: process.env.SUPABASE_ANON_KEY || 'fallback-key'
    }
};
```

### 5. **Content Security Policy (CSP)**
Dodaj CSP headers za varnost:
```html
<meta http-equiv="Content-Security-Policy" content="
    default-src 'self'; 
    script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; 
    style-src 'self' 'unsafe-inline';
    connect-src 'self' https://*.supabase.co
">
```

### 6. **Session varnost**
- Nastavi HttpOnly cookies namesto localStorage
- Uporabi secure cookies
- Implementiraj CSRF zaščito

### 7. **Supabase Auth (priporočeno)**
Namesto custom auth sistema uporabi Supabase Auth:
```javascript
// Zamenjaj custom login z:
const { user, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: password
});
```

### 8. **Backup podatkov**
- Redno izvoz podatkov
- Shranjuj backup na varen kraj
- Testiraj restore postopke

### 9. **Monitoring**
- Spremljaj nenavadne aktivnosti
- Logiraj admin akcije
- Nastavi opozorila

### 10. **Ažuriranje**
- Redno posodabljaj dependencies
- Spremljaj varnostne popravke
- Testiraj pred produkcijo

## TRENUTNO STANJE
- ✅ Centralizirana konfiguracija
- ✅ Izboljšan auth sistem  
- ✅ Čiščenje debug kode
- ⚠️ **POTREBNO**: RLS v Supabase
- ⚠️ **POTREBNO**: Nastavite ADMIN_* spremenljivke v Vercel
- ⚠️ **POTREBNO**: HTTPS v produkciji
