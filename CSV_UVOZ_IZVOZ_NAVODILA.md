# CSV Uvoz in Izvoz - Navodila

## 📋 Pregled funkcionalnosti

### 1. **CSV Uvoz plavalcev**
- ✅ Podpira naslov in pošto
- ✅ Vključuje email, telefon, termine
- ✅ Validacija podatkov

### 2. **CSV Izvoz**
- ✅ **Povzetek udeležbe** - vključuje naslov in pošto
- ✅ **Seznam plavalcev** - vključuje naslov in pošto

## 🗄️ Baza podatkov

### Potrebne spremembe v bazi:
```sql
-- Poženite SQL/add_address_fields_to_swimmers.sql
-- Doda stolpca 'address' in 'postal_code' v tabelo swimmers
```

## 📁 CSV Format

### Uvoz plavalcev:
```csv
first_name,last_name,email,phone,address,postal_code,terms
Janez,Novak,janez.novak@email.com,040123456,Trg svobode 1,1000 Ljubljana,"pon-20:00-21:00,sre-20:00-21:00"
Maja,Kovač,maja.kovac@email.com,041234567,Cesta na Gorenjsko 15,4000 Kranj,"pon-06:15-07:15,čet-06:15-07:15"
```

### Izvoz povzetka udeležbe:
```csv
Plavalec,Obiskani treningi,Možni treningi,Delež (%),Znesek vadnine (€),Naslov,Pošta
"Janez Novak",8,12,66.7,80.00,"Trg svobode 1","1000 Ljubljana"
```

### Izvoz seznama plavalcev:
```csv
first_name,last_name,email,phone,address,postal_code,terms
"Janez","Novak","janez.novak@email.com","040123456","Trg svobode 1","1000 Ljubljana","pon-20:00-21:00,sre-20:00-21:00"
```

## 🔧 Kako uporabiti

### 1. **Uvoz plavalcev**
1. Pojdite na admin.html
2. Kliknite "Uvozi plavalce"
3. Izberite CSV datoteko
4. Sistem bo avtomatsko uvozil podatke

### 2. **Izvoz povzetka udeležbe**
1. Pojdite na admin.html
2. Izberite mesec in leto
3. Kliknite "Izvozi"
4. Prenesite CSV datoteko

### 3. **Izvoz seznama plavalcev**
1. Pojdite na admin.html
2. Kliknite "Izvozi seznam plavalcev"
3. Prenesite CSV datoteko

## ⚠️ Pomembne opombe

- **Naslov in pošta** so opcijska polja
- **Email in telefon** so opcijska polja
- **Ime in priimek** so obvezna polja
- **Termini** so obvezni (lahko prazni)

## 🎯 Lokacije prikaza

- **swimmers-list.html** - prikazuje naslov in pošto
- **admin.html** - ne prikazuje naslova in pošte v seznamu
- **CSV izvoz** - vključuje naslov in pošto
