# CSV Uvoz - Format terminov

## 📋 Format terminov za CSV uvoz

### Podprti formati terminov:

#### 1. **Format ID termina (priporočeno)**
Format: `pon-17:00-18:00`

Primeri:
- `pon-17:00-18:00`
- `sre-20:00-21:00`
- `tor-06:15-07:30`

**Format:** `dan-ura-ura`
- **dan**: pon, tor, sre, čet, pet, sob, ned (majhne črke, brez pike)
- **ura**: HH:MM (brez sekund)
- **ločilo**: vejica (`-`)

#### 2. **Format z vejico in sekundami (avtomatska pretvorba)**
Format: `Pon.-20:00:00-21:00:00`

Primeri:
- `Pon.-20:00:00-21:00:00`
- `Tor.-06:15:00-07:30:00`
- `Sre.-20:00:00-21:00:00`
- `Čet.-20:00:00-21:00:00`

**Format:** `Dan.-HH:MM:SS-HH:MM:SS`
- **Dan**: Pon., Tor., Sre., Čet., Pet., Sob., Ned. (s piko)
- **ura**: HH:MM:SS (s sekundami)
- Sistem **avtomatsko pretvori** v format ID (`pon-20:00-21:00`)

### Več terminov v CSV:

Termini morajo biti ločeni z vejico, celoten seznam pa mora biti v narekovajih:

```csv
first_name,last_name,terms
Janez,Novak,"pon-17:00-18:00,sre-18:00-19:00"
Maja,Kovač,"Pon.-20:00:00-21:00:00,Čet.-20:00:00-21:00:00"
```

### Primer CSV datoteke:

```csv
first_name,last_name,email,phone,address,postal_code,terms
Janez,Novak,janez@example.com,040123456,Trg svobode 1,1000 Ljubljana,"pon-17:00-18:00,sre-18:00-19:00"
Maja,Kovač,maja@example.com,041234567,Cesta 15,4000 Kranj,"Pon.-20:00:00-21:00:00,Čet.-20:00:00-21:00:00"
Peter,Horvat,,,"","","tor-06:15-07:30"
```

### Pomembno:

1. **Termin mora obstajati v bazi** - sistem preverja, ali termin z danim ID-jem obstaja
2. **Če termin ne obstaja**, se ignorira in se izpiše opozorilo v konzolo
3. **Prazni termini** (`""` ali prazno polje) se ignorirajo
4. **Separator** mora biti vejica ali podpičje - sistem ga avtomatsko prepozna

### Kako najti ID termine v bazi:

1. Odpri `admin.html`
2. Pojdi v sekcijo "Termini"
3. V "Upravljanje terminov" so prikazani vsi termini z njihovimi ID-ji
4. Format ID: `pon-17:00-18:00` (dan-ura-ura)

### Format ID termina:

ID termina se generira po formuli:
```
${dan.toLowerCase().replace('.', '')}-${start_time}-${end_time}
```

Primer:
- Dan: `Pon.` (ponedeljek = 1)
- Začetna ura: `17:00`
- Končna ura: `18:00`
- **ID**: `pon-17:00-18:00`

