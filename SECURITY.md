# 🔒 Varnostna navodila

## OPOZORILO - PRED PRODUKCIJO OBVEZNO NASTAVI:

### 1. **Supabase Row Level Security (RLS)**
```sql
-- Omogoči RLS na vseh tabelah
ALTER TABLE swimmers ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainers ENABLE ROW LEVEL SECURITY;
ALTER TABLE terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE term_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainer_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainer_terms ENABLE ROW LEVEL SECURITY;

-- Ustvari policy-je (prilagodi svojim potrebam)
CREATE POLICY "Allow public read" ON swimmers FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public read" ON trainers FOR SELECT TO anon USING (true);
-- Dodaj ostale policy-je...
```

### 2. **Spremeni admin geslo**
V `auth.js` spremeni geslo iz `PlavalnaSola2025!` na močnejše:
```javascript
// Trenutno geslo: PlavalnaSola2025!
// Spremeni na nekaj varnejšega!
```

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
- ⚠️ **POTREBNO**: Močnejše geslo
- ⚠️ **POTREBNO**: HTTPS v produkciji
