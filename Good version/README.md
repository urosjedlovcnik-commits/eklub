# Sistem za vodenje prisotnosti plavalcev

Sistem za vodenje prisotnosti plavalcev je sestavljen iz dveh glavnih delov:

## 📅 Glavna stran (index.html)
**Namen**: Vodenje prisotnosti plavalcev na treningih

**Funkcionalnosti**:
- Koledar z mesečnim prikazom treningov
- Klik na termin za beleženje prisotnosti
- Povzetek udeležbe za prikazani mesec
- Povezava na admin stran

**Uporaba**:
1. Z gumbi "Prejšnji mesec" in "Naslednji mesec" se premikate med meseci
2. Kliknite na termin v koledarju za beleženje prisotnosti
3. V modalnem oknu označite prisotnost vsakega plavalca
4. Dodajte opombe o treningu
5. Shranite podatke

## ⚙️ Admin stran (admin.html)
**Namen**: Upravljanje plavalcev, terminov in podatkov

**Dostop**: Samo preko login strani (admin-login.html)
**Administrator**: uros.jedlovcnik@gmail.com
**Geslo**: admin123

**Funkcionalnosti**:
- **Plavalci**: Dodajanje, brisanje, dodeljevanje terminov
- **Termini**: Ustvarjanje in urejanje treningov
- **CSV**: Uvoz/izvoz podatkov

### Navigacija
- **Plavalci**: Upravljanje s plavalci in njihovimi termini
- **Termini**: Ustvarjanje in urejanje treningov
- **CSV**: Uvoz/izvoz podatkov v CSV formatu

### Dodajanje plavalca
1. Vnesite ime in priimek
2. Kliknite "Dodaj"
3. Dodelite termine iz padajočega seznama

### Dodajanje termina
1. Izberite dan v tednu
2. Vnesite začetno in končno uro
3. Vnesite datum trajanja (od - do)
4. Kliknite "Dodaj termin"

### CSV uvoz
- **Plavalci**: Datoteka mora vsebovati stolpce `first_name`, `last_name`, `terms`
- **Termini**: Datoteka mora vsebovati stolpce `id`, `day`, `start_time`, `end_time`, `date_from`, `date_to`

### CSV izvoz
- Izvoz prisotnosti za izbrani mesec in leto
- Vključuje datum, termin, plavalce, prisotnost in opombe

## 🔧 Tehnične specifikacije

**Frontend**: HTML5, CSS3, JavaScript (ES6+)
**Shranjevanje**: localStorage (podatki se shranjujejo v brskalniku)
**Responsive design**: Prilagojen za namizne in mobilne naprave

## 📱 Uporaba na mobilnih napravah

Sistem je popolnoma prilagojen za uporabo na mobilnih napravah:
- Responsive grid layout
- Prilagojeni gumbi za dotik
- Optimizirana navigacija za majhne zaslone

## 🚀 Namestitev

1. Prenesite vse datoteke v mapo
2. Odprite `index.html` v brskalniku za glavno stran
3. Za admin dostop obiščite `admin-login.html`
4. Sistem je pripravljen za uporabo

## 📊 Struktura podatkov

**Plavalci**:
```json
{
  "id": "swimmer_1234567890",
  "first_name": "Janez",
  "last_name": "Novak",
  "terms": ["pon-17:00-18:00", "sre-18:00-19:00"],
  "is_deleted": false
}
```

**Termini**:
```json
{
  "id": "pon-17:00-18:00",
  "day": 1,
  "start_time": "17:00",
  "end_time": "18:00",
  "date_from": "2024-09-01",
  "date_to": "2025-05-31"
}
```

**Prisotnost**:
```json
{
  "2024-12-15": {
    "pon-17:00-18:00": {
      "swimmer_1234567890": "present"
    }
  }
}
```

## 🔒 Varnost

- Vsi podatki se shranjujejo lokalno v brskalniku
- Ni potrebe po strežniku ali bazi podatkov
- Podatki so dostopni samo uporabniku naprave
- Admin dostop je zaščiten z login sistemom
- Samo avtorizirani administrator ima dostop do admin funkcionalnosti

## 📞 Podpora

Za vprašanja ali težave obiščite admin stran ali preverite konzolo brskalnika za morebitne napake.
