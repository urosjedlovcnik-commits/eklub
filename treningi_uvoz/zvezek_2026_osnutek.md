# Prepis zvezka: treningi 2026 (osnutek za pregled)

Stanje 22. 11. 2026: šifrant (razdelek 2) je v bazi. Pregledani treningi (✔, tedni 8.–24. 6.) so v bazi kot »izveden«. **Pregled nadaljujeva pri tednu 14. 9.** Nepregledani treningi so samo v `zvezek_2026.json` in jih generator že uporablja.

Oznake:

- **(?)** pomeni, da zapisa nisem zanesljivo prebral ali ne vem, kaj pomeni.
- **↑ / ↓** sta tvoja znaka za prvo in drugo dolžino (v zvezku krog s puščico gor in puščica dol), npr. `6x50 ↑K ↓M` = tja kravl, nazaj mešano (potrjeno).
- Na koncu vsakega treninga je vsota iz zvezka.
- Nivo je določen po razplavanju: **200 RAZP = C** (sreda), **300 RAZP = A** (oz. A+B ob pon/čet).

## 1. Kaj sem razbral (povzetek)

- **50 treningov** (junij 2026 ter september–november 2026), od tega 12 za nivo C.
- Zgradba povsod ustreza potrjeni: razplavanje → ogrevalna → 1–3 vaje (pogosto s `PL`) → vmesno razplavanje 50 m → glavna → (zaključek) → 50–100 m razplavanja.
- **`CRP` iz prvega pogovora je v resnici `RAZP` = razplavanje.**
- Glavne serije so zelo raznolike: 4x100 KVL, 12x50 3+1, gnezdeni bloki `3x( … )`, `5x(5x50 …)`, lestvice `3x100 2' / 3x50 1' / 2x100 2' …`, piramide `25D 50H 75P 100K 75P 50H 25D`, neprekinjeno `300 VL / 200 M / 100 K hitro / …`.

## 2. Nove kratice in izrazi

### 2a. Potrjeno (prvi sklop, 22. 11. 2026)

| Zapis v zvezku | Pomen | Opomba |
|----------------|-------|--------|
| `RAZP`, `RAZ` | razplavanje | |
| `CT` | cela tehnika | |
| `N/V/CT` | noge / vaje / cela tehnika | menjava po dolžinah ali po ponovitvah |
| ↑ … ↓ … | ena smer … / druga smer … | v aplikaciji gumba ↑ in ↓ |
| `!` | Max | `K!` = kravl Max |
| `BD` | brez dihanja | `KBD` = kravl brez dihanja |
| `MBK`, `MBD`, `MBP` | mešano brez kravla / delfina / prsnega | |
| `KVL` | kravl z valčkom in lopatkami (`K` + `VL`) | |
| `ZD` | z desko (`DE`) | tudi `Z DESKO`, `DESKA` |
| `STOP` | stopnjevano (= `ST`) | `4x50 K STOP` = stopnjevano 1-4 po ponovitvah; `STOP PO 25` = vsakih 25 m hitreje |
| `KZ` | kravl, vaja zavesljaji | dve različici: dihanje na stran zavesljaja, dihanje kontra (`KZ DK`, `KZ DIH KONTRA`) |
| `PPV` | prsno pod vodo | v `6x50 ↑PPV ↓…` je nazaj germanja |
| `POPAJ` | vaja za sculling | |
| `DOLGO`, `NA DOLGO` | počasi | |

### 2b. Potrjeno (drugi sklop, 22. 11. 2026)

| Zapis v zvezku | Pomen | Opomba |
|----------------|-------|--------|
| `BOK` | noge na boku | `KN BOK`, `DN BOK` |
| `MAX OBRAT` | šprint v obrat in iz njega, čim hitreje | |
| `DIH 3-5-7` (tudi `DIH 3/4/5`, `DIHANJE 3,5,7`) | na koliko zavesljajev vdihneš | pri 75 m se vsakih 25 m diha drugače; `DIH NA 1` = vdih ob vsakem zavesljaju |
| `Z ZAMIKOM` | mešano, vsakih 100 m začneš z naslednjo tehniko | pravilni vrstni red je D, H, P, K; z zamikom npr. H, P, K, D |
| `4-3-2-1` | razdelitev intenzivnosti: 4 POČ, 3 T, 2 HIT, 1 Max | `10x50 PL K 4-3-2-1 55"` |
| `7-5-3` | dihanje (na 7, 5, 3 zavesljaje) | `4x75 PL D 7-5-3` |
| `6-1` | vaja hrbtno: na 6 udarcev nog zamenjaš roki | `6x25 PL D 6-1` |
| `1-1-2` | vaja delfin: 1 zavesljaj z levo, 1 z desno, 2 cela koordinacija | |
| `2-2-2` | enaka vaja kot `1-1-2`, z enim zavesljajem več | |
| `DV 3-3`, `D 3-3` | delfin: 3x noge, 3x cela koordinacija | |
| `2+1` | 2 tempo, 1 hitro (analogno `3+1`) | lahko v kateri koli tehniki |
| `L/D` | 25 m leva roka, 25 m desna roka | `8x50 KV L/D` |
| `ČMZ` | čim manj zavesljajev | |
| `MM BP` | mešano menjajoče brez prsnega | |
| `STIL` | prosta izbira tehnike (plavalci izberejo) | npr. del glavne serije ni kravl |
| `PREVAL` | preval (obrat) | `8x25 PL + PREVAL` |
| `KR` | ? vaja pri DN | `↓DN KR` |
| `NPV` | noge pod vodo | `3xBD 1xNPV` |
| `DN PV` | delfin noge pod vodo | |
| `PV 1-2`, `PV 1-3` | prsno vaja: 1 zavesljaj, 2 ali 3 udarci nog | pozor: številke pomenijo drugače glede na tehniko/vajo (pri `ST` je `1-3` stopnjevanje) |
| `p15"` | pavza | v zvezku `15" PAVZE`, `5"` |
| `1xN 1xCT`, `1xVL 1xK` | izmenično po ponovitvah | |
| `DOLGO`, `NA DOLGO` | počasi | pri `KV` pomeni dolg zavesljaj |

Pravila iz pregleda treningov:

- **Privzeti štart glavne serije**, če v zvezku ni zapisan: 50 m `@1'`, 75 m `@1'30"`, 100 m `@2'`, 200 m `@3'30"`.
- **Nivo C** nima izrazitih glavnih serij, so lažje; ponovitve so lahko različne (npr. `4x100 M`: K PL, P, K, P).
- **Izjemoma dve glavni seriji**: ena je glavna (velja zanjo pravilo 2 mesecev), druga je *stranska* (npr. 10. 6. A: SIMULATOR glavna, `6x100 VL DOLGO` stranska).

Še odprto: `3-3-6` (`8x25 PL K 3-3-6`, 23. 9., C) ni znano, kaj je bilo mišljeno.

### 2c. Vaje

| Vaja | Razlaga |
|------|---------|
| `PD` | prsno drsenje (vaja) |
| `HITLER` | HV: roka gre ven iz vode, pri 90° se dotakneš prsnega koša, nato nadaljuješ |
| `SUPERMAN` | kravl noge, ena roka ob telesu, druga spredaj; dihaš na stran |
| `SHARK 1` | kravl vaja: komolec zadržiš visoko nad ramo 2–3 s, nato nadaljuješ |
| `SHARK 2` | ko pride komolec do rame, roko vrneš nazaj ob telo, nato cel zavesljaj |
| `SHARK 3` | roko vrneš ob telo in pod vodo naprej do izhodišča, nato cel zavesljaj |
| `VATERPOLO` | kravl z glavo nad vodo |
| `SCULLING` | sklop vaj za občutek za vodo, plava se zelo počasi |
| `POPAJ` | ena od vaj sculling |
| `RRU` | sklop kravl vaj, kjer roka vedno počaka drugo (roka roka ujame) |
| `ZADRGA` (zipper) | RRU: s palcem vlečeš po robu telesa ves čas do rame |
| `RRU PESTI` | RRU s stisnjeno pestjo |
| `RRU PALEC` | RRU: s palcem se dotakneš stegna in pazduhe |
| `RRU ŠPRICANJE` | RRU: ob koncu potega izpljuskneš vodo ven |
| `GERMANJA` | pomožna tehnika; za razplavanje ali v kombinaciji s hrbtno nogami kot vaja za podvodni del hrbtnega potega |
| `ORKA` | delfin noge, samo podvodni del zavesljaja, roke vrneš naprej |
| `ROTACIJA` | predvsem pri hrbtno nogah ali vajah za rotacijo ramenskega obroča |
| `VISOK KOMOLEC` | kot K CT ali KV RRU; čim višje zarotiraš ramenski obroč, dvigneš ramo in komolec |
| `SIMULATOR` | vaja hitrosti: 50 m, natanko 10 s počitka, 50 m; vsota je simuliran čas na tekmi |
| `90°` | noge hrbtno ali kravl z roko iz vode; ali hrbtno RRU, kjer roka čaka zunaj |
| `PACMAN` | z lopatkami: lopatko držiš na dnu, sili te v pravilen poteg |
| `MENJAMO POLOŽAJ` | pri DN: hrbet, trebuh, en bok, drugi bok |
| `ČIM DLJE POD VODO` | plavanje pod vodo: prsno, kravl, delfin ali hrbtno noge |
| `ZADUŠNICA` | zadnjih 7 m pod vodo: potopiš se in v cilj prideš z delfin nogami |
| `ROTULJICA` | metuljček, pomožna tehnika med delfinom in prsnim |
| `KRAJŠANJE` | PV: trije zaporedni zavesljaji, vsak krajši (dolg, srednji, kratek), nato spet dolg |
| `ROKA UZ ZAVES` | HV, kombinacija z 90°: hrbtno zavesljaji, druga roka je zunaj |
| `RINEŠ` | RRU: dlan med vračanjem naprej pod vodo porineš naprej |

Vse vaje iz zvezka so razložene.

### 2d. Popravki po ponovnem branju (23. 11. 2026)

Potrjeno in popravljeno v bazi (kjer se razdelek 3 razlikuje, velja ta tabela):

| Trening | Prej | Zdaj |
|---------|------|------|
| 10. 6. A | `3x100 SIMULATOR` + enkrat 50 RAZP | `3x( 100 SIMULATOR / 50 RAZP )` |
| 10. 6. C | `8x25 PL M CT p10"` | `8x25 PL H CT p10"` |
| 11. 6. A+B | `8x25 PL D 3-3` | `8x25 PL DV 3-3` |
| 17. 6. C | `8x25 PL MN 90°` | `8x25 PL HN 90°` |
| 17. 6. C | `4x50 DESKA 1xN 1xKN` | `4x50 DESKA 1xPN 1xKN` |
| 18. 6. A+B | `10x25 PL ↑DN PV ↓M CT` | `10x25 PL ↑DN PV ↓H CT` |
| 24. 6. C | `8x25 PL PREVAL` | `8x25 PL KN + PREVAL` |
| 24. 6. C | `8x25 PL KN KZ 4x NOGE` | `8x25 PL KZ 4x NORMALNO 4x OBRATNO` |
| 24. 6. C | 50 RAZP pred glavno | 50 RAZP pred glavno in po njej |
| 24. 6. A | `10x25 PL POČASI + SPRINT` | `10x25 PL PREVAL + SPRINT` |

| 10. 6. A | `4x50 PL HV HITLER 1x 2-2-2` | `4x50 PL 1x BIONDI 1x 2-2-2` |
| 10. 6. A | `8x25 PL HITRO` | `8x25 PL HITLER` |
| 10. 6. C | `4x100 M 1x K PL …` | `4x100 1x K PL …` (M je pomenil metre) |
| 11. 6. A+B | `12x50 3+1` | `12x50 5+1` |

Potrjeno brez spremembe: 18. 6. glavna je `4x( … )`; 24. 6. C `16x25` je štirikrat 3+1 (H, K, H, K).

**BIONDI** je skoraj enak kot **ORKA**; v istem treningu nikoli skupaj.

### 2e. Teden 14. 9. (odgovori 23. 11. 2026)

| Zapis | Pomen |
|-------|-------|
| `4x50 PL K RRU SHARK 1` (14. 9.) | 4x50; vsota v zvezku je za 200 m previsoka |
| `4x25 25! 25 RAZP` (14. 9.) | izmenično: ena Max, ena razplavanje |
| 17. 9. štarti | `4x50 KN @1'10"`, `4x50 25 D + 25 RAZP @1'` |
| `PD ↑3 ↓5` (16. 9. C) | sekunde drsenja |
| `KZ 25-25` (16. 9. C) | 25 m ena roka, 25 m druga |
| `8x25 PL ↑PV ↓HN ROTACIJA` (16. 9. A) | |
| `4x50 PL ↑VATERPOLO ↓HN RRU 90°` (16. 9. A) | |
| `6x25 KN p10"`, `4x25 1x K! 1x RAZP p30"` (14. 9.) | pavze |
| `3x( 100 / 50 / 50 RAZP )` (16. 9. A) | 1x VL, 1x K, 1x 100 M + 50 stil (`S` = stil) |

### 2f. Teden 21. 9. (odgovori 23. 11. 2026)

| Zapis | Pomen |
|-------|-------|
| `RV` | roka ven, 90° (`KN RV`) |
| `PPDZ` | RRU: ponavljaj prednji del zavesljaja |
| `4x100 KV` (21. 9.) | `KVL` |
| `10x25 K ŠTETJE` (21. 9.) | šteje zavesljaje (prej prebrano STOP) |
| 24. 9. | vsota v zvezku je za 100 m prenizka; glavna je vse od `3x100 VL` do `3x50 HITRO` |
| `3x100 PL 75 VISOK KOMOLEC DOLGO + 25 N!` (24. 9.) | `!` = noge max |
| `3x50 PL 25 DN PV + 25 HN` (24. 9.) | odprto: `DN PV` ali `DV PV` |
| `K 6-3-6` | 6 udarcev na boku, 3 zavesljaji, 6 udarcev na drugem boku (prej `3-3-6`) |
| `H 3-1` | trije udarci, 1 koordinacija |

Kratice, ki sem jih verjetno napačno prebral in so že v šifrantu (čakajo na potrditev): `ZADUŠNICA` = `ZADNJIH 7 DN`, `ROTULJICA` = `METULJČEK`, `ROKA UZ ZAVES` = `ROKA VEN ZAVES`.

## 3. Treningi

### Junij 2026

**8. 6. 2026 (pon, A+B)** ✔: 300 RAZP; `8x50 KV 1x L/D, 1x ČMZ`; `8x25 PL 40" 3xBD 1xNPV`; `4x50 K PL MAX OBRAT`; 50 RAZP; glavna `4x100 KVL 2'`, `4x100 K T 1'50"`, `4x100 M 2'`; 50 RAZP. **Σ 2,40**

**11. 6. 2026 (čet, A+B)** ✔: 300 RAZP; `4x100 M Z ZAMIKOM`; `8x25 PL D 3-3`; `4x50 PL K DIH 5-7`; 50 RAZP; glavna `12x50 3+1 @1'` (privzeti štart), `6x100 K 2+1 @2'` (privzeti štart); 50 RAZP. **Σ 2,40**

**10. 6. 2026 (sre, C)** ✔: 200 RAZP; `4x50 ↑PD ↓K RRU`; `8x25 PL KN SUPERMAN`; `4x50 PL HV RRU`; `8x25 PL M CT p10"`; 50 RAZP; glavna `4x100 M`: 1x K PL, 1x P, 1x K, 1x P; 50 RAZP. **Σ 1,60**

**10. 6. 2026 (sre, A)** ✔: 300 RAZP; `16x25 M p5" N/CT`; `4x50 PL HV HITLER 1x 2-2-2`; `8x25 PL … HITRO` (?); 50 RAZP; glavna `3x100 SIMULATOR` + 50 RAZP; stranska glavna `6x100 VL DOLGO`; 50 RAZP. **Σ 2,25**

**15. 6. 2026 (pon, A+B)** ✔: 300 RAZP; `6x75 1x MBP, 1x K DIH 3-4-5`; `6x50 PL 1xN 1xT 1'`; `8x25 PL 1xD DIH NA 1, 1xK 2-2`; 50 RAZP; glavna (lestvica) `3x100 KVL @2'`, `3x50 T 50"`, `2x100 M @2'`, `2x50 1'`, `100 D/K @2'`, `50 D @1'`; 100 RAZP. **Σ 2,20**

**18. 6. 2026 (čet, A+B)** ✔: 300 RAZP; `3x100 M (N, V, CT)`; `10x25 PL ↑DN PV ↓M CT`; `6x50 PL SHARK 1 / SHARK 2`; 50 RAZP; glavna `4x( 75 K T 1'30" / 50 K HITRO 1' / 25 D + takoj 50 RAZP )`; 100 RAZP. **Σ 2,30**

**17. 6. 2026 (sre, C)** ✔: 200 RAZP; `4x75 H, P, K`; `PV 1-2, 1-3, 1-2`; `8x25 PL MN 90°`; `4x50 PL KV RRU ZADRGA / RRU PESTI`; glavna `6x50 25 K CT HITRO + 25 RAZP`; 50 RAZP; zaključek `4x50 DESKA 1xN 1xKN`; 50 RAZP. **Σ 1,50**

**17. 6. 2026 (sre, A)** ✔: 300 RAZP; `4x75 M VB1T`; `4x75 PL 25 K MAX NOGE / 25 H / 25 BD`; 50 RAZP; glavna `4x75 KVL @1'30"`, `4x75 STOP PO 25 @1'30"`, `4x75 1'15"`, `4x75 DESKA P/K @1'30"`; 50 RAZP. **Σ 2,20**

**22. 6. 2026 (pon, A+B)** ✔: 300 RAZP; `6x50 MM BP`; `6x50 PL ↑DN ↓H RRU 90°`; `6x50 PL ↑KN BOK ↓K RRU PESTI`; 50 RAZP; glavna `6x50 KVL 1'`, `6x50 PL MAX NOGE 1'10"`, `6x50 50"`, `6x50 KVL 1'`; 50 RAZP. **Σ 2,50**

**24. 6. 2026 (sre, C)** ✔: 200 RAZP; `4x50 ↑K ↓H` (H: HV RRU ob telesu) / `↑P ↓H` (H: HV RRU zgoraj); `8x25 PL + PREVAL`; `8x25 PL KN KZ 4x NOGE …` (?); 50 RAZP; glavna `16x25 p15"`: 3xP 1xH, 3xP 1xK, 3xP 1xH, 3xP 1xK; SCULLING VAJE. **Σ 1,25**

**24. 6. 2026 (sre, A)** ✔: 300 RAZP; `10x25 PL POČASI + SPRINT`; `6x50 PL ↑VATERPOLO ŠPRICANJE ↓DN KR`; `4x75 MBD CT, N, V, CT`; 50 RAZP; glavna `2x200 VL 3'30"`, `2x100 50 HITRO + 50 POČASI @2'`, `2x50 1x STIL 1x K! @1'`; 50 RAZP; `8x25 SCULLING`; 50 RAZP. **Σ 2,20**

### September 2026

**14. 9. 2026 (pon, A+B)**: 300 RAZP; `16x25 M 1xN 1xCT`; `4x50 PL KRRU SHARK`; `8x25 PL SCULLING`; 50 RAZP; `6x50 KVL`; `6x25 KN`; `4x50 K STOP`; `4x25 25! 25 RAZP` (?); 50 RAZP. **Σ 2,15**

**17. 9. 2026 (čet, A+B)**: 300 RAZP; `4x75 M VB1T`; `4x50 PL KN`; `4x50 PL KV 2-2`; 50 RAZP; `4x50 KN`; `4x50 K 1'`; `4x50 KVL 1'`; `4x50 K 55"`; `4x50 25 D + 25 RAZP`; 50 RAZP. **Σ 2,10**

**16. 9. 2026 (sre, C)**: 200 RAZP; `4x50 PD ↑3 ↓5` (?); `6x25 PL KN BOK`; `6x25 PL KZ 25-25` (?); `6x25 PL KRRU`; `6x25 K`; 50 RAZP; `2x150 1x P / 1x P/H/P` (?); 50 RAZP. **Σ 1,40**

**16. 9. 2026 (sre, A)**: 300 RAZP; `6x50 ↑N ↓CT 1x4 M/K` (?); `8x25 PL ↑PV ↓MN` (?); `4x50 PL ↑VAJE ↓HN RRU` (?); `4x50 KN MAX ↑ ↓M PL` (?); 50 RAZP; `4x( 100 + 50 + 50 RAZP ): 1x VL, 1x K, 1x 100 M + 50 D` (?); 100 RAZP. **Σ 1,95**

**21. 9. 2026 (pon, A+B)**: 300 RAZP; `6x50 ↑K ↓M V/CT`; `8x25 PL KN ZV` (?); `4x50 K RRU PESTI` (?); 50 RAZP; `4x100 KVL`; `4x50 1'`; `4x25 D + 25 R` (?); 100 RAZP; `10x25 K STOP` (?); 50 RAZP. **Σ 2,25**

**24. 9. 2026 (čet, A+B)**: 300 RAZP; `4x100 M Z ZAMIKOM CT/N/V/CT`; `3x100 VL DOLGO`; `3x50 VL 55"`; `3x100 PL 45" VISOK KOMOLEC POČASI 25 N` (?); `3x50 PL 25 DN P (?) + 25 N`; `3x100 2' TEMPO`; `3x50 1' HITRO`; 50 RAZP; `6x25 POPAJ` (?); 50 RAZP. **Σ 2,20**

**23. 9. 2026 (sre, C)**: 200 RAZP; `6x50 ↑P ↓H/K`; `8x25 PL KN …` (?); `8x25 PL K 3-3-6` (?); `6x25 PL KZ DK` (?); `6x25 K`; 50 RAZP; `6x50 STIL (?) 15" PAVZE`; 50 RAZP. **Σ 1,60**

**23. 9. 2026 (sre, A)**: 300 RAZP; `8x50 MM`; `8x25 PL ↑VATERPOLO ↓M 3-1` (?); `4x50 PL RRU SHARK / RINEŠ`; 50 RAZP; `3x( 6x50 1': 1x VL, 1x K, 1x K vsak 3. 25 D / 25 H )` (?); 50 RAZP; `6x25 KBD`; 50 RAZP. **Σ 2,30**

**28. 9. 2026 (pon, A+B)**: 300 RAZP; `25 D, 50 H, 75 P, 100 K, 75 P, 50 H, 25 D`; `4x50 PL ↑P 2-2-2 ↓KN DR` (?); `10x50 PL K 4-3-2-1 55"`; 50 RAZP; `8x50 KVL`; `6x50 ↑PV ↓M`; `4x50 ↑S! ↓RAZP`; 50 RAZP. **Σ 2,40**

### Oktober 2026

**1. 10. 2026 (čet, A+B)**: 300 RAZP; `4x75 MM 25+50`; `4x50 1' + 2x100 2'`; `2x100 VL 1'50" + 4x50 35"` (?); 50 RAZP; `10x25 PL ↑KN PV ↓DN KR` (?); `4x50 PL RRU … / RRU ŠPRICANJE` (?); `4x25 + 25 ↑D/K! ↓RAZP`; 100 RAZP. **Σ 2,30**

**30. 9. 2026 (sre, C)**: 200 RAZP; `4x50 ↑PN NA H (?) ↓P 1-3`; `8x25 PN Z DESKO` (?); `8x25 P 1-2 KRAJŠANJE`; `8x25 P ČIM DLJE POD VODO`; 50 RAZP; `4x50 PL KN ZD 15"`; `4x50 PL KRRU`; 50 RAZP. **Σ 1,50**

**30. 9. 2026 (sre, A)**: 300 RAZP; `4x75 MBD N/V`; `8x25 PL ↑PRS BD (?) ↓MN POČASI`; `4x50 PL KN ZD 1'…` (?); `8x25 ↑DELFIN ↓M`; `4x50 KN ZD 1'15"`; 50 RAZP; `6x75 KVL`; `6x25 POPAJ` (?); 50 RAZP. **Σ 2,10**

**5. 10. 2026 (pon, A+B)**: 300 RAZP; `16x25 M N/CT POČ`; `8x25 PL K ZADUŠNICA DV` (?); `6x50 PL DV ORKA KV PESTI`; 50 RAZP; `200, 100, 50 … / 50, 100, 200 KVL` (lestvica, ?); 50 RAZP; `6x25 VATERPOLO`; `6x25 KBD 20"`; 50 RAZP. **Σ 2,35**

**8. 10. 2026 (čet, A+B)**: 300 RAZP; `4x100 M PO 100 CT/N/V/CT`; `4x100 KVL`; `3x100 MEŠANO`; `2x100 PL NOGE`; `1x100 HITRO`; 50 RAZP; `8x25 PL K … BD` (?); `6x50 1 DN BOK, 1x DV 1-1-2` (?); 50 RAZP. **Σ 2,30**

**7. 10. 2026 (sre, C)**: 200 RAZP; `4x50 H/P, K/P`; `4x50 KN PL DESKA`; `8x25 KN PL ZAVESLJAJI` (?); `10x25 K CT`; 50 RAZP; `6x50 ↑HITRO ↓RAZP`; 100 RAZP. **Σ 1,50**

**7. 10. 2026 (sre, A)**: 300 RAZP; `6x50 K/D MP` (?); `8x25 PL ↑K! ↓RAZP`; `6x50 PL KV RRU 3S DND` (?); 50 RAZP; `6x25 + 25 RAZP K! BD`; `6x50 K 1' BREZ VDIHA` (?); `6x50 KVL`; 50 RAZP; `6x25 PPV`; 50 RAZP. **Σ 2,30**

**12. 10. 2026 (pon, A+B)**: 300 RAZP; `8x50 MM 4xCT 4xNOGE`; `5x( 5x50 (3+1+1) TEMPO, HITRO, RAZP )` s štarti `CT 1'05", N 1'20", CT 1', N 1'15", CT 55"`; `8x25 PL ↑D 5 ZAVES ↓K 2-2`; `4x50 PL 1x PL DN, 1x KRRU SHARK`; 50 RAZP. **Σ 2,40**

**15. 10. 2026 (čet, A+B)**: 300 RAZP; `6x50 H/K ↑V ↓CT`; `8x25 PL DN MENJAMO POLOŽAJ`; `4x50 PL HV 90° / HV … RAMENA` (?); 50 RAZP; `6x25 NOGE 35"`; `6x50 KVL 1'10"`; `6x25 NOGE 30"`; `6x50 K PL 1'`; 100 RAZP; `4x25 PPV`. **Σ 2,10**

**14. 10. 2026 (sre, C)**: 200 RAZP; `4x75 PRSNO 1-2, 1-3, D`; `4x50 HN PL ROTACIJA`; `8x25 PL HV ROKA UZ ZAVES`; `8x25 HRBTNO`; 50 RAZP; `4x75 50 P + 25 K/H` (?); 50 RAZP. **Σ 1,50**

**14. 10. 2026 (sre, A)**: 300 RAZP; `4x100 PL (25 CT + 75 N/V/C)` (?); `10x25 PL ↑DR KN ↓SCULLING HRN` (?); `4x75 DIHANJE 3, 5, 7`; 50 RAZP; `5x( 100 T + 25 MAX + 25 … )` (?); 100 RAZP. **Σ 2,15**

**19. 10. 2026 (pon, A+B)**: 300 RAZP; `6x75 MBK N/V/CT`; `3x100 2' (VL)`; `3x50 1'`; `2x100 2'`; `2x50 1'`; `100 2'`; `50 1'`; 50 RAZP; `4x50 PL ↑KN ↓ČIM DLJE POD VODO`; `10x25 PL DN PL` (?); 50 RAZP. **Σ 2,20**

**22. 10. 2026 (čet, A+B)**: 300 RAZP; `3x150 PL K N/V/CT`; `4x50 PL … NA POL …` (?); `8x25 DN PV NOM – DV 2-2` (?); 50 RAZP; `4x25 D`; `4x50 1'`; `4x100 KVL`; `4x50 50"`; `4x25 1x! 1x M`; 50 RAZP. **Σ 2,20**

**21. 10. 2026 (sre, C)**: 200 RAZP; `4x75 50 P D DO 3 (?) + 25 M`; `8x25 PL KV 2-2`; `8x25 PL KV RRU 3S` (?); `4x50 (K 25/25/50)` (?); 50 RAZP; `3x100 75 P + 25 K`; 50 RAZP. **Σ 1,50**

**21. 10. 2026 (sre, A)**: 300 RAZP; `16x25 MEŠANO 4xCT, 4xN, 4xV, 4xCT` (?); `2x( 8x25 1x DV + SHARK, 1x RRU PESTI … )` (?); `2x( 4x50 KVL 1x 1', 1x 50" )`; `2x( 2x100 MEŠANO NOGE DESKA )` (?); `2x200 3'30"`; 100 RAZP. **Σ 2,40**

**26. 10. 2026 (pon, A+B)**: 300 RAZP; `4x100 PL (25 M + 75 M/K)` (?); `12x25 PL 3x D 1x M VSAKIČ DLJE` (?); `4x50 LOP PACMAN` (?); 50 RAZP; `3x( 50 x50? ): 1. VL 1', 2. K 1', 3. 3.D 1'` (?); 50 RAZP; `8x25 VALČEK PL`; 100 RAZP. **Σ 2,35**

**29. 10. 2026 (čet, A+B)**: 300 RAZP; `8x50 MM ↑CT ↓N`; `300 VL`, `200 MEŠANO`, `100 K HITRO`, `50 NOGE`, `100 K HITRO`, `200 MEŠANO`, `300 VL` (piramida); 50 RAZP; `6x50 K PL RRU: 1x SHARK, 1x ZADRGA`; 100 RAZP. **Σ 2,40**

**28. 10. 2026 (sre, C)**: 200 RAZP; `6x50 P/H K6` (?); `8x25 PL DN H/T/S/B` (?); `8x25 PL DZ L/D` (?); `6x25 PD 6-1` (?); 50 RAZP; `4x25 ROTULJICA`; `200 P, 100 H, 50 K`; 50 RAZP. **Σ 1,60**

**28. 10. 2026 (sre, A)**: 300 RAZP; `4x100 M … N/CT` (?); `8x25 PL ↑VATERPOLO ↓K ČIM DALJŠI`; `4x50 PL H RRU 90° / K 3-1` (?); 50 RAZP; `3x( 100 + 50 )` + 50 RAZP (?); `3x( 50 + 100 … )` (?); 100 RAZP. **Σ 2,20**

### November 2026

**2. 11. 2026 (pon, A+B)**: 300 RAZP; `4x75 VB1T`; `18x25 VALČ ML …` (?); 50 RAZP; `6x100 (2+1) 2'`; 50 RAZP; `4x50 PL KN 1'`; `4x50 PL 25 D V 3-2 (?) / 25 DN …` (?); `8x25 PL ↑DN PV ↓DN M`; 100 RAZP. **Σ 2,25**

**5. 11. 2026 (čet, A+B)**: 300 RAZP; `6x50 ↑N ↓V K/H`; `8x25 PL KN SUPERMAN`; `4x50 PL KZ DIH KONTRA`; 50 RAZP; `3x( 6x50 1': 1x MADŽ, 1x VL, 1x CT )`; 50 RAZP; `6x50 ↑PPV ↓GERMANJA`; 100 RAZP. **Σ 2,40**

**4. 11. 2026 (sre, C)**: 200 RAZP; `4x50 DESKA P/K`; `4x50 PV 1-3, 1-4` (?); `8x25 PR-DN` (?); `6x25 PPV`; `4x50 P 1'15"`; 50 RAZP; `8x25 1x MAX 1x RAZP`; 50 RAZP. **Σ 1,50**

**4. 11. 2026 (sre, A)**: 300 RAZP; `25 D + 50 H + 75 P + 100 K CT`; `25 DV + 50 HV + 75 PV + 100 KV`; `8x25 PL ↑MAX N ↓RAZP`; `4x50 PL ↑DN PR ↓1-1-2` (?); 50 RAZP; `4x50 3+1 1'`; `4x75 STOP 25, 50"` (?); `4x100 1x K 1x M 2'`; 100 RAZP. **Σ 2,25**

**9. 11. 2026 (pon, A+B)**: 300 RAZP; `4x50 MEŠANO V`; `4x50 MEŠANO CT`; `4x50 PL KV 1'10"`; `4x50 PL KV RRU SHARK`; `4x50 K 3+1`; `4x50 K 1-4`; `4x50 K VL 50"`; `4x50 KN 1'20"`; `4x50 ↑K 50 ↓RAZP` (?); `4x50 K/H NA DOLGO`. **Σ 2,30**

**12. 11. 2026 (čet, A+B)**: 300 RAZP; `4x75 MM 25+50`; `10x25 PL ↑K MAX … ↓HRBTNO` (?); `4x50 PL …` (?); 50 RAZP; `3x( 4x100: 1x VL, 1x …, 1x NORMALNO )` (?); 100 RAZP. **Σ 2,40**

**11. 11. 2026 (sre, C)**: 200 RAZP; `6x50 ↑PDS (?) ↓H/K`; `25 + 50 + 75 + 100 + 75 + 50 … K H PRSNO 1-2 + 25` (?); 50 RAZP; `10x25 PL K/H N`; `4x50 PL KV 2-2`; `4x50 PL KRRU PALEC`; 50 RAZP. **Σ 1,65**

**11. 11. 2026 (sre, A)**: 300 RAZP; `8x50 MM`; `8x25 PL ↑DN H (?) ↓PV ŠPRICANJE (?)`; `4x50 KRRU PALEC`; 50 RAZP; `4x100 KVL`; `4x50 MBK`; `4x50 K 50"`; `4x25 + 25 …` (?); … **Σ 2,35**

**16. 11. 2026 (pon, A+B)**: 300 RAZP; `16x25 M POČ ↑N ↓CT`; `3x( 150 VL 3' / 100 TEMPO 2' / 50 HITRO 1' / 25 D + 25 RAZP )`; 50 RAZP; `10x25 PL K ČIM VIŠJI …` (?); `6x50 PL KZ 1x NOR… 1x DIMANJE K` (?); 50 RAZP. **Σ 2,40**

**19. 11. 2026 (čet, A+B)**: 300 RAZP; `4x75 M VB1T`; `4x50 PL K-3 BREZ DIHANJA` (?); `8x25 ↑D DIHANJE NA 1 ↓DV 3-3`; `6x25 D PL MAX ↓RAZP`; 50 RAZP; `4x25 KBD`; `4x50 25 D + 25 K`; `4x75 50 K + 25 D`; `4x100 KVL`; 100 RAZP. **Σ 2,30**

**18. 11. 2026 (sre, A)** (za C ni vpisa): 300 RAZP; `4x100 M PO 100 25 V + 50 V …` (?); `4x75 PL D 7-5-3`; `4x50 PL DV 3-3, 2-2-1`; 50 RAZP; `6x25 KBD + H`; `6x50 KVL`; `6x25 D + H`; `6x50 2+1`; 150 RAZP. **Σ 2,30**

## 4. Kako naprej

1. Skupaj greva čez razdelek 2 (kratice) in nato trening po trening; popravke vpišem sproti.
2. Potrjene kratice in vaje grejo v šifrant v bazi.
3. Potrjeni treningi grejo v knjižnico kot serije (po fazah), z zgodovino uporabe po datumih. Tako bo pravilo 2 mesecev takoj delovalo tudi za te treninge.
