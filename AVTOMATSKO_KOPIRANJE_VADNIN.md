# 🔄 Avtomatsko kopiranje vadnin iz prejšnega meseca

## 📋 Pregled funkcionalnosti

Sistem sedaj vključuje **avtomatsko kopiranje vadnin** iz prejšnega meseca v trenutni mesec. To rešuje problem manjkajočih vadnin za trenutni mesec.

## 🎯 Kaj se kopira

### Izvorni mesec
- **Prejšnji mesec** - vse obstoječe vadnine iz prejšnega meseca (dinamično)

### Ciljni mesec
- **Trenutni mesec** - vadnine se kopirajo v trenutni mesec (dinamično)

## 🚀 Kako deluje

### 1. Avtomatsko preverjanje
- **Ob nalaganju admin strani**: Sistem preveri, ali obstajajo vadnine za trenutni mesec
- **Ob prehodu v finance sekcijo**: Sistem preveri stanje vadnin in avtomatsko kopira, če je potrebno

### 2. Pametno kopiranje
- Kopirajo se samo vadnine, ki še ne obstajajo za trenutni mesec
- Ohranijo se vse nastavitve (mesečna pristojbina)
- **Popusti se ne kopirajo** - nastavijo se na 0 za nov mesec

### 3. Varnost
- Uporablja se `upsert` z `onConflict` - obstoječe vadnine se ne prepišejo
- Kopirajo se samo vadnine, ki že obstajajo v sistemu
- Vse operacije so logirane v konzoli

## 🎮 Uporaba

### Avtomatsko kopiranje
Sistem **avtomatsko** kopira vadnine, ko:
- Naloži se admin stran
- Preide se v finance sekcijo
- Ni vadnin za trenutni mesec

### Ročno kopiranje
1. Pojdite v **Finance** sekcijo
2. Kliknite gumb **"🔄 Kopiraj vadnine iz prejšnega meseca"**
3. Počakajte na potrditev uspešnega kopiranja

### Preverjanje stanja
1. Pojdite v **Finance** sekcijo
2. Kliknite gumb **"🔍 Preveri stanje vadnin"**
3. Preberite poročilo o stanju vadnin za trenutni mesec

## 📊 Sporočila sistema

### Uspešno kopiranje
```
✅ Uspešno kopiranih X vadnin iz [prejšnji mesec] v [trenutni mesec]!
```

### Manjkajoče vadnine
```
⚠️ Ni vadnin za trenutni mesec [mesec]/[leto]
```

### Vse vadnine obstajajo
```
✅ Vadnine za trenutni mesec [mesec]/[leto] obstajajo (skupaj X vadnin)
```

## 🔧 Tehnični podrobnosti

### Funkcije
- `copyPreviousMonthFees()` - glavna funkcija za kopiranje
- `autoCopyFeesIfNeeded()` - avtomatsko preverjanje in kopiranje
- `checkFeesStatus()` - preverjanje stanja vadnin

### Baza podatkov
- Tabela: `swimmer_monthly_fees`
- Konflikt: `swimmer_id, month, year`
- Strategija: `upsert` z `onConflict`

### Logiranje
Vse operacije so podrobno logirane v konzoli brskalnika:
```
🔄 Začenjam kopiranje vadnin iz [prejšnji mesec] v [trenutni mesec]...
🔍 Najdenih X vadnin iz prejšnega meseca za kopiranje
✅ Uspešno kopiranih X vadnin za trenutni mesec
```

## ⚠️ Omejitve

### Popusti
- Popusti se ne kopirajo v nov mesec
- Za nov mesec se popusti nastavijo na **0**

### Časovni okvir
- Kopirajo se vadnine za **trenutni mesec**
- Sistem deluje dinamično za vse mesece

### Odvisnosti
- Mora obstajati **vsaj ena vadnina iz prejšnega meseca**
- Sistem zahteva dostop do Supabase baze

## 🚨 Reševanje težav

### "Ni vadnin za prejšnji mesec"
- Preverite, ali obstajajo vadnine za prejšnji mesec
- Uvozite CSV datoteko z vadninami za prejšnji mesec

### "Napaka pri vnašanju novih vadnin"
- Preverite povezavo z bazo podatkov
- Preverite RLS politike v Supabase
- Preverite konzolo za podrobnosti napake

### "Gumb za kopiranje vadnin ni bil najden"
- Preverite, ali je admin.html pravilno naložen
- Preverite, ali obstaja element z ID `copyFeesBtn`

## 📈 Prihodnje izboljšave

### Avtomatsko kopiranje za nove mesece
- Sistem že avtomatsko kopira vadnine za vse nove mesece
- Dinamično kopiranje iz prejšnega meseca

### Pametno kopiranje popustov
- Možnost nastavitve popustov za posamezne mesece
- Avtomatsko kopiranje popustov po vzorcu

### E-pošta obvestila
- Obvestila administratorju o uspešnem kopiranju
- Poročila o manjkajočih vadninah

---

**Avtor**: Sistem za vodenje prisotnosti plavalcev  
**Datum**: December 2024  
**Verzija**: 1.0
