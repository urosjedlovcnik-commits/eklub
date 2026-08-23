# 📧 Email naslovi plavalcev - Navodila za uporabo

## Pregled
Sistem za vodenje plavalne šole sedaj podpira shranjevanje email naslovov plavalcev. To omogoča boljše upravljanje komunikacije s plavalci.

## 🆕 Nove funkcionalnosti

### 1. Dodajanje email naslova pri novih plavalcih
- V admin panelu je sedaj na voljo polje za email naslov
- Email naslov je **opcijski** - ni obvezen za dodajanje plavalca
- Sistem avtomatsko validira format email naslova

### 2. Prikaz email naslovov v seznamu plavalcev
- V admin panelu se sedaj prikazuje stolpec z email naslovi
- Plavalci brez email naslova imajo prikazano "Brez email naslova"

### 3. CSV uvoz z email naslovi
- CSV datoteke lahko vsebujejo stolpec `email`
- Email naslovi se validirajo med uvozom
- Neveljavni email naslovi se ignorirajo z opozorilom

## 📋 Navodila za uporabo

### Dodajanje novega plavalca z email naslovom
1. Odprite admin panel (`admin-login.html`)
2. Pojdite v sekcijo "Plavalci"
3. Vnesite ime in priimek plavalca
4. Vnesite email naslov (opcijsko)
5. Kliknite "Dodaj"
6. Dodelite termine plavalcu

### CSV uvoz plavalcev z email naslovi
1. Pripravite CSV datoteko z naslednjimi stolpci:
   - `first_name` (obvezen)
   - `last_name` (obvezen)
   - `terms` (obvezen)
   - `email` (opcijski)

2. Primer CSV datoteke:
```csv
first_name,last_name,email,terms
Janez,Novak,janez.novak@email.com,pon-17:00-18:00
Maja,Kovač,maja.kovac@email.com,sre-18:00-19:00
Peter,Horvat,,tor-19:00-20:00
```

3. Uvozi datoteko preko admin panela

## 🔧 Tehnične podrobnosti

### Struktura baze podatkov
Tabela `swimmers` sedaj vsebuje stolpec `email`:
```sql
ALTER TABLE swimmers ADD COLUMN email TEXT;
```

### Validacija email naslovov
Sistem uporablja regex validacijo:
```javascript
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
```

### CSV format
- Email naslovi so opcijski
- Neveljavni email naslovi se ignorirajo
- Sistem prikazuje opozorila za neveljavne email naslove

## 📊 Primeri uporabe

### 1. Komunikacija s plavalci
- Email naslovi omogočajo pošiljanje obvestil
- Lahko se uporabljajo za pošiljanje računov
- Omogočajo komunikacijo o spremembah terminov

### 2. Izvoz podatkov
- Email naslovi so vključeni v CSV izvoze
- Omogočajo integracijo z drugimi sistemi
- Uporabni za pošiljanje masovnih obvestil

### 3. Upravljanje
- Hitro iskanje plavalcev po email naslovu
- Preverjanje podvojenih registracij
- Boljše sledenje stikov s plavalci

## ⚠️ Pomembne opombe

1. **Email naslovi so opcijski** - sistem deluje tudi brez njih
2. **Validacija** - sistem preverja format email naslovov
3. **Privzeto stanje** - obstoječi plavalci nimajo email naslovov
4. **Posodobitev** - email naslove lahko dodajate tudi obstoječim plavalcem preko CSV uvoza

## 🚀 Naslednji koraki

Za popolno implementacijo lahko dodate:
- Funkcionalnost za pošiljanje email obvestil
- Integracijo z email storitvami
- Avtomatsko generiranje email naslovov
- Funkcionalnost za urejanje email naslovov obstoječih plavalcev

## 📞 Podpora

Za vprašanja ali težave obiščite admin stran ali preverite konzolo brskalnika za morebitne napake.
