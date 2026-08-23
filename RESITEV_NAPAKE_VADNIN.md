# Rešitev napake pri uvozu vadnin

## Opis problema

Uporabnik je poročal o napaki pri uvozu vadnin iz CSV datoteke:

```
Napaka pri uvažanju vadnin: Object { 
    code: "23514", 
    details: null, 
    hint: null, 
    message: 'new row for relation "swimmer_monthly_fees" violates check constraint "swimmer_monthly_fees_month_check"' 
}
```

## Vzrok napake

Napaka se pojavi zaradi kršitve `CHECK` omejitve v bazi podatkov:

```sql
"month" integer NOT NULL CHECK (month >= 0 AND month <= 11)
```

Baza podatkov pričakuje mesece v obsegu 0-11 (0-indexed, kot JavaScript `Date.getMonth()`), vendar se poskuša vnesti neveljaven mesec.

## Implementirane rešitve

### 1. Dodatna validacija meseca

Dodane so preverjanja v vseh funkcijah, ki delajo z meseci:

- **`copyPreviousMonthFees()`**: Validacija trenutnega in prejšnjega meseca
- **`autoCopyFeesIfNeeded()`**: Validacija trenutnega meseca
- **`checkFeesStatus()`**: Validacija trenutnega meseca
- **CSV import**: Validacija meseca iz select elementa in v zankah

### 2. Funkcija za čiščenje neveljavnih podatkov

```javascript
async function clearInvalidFees()
```

- Poišče vse vadnine z neveljavnimi meseci (month < 0 || month > 11)
- Izbriše neveljavne vadnine iz baze
- Prikaže uporabniku rezultat operacije

### 3. Funkcija za preverjanje integritete baze

```javascript
async function checkDatabaseIntegrity()
```

- Preveri vse vadnine v bazi
- Identificira neveljavne podatke
- Vrne podrobno poročilo o stanju baze

### 4. Izboljšano rokovanje z napakami

- Detekcija specifične napake `23514` (constraint violation)
- Avtomatsko predlaganje čiščenja neveljavnih podatkov
- Boljše sporočila o napakah za uporabnika

### 5. Dodatne varnostne ukrepe

- Try-catch bloki okoli vseh kritičnih operacij
- Dodatne zakasnitve pri avtomatskem kopiranju (5 sekund namesto 2)
- Validacija vseh mesecnih vrednosti pred vnosom v bazo

## Novi gumbi v vmesniku

### Počisti neveljavne vadnine
- **Barva**: Rdeča (`#dc3545`)
- **Funkcija**: Kliče `clearInvalidFees()`
- **Namen**: Ročno čiščenje neveljavnih podatkov

### Preveri integriteto baze
- **Barva**: Modra (`#17a2b8`)
- **Funkcija**: Kliče `checkDatabaseIntegrity()`
- **Namen**: Diagnostika stanja baze

## Koraki za rešitev trenutne napake

1. **Odpirajte admin panel** in pojdite v sekcijo "Finance"
2. **Kliknite "Preveri integriteto baze"** - to bo prikazalo stanje v konzoli
3. **Če so najdeni neveljavni podatki**, kliknite "Počisti neveljavne vadnine"
4. **Poskusite ponovno uvožiti CSV datoteko**

## Preprečevanje prihodnjih napak

- Vse mesečne vrednosti so sedaj validirane pred vnosom v bazo
- Avtomatsko kopiranje vadnin ima dodatne varnostne ukrepe
- Boljše sporočila o napakah omogočajo hitrejšo identifikacijo problemov

## Tehnične podrobnosti

### Validacija meseca
```javascript
if (month < 0 || month > 11) {
    console.error(`❌ Neveljaven mesec: ${month}`);
    // Prikaži napako uporabniku
    return;
}
```

### Čiščenje neveljavnih podatkov
```javascript
const invalidFees = allFees.filter(fee => fee.month < 0 || fee.month > 11);
await supabase.from('swimmer_monthly_fees').delete().in('id', invalidFees.map(fee => fee.id));
```

### Izboljšano rokovanje z napakami
```javascript
if (error.code === '23514' && error.message.includes('swimmer_monthly_fees_month_check')) {
    // Specifična obravnava constraint violation napake
    const integrityCheck = await checkDatabaseIntegrity();
    // Predlagaj čiščenje, če je potrebno
}
```

## Opombe

- Vse funkcije so dodane z minimalnimi spremembami obstoječe kode
- Ohranjena je kompatibilnost z obstoječimi funkcionalnostmi
- Dodani so obsežni console.log zapisi za lažje debugiranje
- Uporabniški vmesnik je posodobljen z novimi gumbi za upravljanje
