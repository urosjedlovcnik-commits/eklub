# Kaskadno Brisanje Plavalcev

## Pregled

Implementirano je kaskadno brisanje plavalcev, ki avtomatsko izbriše plavalca iz vseh povezanih tabel v bazi podatkov. Sistem omogoča tudi obnovitev izbrisanih plavalcev.

## Funkcionalnosti

### 1. Kaskadno Brisanje
- **Evidenca prisotnosti**: Izbriše vse zapise prisotnosti plavalca
- **Mesečne pristojbine**: Izbriše vse zapise mesečnih pristojbin
- **Glavna tabela**: Označi plavalca kot izbrisanega (soft delete)

### 2. Preverjanje Povezav
- Pred brisanjem se prikaže število povezanih zapisov
- Uporabnik vidi, koliko zapisov bo izbrisanih
- Potrditev z detajlnimi informacijami

### 3. Obnovitev Plavalcev
- Možnost obnovitve izbrisanih plavalcev
- Izbrisani plavalci so označeni v seznamu
- Gumb za obnovitev v admin vmesniku

## SQL Funkcije

### `delete_swimmer_cascade(swimmer_uuid UUID)`
Izbriše plavalca iz vseh povezanih tabel.

**Vrača JSON z rezultati:**
```json
{
  "success": true,
  "message": "Plavalec [ime] uspešno izbrisan",
  "swimmer_name": "Ime Priimek",
  "deleted_attendance": 15,
  "deleted_fees": 12,
  "deleted_swimmer": true
}
```

### `check_swimmer_connections(swimmer_uuid UUID)`
Preveri povezave plavalca pred brisanjem.

**Vrača JSON z informacijami:**
```json
{
  "exists": true,
  "swimmer_name": "Ime Priimek",
  "attendance_records": 15,
  "fees_records": 12,
  "total_connections": 27
}
```

### `restore_swimmer(swimmer_uuid UUID)`
Obnovi izbrisanega plavalca.

**Vrača JSON z rezultati:**
```json
{
  "success": true,
  "message": "Plavalec [ime] uspešno obnovljen",
  "swimmer_name": "Ime Priimek"
}
```

## Uporaba v Admin Aplikaciji

### Brisanje Plavalca
1. V seznamu plavalcev kliknite "Zbriši plavalca"
2. Sistem prikaže potrditveno okno z informacijami o povezavah
3. Potrdite brisanje
4. Plavalec se izbriše iz vseh tabel

### Obnovitev Plavalca
1. Izbrisani plavalci so prikazani na dnu seznama
2. Kliknite "Obnovi plavalca" pri izbrisanem plavalcu
3. Plavalec se obnovi in postane spet aktiven

## Vizualne Spremembe

### Seznam Plavalcev
- **Aktivni plavalci**: Normalni prikaz z gumbom "Zbriši plavalca"
- **Izbrisani plavalci**: 
  - Zmanjšana prozornost (opacity: 0.6)
  - Svetlo siva ozadje
  - Badge "Izbrisan" pri imenu
  - Gumb "Obnovi plavalca" namesto "Zbriši plavalca"

### CSS Stili
```css
.badge {
  display: inline-block;
  background: #fef3c7;
  border: 1px solid #f59e0b;
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 11px;
  font-weight: 600;
  margin-left: 6px;
}

.badge.warn {
  background: #fef2f2;
  border-color: #f87171;
  color: #dc2626;
}
```

## Namestitev

### 1. SQL Funkcije
Zaženite `SQL/cascade_delete_swimmer.sql` v Supabase SQL editorju.

### 2. Testiranje
Zaženite `SQL/test_cascade_delete.sql` za preverjanje funkcionalnosti.

### 3. Admin Aplikacija
Posodobljeni `admin.js` in `style.css` so že pripravljeni za uporabo.

## Varnost

- Vse funkcije imajo RLS (Row Level Security) politike
- Javni dostop je omogočen za anonimne uporabnike
- Vse operacije so logirane v konzoli
- Napake so pravilno obravnavane

## Napake in Odpravljanje

### Pogoste Napake
1. **"Funkcija ne obstaja"**: Zaženite `cascade_delete_swimmer.sql`
2. **"Dostop zavrnjen"**: Preverite RLS politike
3. **"Plavalec ne obstaja"**: Preverite UUID plavalca

### Preverjanje Stanja
```sql
-- Preveri obstoječe funkcije
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%swimmer%';

-- Preveri povezave plavalca
SELECT check_swimmer_connections('swimmer-uuid-here');
```

## Pridelki

- ✅ Popolno kaskadno brisanje iz vseh tabel
- ✅ Varno brisanje z potrditvijo
- ✅ Možnost obnovitve plavalcev
- ✅ Vizualno razločevanje med aktivnimi in izbrisanimi
- ✅ Detajlne informacije o povezavah
- ✅ Robustno obravnavanje napak
- ✅ Test skripti za preverjanje

## Prihodnje Izboljšave

- [ ] Možnost masovnega brisanja plavalcev
- [ ] Arhiviranje podatkov pred brisanjem
- [ ] Avtomatsko brisanje starih izbrisanih plavalcev
- [ ] Izvoz seznama izbrisanih plavalcev
