# Plan: sistem za sestavljanje treningov (eKlub)

Status: **pravila potrjena** (22. 11. 2026), pripravljeno za izvedbo. Manjše podrobnosti iz razdelka 8 se dopolnijo med vnosom treningov.

## 1. Cilj

Podstran za trenerja (najprej Uroš), kjer:

1. vodi **knjižnico** vaj, serij in treningov (s kraticami, kot jih piše v zvezek),
2. aplikacija iz knjižnice **sestavi predlog treninga** za izbran termin in datum,
3. trener predlog **popravi in potrdi**, trening se shrani,
4. sistem zagotovi, da se **glavna serija ne ponovi vsaj 2 meseca**.

### Komu in kje (potrjeno 22. 11. 2026)

- Aplikacija se zdaj razvija **samo za Uroša**. Zasnovana je tako, da jo je kasneje mogoče odpreti vsem učiteljem: vse je vezano na `trainer_id`, nič ni zapečeno na enega trenerja.
- Uroš ima samo popoldanske termine, **največ enega na dan**.

| Dan | Nivoji | Kako |
|-----|--------|------|
| ponedeljek, četrtek | **A + B** | **En skupen trening**, vsak nivo v svoji progi. B plava enako, le z manj ponovitvami. |
| sreda | **A** in **C** | **Dva ločena treninga** v istem terminu. |

Posledice za sistem:

- Trening je vezan na **termin + datum + skupino nivojev** (`{A,B}`, `{A}` ali `{C}`). V sredo sta torej v istem terminu dva treninga.
- **Različica za B:** ob treningu za A stran samodejno predlaga B tako, da pri serijah z več ponovitvami odvzame eno (npr. `6x100` → `5x100`). Pri vsaki vrstici so še hitri gumbi za B:
  - **−1 ponovitev**,
  - **daljši štart** (npr. `@1'40"` → `@1'50"`),
  - **+ `PL`** (B plava isto s plavutkami, da lahko dohaja).
  
  Vse lahko tudi ročno popraviš. Na bazenskem listu sta A in B izpisana drug ob drugem.
- **Pravilo 2 mesecev po nivojih** (*potrjeno*; v praksi se serije za A in C tako razlikujejo, da do prekrivanja skoraj ne bo prišlo):
  - zgodovina za A zajema ponedeljek, četrtek in sredo,
  - C ima svojo zgodovino.
  
  Glavna serija, ki jo je nedavno plaval C, je za A še vedno na voljo, in obratno.

### Ista serija in dolžina treninga (potrjeno 22. 11. 2026)

- **Ista glavna serija = povsem enak zapis.** Že drugačno število ponovitev ali drug štart naredi novo serijo: `4x100 K @1'40"`, `5x100 K @1'40"` in `4x100 K @1'45"` so tri različne serije. `fingerprint` je zato normaliziran celoten zapis (ponovitve, razdalje, kratice, režim). Normalizacija odpravi le razlike v pisavi, npr. presledke, `MAX`/`Max` in `50"`/`@50"`.
- **Ciljna dolžina** je razpon, ne ena številka:

| Nivo | Razpon | Kdaj nižje / višje |
|------|--------|---------------------|
| A (in A+B) | **2.200–2.500 m** | Nižje: veliko kratkih ponovitev (25 m), vaje za apnejo. Višje: veliko 100-metrskih. |
| C | **1.400–1.700 m** | Enako pravilo. |

Generator zato ciljno dolžino znotraj razpona določi po vsebini glavne serije: šprint, 25-metrske ponovitve in apneja potisnejo cilj proti spodnji meji, vzdržljivostne serije s 100 m proti zgornji. Ob predlogu se izpiše še **ocenjen čas**. Tako takoj vidiš, ali trening pade v 60 minut.

- Pri serijah na `@` je čas točen (ponovitve × štart).
- Pri `p` in neprekinjenem plavanju se čas oceni iz tempa nivoja. Tempo je nastavitev, ki jo lahko kadarkoli popraviš:

| Nivo | Tempo (izhodišče) |
|------|-------------------|
| A, B | 100 m v 1:15–1:30, za oceno ~1:25/100 m |
| C | 50 m v ~1:00, za oceno ~2:00/100 m; 100 m redko na čas, bolj vzdržljivostno |

### Zgradba treninga (potrjeno 22. 11. 2026)

| # | Faza | A / B | C | Opomba |
|---|------|-------|---|--------|
| 1 | Razplavanje | **300 m** | **200 m** | vedno |
| 2 | Ogrevalna serija | **vedno ena** | vedno ena | na `p` |
| 3 | Vaje | 1–3 serije | 1–3 serije | običajno s plavutkami (`PL`) |
| 4 | Vmesno razplavanje | 50 ali 100 m | 50 ali 100 m | vedno |
| 5 | Glavna serija | ena (lahko z gnezdenimi bloki) | ena | na `@`, pravilo 2 mesecev |
| 6 | Zaključek | včasih | včasih | krajša stvar, neobvezno |
| 7 | Zaključno razplavanje | 50–100 m | 50–100 m | vedno |

**Obrnjen vrstni red** (včasih, zlasti ob ponedeljkih): razplavanje → ogrevalna serija → **takoj glavna serija**. Vaje pridejo **za glavno serijo** (potrjeno), nato zaključno razplavanje.

Generator ima zato izbiro **Vrstni red: običajni / glavna takoj**. Privzeto je običajni, ob ponedeljkih je izbira prikazana na vidnem mestu. Dolžino prilagaja predvsem s številom vaj (1–3) in z zaključkom, razplavanji in ogrevanjem pa le malo.

## 2. Kaj sem razbral iz zvezka (7 treningov, 9.–16. 11. 2026)

- Trening = zaporedje vrstic `ponovitve x razdalja + kratice + režim`, npr. `4x50 PL KV 1'10"`, `4x50 KN 1'20"`, `4x50 K VL 50"`.
- Desni stolpec je **kumulativna razdalja v km**; trening ima tipično **2,0–2,5 km**.
- Začetek `300 …` (razplavanje), konec `100 …` / `50 …` (izplavanje). Te razdalje so večje od 200 m, zato morajo biti dovoljene za razplavanje in izplavanje.
- **Režim štarta** je čas štarta (`1'10"` = štart vsako 1:10, `50"` = štart vsakih 50 s), včasih opis (`na dolgo`, `max`, `3+1`, `1-4`). Pavza se odslej piše s `p` (gl. razdelek 4).
- Pojavljajo se:
  - **gnezdeni bloki** (`3x (4x100 … / 1x … / 1x …)`),
  - **piramide in mešane razdalje** (`25+50+75+100+75…`),
  - **kombinacije** (`25+50`).

Model mora vse to podpirati, ne samo `N x razdalja`.

## 3. Podatkovni model (nove tabele v Supabase)

| Tabela | Namen | Ključna polja |
|--------|-------|---------------|
| `training_codes` | **Živ šifrant** vseh kratic, tudi vaj (gl. razdelek 4) | `code`, `meaning`, `category`, `takes_params`, `explanation`, `aliases[]`, `active`, za vaje še `drill_type`, `stroke`, `equipment[]`, `levels[]`, `video_url` |
| `training_sets` | **Serija = osnovna enota za pravilo 2 mesecev** | `phase`, `main_type`, `levels[]`, `structure` (JSON), `text` (zapis s kraticami), `meters`, `fingerprint`, `notes` |
| `trainings` | Konkreten trening | `trainer_id`, `term_id`, `date`, `levels[]` (npr. `{A,B}`, `{C}`), `status` (osnutek / potrjen / izveden), `total_meters`, `notes`; enoličnost: termin + datum + nivoji |
| `training_items` | Bloki treninga | `training_id`, `position`, `phase`, `set_id`, `structure_snapshot`, `level_variants` (JSON, npr. `{ "B": { "reps": 5 } }` = B plava 5 namesto 6 ponovitev) |

Opombe k poljem:

- **`phase`** (faza): razplavanje, ogrevalna, vaje, vmesno razplavanje, glavna, zaključek, zaključno razplavanje (gl. »Zgradba treninga« v razdelku 1).
- **`main_type`** (tip glavne serije): vzdržljivostna, šprinterska, kratka pavza, dolga pavza, piramida, …
- **`structure`** v `training_sets` je drevo:
  - `{ repeat, items: [ { reps, distance | distances[], codes: [ { code_id, params } ], regime: { type: interval | rest | free, seconds }, intensity, note } | { repeat, items: [...] } ] }`
  - Kratice so shranjene kot sklic na `training_codes` (po ID-ju), zato preimenovanje kratice ne pokvari starih serij.
  - Iz njega se izračunajo metri in normaliziran **`fingerprint`** (za iskanje ponovitev).
- **`structure_snapshot`** v `training_items`: kopija serije, da kasnejši popravek v knjižnici ne spremeni zgodovine.
- **Zgodovina uporabe** se računa iz `training_items` potrjenih treningov. Ločena tabela ni potrebna.

Povezave:

- `trainings.trainer_id` → `trainers`
- `trainings.term_id` → `terms`
- Uroševi termini se preberejo prek obstoječe `trainer_terms`.

**RLS:** stran uporablja obstoječo prijavo trenerjev (Supabase Auth, `trainer-auth.js`). Politike so stroge že od začetka: trener bere in piše samo svoje vrstice, `super_admin` vse. Dostopa za `anon` ni.

## 4. Šifrant kratic (potrjeno 22. 11. 2026)

### Osnovne kratice

| Kratica | Pomen | Vrsta |
|---------|-------|-------|
| `P` | prsno | tehnika |
| `K` | kravl | tehnika |
| `H` | hrbtno | tehnika |
| `D` | delfin | tehnika |
| `M` | mešano | tehnika |
| `MM` | mešano menjajoče | tehnika |
| `M VB1T` | mešano, vsakič brez ene tehnike | tehnika (izpeljava) |
| tehnika + `V` (npr. `KV`, `DV`) | vaje v tej tehniki. **Samostojno** (`DV`) = plavalci si izberejo poljubno vajo; **s parametri** (`DV 3-3`) = točno določena vaja | dodatek k tehniki |
| tehnika + `N` (npr. `KN`, `PN`) | noge v tej tehniki | dodatek k tehniki |
| `V` | valček | rekvizit |
| `L` | lopatke | rekvizit |
| `VL` | valček + lopatke (vedno pisano skupaj) | rekvizit |
| `ML` | male lopatke; **redko**, ker jih nimajo vsi, zato jih generator privzeto ne predlaga | rekvizit |
| `PL` | plavutke | rekvizit |
| `POČ` | počasi | intenzivnost |
| `T` | tempo | intenzivnost |
| `HIT` | hitro (ni isto kot `Max`) | intenzivnost |
| `Max` | maksimalno hitro, »all out« | intenzivnost |
| `X/Y` (npr. `K/H`) | izmenično: 1x prva, 1x druga tehnika | izpeljava |
| `@1'10"` | štart na čas (vsako 1:10). **Glavne serije so vedno na `@`.** | režim |
| `p20"` | pavza 20 s. **Ogrevalne serije so na `p`.** | režim |
| `50"` (brez oznake) | enako kot `@50"`, štart vsakih 50 s (tako je zapisano v zvezku) | režim |
| `DE` | deska; uporablja se občasno | rekvizit |
| `MAD` | madžarske lopatke; uporabljajo se občasno | rekvizit |

### Intenzivnost in stopnjevanje (potrjeno 22. 11. 2026)

Lestvica intenzivnosti ima štiri stopnje: **počasi (`POČ`) → tempo (`T`) → hitro (`HIT`) → maksimalno / all out (`Max`)**. Hitro in `Max` nista isto.

| Zapis | Pomen | Primer pri 6 ponovitvah |
|-------|-------|-------------------------|
| `3+1` | 3 tempo, 1 hitro, ponavljaj | 2 2 2 **3** 2 2 |
| `1-3` | **stopnjevano po ena:** počasi, tempo, hitro, nato znova | 1 2 **3** 1 2 **3** |
| `1-4` | stopnjevano v 4 korakih: počasi, tempo, hitro, `Max` (*predvidevam, potrdi*) | 1 2 3 **4** 1 2 |
| `1-3/2` | **stopnjevano po dva:** dve počasi, dve tempo, dve hitro | 1 1 2 2 **3 3** |
| `3-1` | **regresivno** po ena: hitro, tempo, počasi | **3** 2 1 **3** 2 1 |
| `ST` | **stopnjevano znotraj ponovitve:** vsaka ponovitev se začne počasi in konča čim hitreje | pri `6x50 K ST` vsaka 50-ka |
| `RG` | **regresivno znotraj ponovitve:** začne hitro, konča počasi | |

(V primerih: 1 = počasi, 2 = tempo, 3 = hitro, 4 = `Max`. Na bazenskem listu se lahko vzorec po želji izpiše po ponovitvah.)

V `structure` se zapiše kot `intensity: { level: POČ | T | HIT | Max }` ali `intensity: { pattern: "plus" | "progressive" | "regressive", steps, group, within: false | true }`. Za pravilo 2 mesecev je vzorec del zapisa: `6x100 K @1'40" 1-3` in `6x100 K @1'40" 3+1` sta različni seriji.

### Vaje (primeri, šifrant bo rasel)

| Kratica | Pomen |
|---------|-------|
| `RRU` | roka roka ujame |
| `DV 2-2-1` | delfin vaja: dva zavesljaja leva, dva desna, en cel (številke so parametri vaje, npr. tudi `DV 3-3`) |
| `DV` | poljubna delfin vaja po izbiri plavalca |

### Pravila razbiranja zapisa

- Vrstica: `[ponovitve x] razdalja[+razdalja…] kratice… [režim]`. Skupine se pišejo z oklepaji: `3x ( … )`.
- Kratice se berejo kot **celi žetoni, ločeni s presledkom**:
  - `PL` = plavutke (ne prsno + lopatke; to bi bilo `P L`),
  - `ML` = male lopatke,
  - `KV` = kravl vaje.
- **Tehnika + `V`/`N` brez presledka** pomeni vaje/noge (`KN`). **Samostojen `V`** je valček.
- **Vaja:** tehnika + `V`, po želji z vzorcem številk ali kratico vaje (`DV`, `DV 2-2-1`). Brez dodatka je izbira prepuščena plavalcem.
- **Režim:** `@` = štart na čas, `p` = pavza, čas brez oznake = `@`. Stran opozori, če ima glavna serija `p` ali ogrevalna `@`, vendar ne prepove.
- **Neznana kratica:** stran jo označi in ponudi »Dodaj v šifrant«, brez izgube zapisa.

### Živ šifrant

- Ena tabela `training_codes` za vse kratice, tudi za vaje. Vaje imajo daljšo obrazložitev, po želji povezavo na video, primerne nivoje in rekvizite.
- Zavihek **Šifrant**:
  - dodajanje in popravljanje kratic,
  - sinonimi (npr. `MAX` = `Max`),
  - **deaktiviranje namesto brisanja**, ker so kratice uporabljene v starih treningih.
- Nove kratice se lahko dodajo tudi neposredno med vnosom serije.

### Še odprto

- **Ostale oznake iz zvezka** (`CRP`, `ϕ`, »na dolgo« in druge): dopolnimo sproti ob vnosu oziroma slikanju vseh treningov. Neznane kratice bo stran pri vnosu sama označila.

## 5. Generator treninga (v1 = pravila, brez AI)

Vhod: termin, datum, skupina nivojev (`A+B`, `A` ali `C`), po želji tip glavne serije. Ciljna dolžina se vzame iz razpona nivoja (A 2.200–2.500 m, C 1.400–1.700 m), glede na vsebino. Za `A+B` generator sestavi trening za A in nato predlaga različico za B (ena ponovitev manj pri serijah z več ponovitvami).

1. **Okvir po fazah** iz razdelka 1: razplavanje (A/B 300 m, C 200 m) → ena ogrevalna → 1–3 vaje → vmesno razplavanje → glavna → (zaključek) → zaključno razplavanje. Ali obrnjeno: glavna takoj za ogrevalno.
2. Za vsako fazo vzame kandidate iz `training_sets`, ki ustrezajo fazi, nivoju in tipu.
   - **Glavne serije:** strogo pravilo, nobena ni bila uporabljena v zadnjih **60 dneh** (po `fingerprint`).
   - **Razplavanja, ogrevalne serije, vaje, zaključki:** se lahko ponavljajo (potrjeno 2026-11-21). Generator ima mehko pravilo: prednost dobijo tiste, ki so bile uporabljene najdlje nazaj, da se ne vrtijo vedno iste.
3. **Rotacija tipov glavne serije**: šprint približno **enkrat na 2–3 tedne** (privzeto najmanj 14 dni razmika, nastavljivo; natančnejša pravila razberemo iz vnesenih treningov). Uravnoteženje tehnik in pripomočkov čez teden.
4. Najprej izbere glavno serijo, nato ostale bloke, tako da skupaj pade v ciljni razpon. Med enakovrednimi izbira naključno, zato so predlogi različni.
5. Predlog prikaže z metri, kumulativo (kot v zvezku) in ocenjenim časom. Pri vsakem bloku so gumbi:
   - **Zamenjaj**: drug kandidat za isti blok,
   - **Uredi**,
   - **Odstrani**,
   - **Dodaj**.
6. **Potrdi** shrani trening. Šele potrjen trening šteje v 60-dnevno zgodovino.

Kontrola zaloge: stran pokaže, koliko glavnih serij je za vsak tip trenutno »na voljo« (nerabljenih v 60 dneh).

**Ocena potrebne zaloge** (3 termini na teden, ~26 terminov v 2 mesecih, 1–2 glavni seriji na trening):

| Nivo | Treningov v 2 mesecih | Potrebnih različnih glavnih serij |
|------|-----------------------|-----------------------------------|
| A (z B) | ~26 (pon, čet, sre) | ~26–52 |
| C | ~9 (sre) | ~9–18 |

Napovedanih ~150 treningov in serij je več kot dovolj. Opozorilo se prikaže, ko zaloga za neki nivo ali tip pade pod ~2 tedna.

**Generator glavnih serij ne spreminja** (potrjeno): ne dela različic, kot je `4x50` → `6x50`, ker bi s tem obšel pravilo 2 mesecev. Glavne serije jemlje samo iz knjižnice.

**»Predlagaj nekaj novega«** (potrjeno kot želja): gumb, ki prek Claude (Vercel funkcija) predlaga **novo** glavno serijo, ki je še ni v knjižnici. Predlog upošteva nivo, tip in tvoj šifrant ter je zapisan s tvojimi kraticami. Če ga sprejmeš, gre v knjižnico kot nova serija. Za to je potreben API ključ v Vercel okolju; strošek je nekaj centov na predlog. Osnovni generator deluje tudi brez tega.

## 6. Vnos podatkov

- **Razčlenjevalnik kratic (parser):**
  - trener piše tako kot v zvezek (`4x50 PL KV 1'10"`, `3x (4x100 …)`),
  - stran sproti pokaže razčlenjeno strukturo in metre,
  - neznane kratice označi, da jih dopolni v šifrantu.
- **Začetni uvoz:** fotografije strani iz zvezka lahko prepišem v uvozni format (JSON/SQL). Trener jih samo pregleda. Tako pride prvih 10–20 treningov noter brez ročnega tipkanja.
- Kasnejših ~150 treningov in serij: uvoz iz fotografij ali besedila v paketih, ali vnos prek obrazca.

## 7. Podstran

- `treningi.html` + `treningi.js` (vanilla, enak slog kot ostale strani). Povezava iz koledarja (`index.html`) in iz menija za trenerje.
- **Zavihki:**
  - **Moji treningi**: termini iz `trainer_terms`, seznam po datumih, status,
  - **Sestavi**: generator,
  - **Knjižnica**: serije in vaje, filtri po fazi, tipu, nivoju, z oznako »zadnjič uporabljeno« in »na voljo od«,
  - **Šifrant**.
- **Pogled za bazen:** najprej za **telefon** (velike črke, A in B drug ob drugem). Gumb **Natisni / PDF** je dodatna možnost (pdfMake je že v projektu).

## 8. Odprta vprašanja (za jutri)

1. **Kratice:** *potrjeno* (razdelek 4). Ostale oznake dopolnimo ob vnosu treningov.
2. **Nivoji A/B/C:** *potrjeno* (razdelek 1). B: manj ponovitev, drug štart ali plavutke.
3. **En trening na dan ali na termin?** *Potrjeno:* največ en termin na dan; v sredo dva ločena treninga (A, C).
4. **Ista glavna serija:** *potrjeno*: povsem enak zapis; zgodovina ločeno za A in C (razdelek 1).
5. **Ciljna dolžina in tempo:** *potrjeno* (razdelek 1).
6. **Režimi in intenzivnost:** *potrjeno* `@`/`p` in lestvica počasi/tempo/hitro s stopnjevanjem (razdelek 4). Potrjeno tudi `1-3/2`, `ST`, `RG` ter `HIT` ≠ `Max`. Odprto: ali `1-4` pomeni počasi → `Max`?
7. **Struktura treninga:** *potrjeno* (razdelek 1; pri obrnjenem redu vaje za glavno serijo; šprint na 2–3 tedne).
8. **Pripomočki:** *potrjeno* `V`, `L`, `VL`, `PL`, redko `ML`, občasno deska in madžarske lopatke. Kratici `DE` (deska) in `MAD` (madžarske lopatke).
9. **Kdo vidi treninge:** *potrjeno* zaenkrat samo ti; telefon je glavni, tisk dodatna možnost.
10. **Različice glavnih serij:** *potrjeno* ne; namesto tega gumb »Predlagaj nekaj novega« (razdelek 5).

## 9. Faze izvedbe

| Faza | Vsebina | Rezultat |
|------|---------|----------|
| F0 | Odgovori na vprašanja iz razdelka 8, šifrant kratic | Potrjena pravila |
| F1 | SQL migracija (tabele + RLS), seed šifranta | `SQL/create_training_builder.sql` |
| F2 | `treningi.html`: knjižnica + parser kratic + vnos; uvoz prvih 10–20 treningov | Knjižnica z resničnimi podatki |
| F3 | Generator + potrjevanje + 60-dnevna zgodovina + kontrola zaloge | Prvi generirani treningi |
| F4 | Pogled za bazen / tisk, povezava s koledarjem | Uporaba na bazenu |
| F5 | Gumb »Predlagaj nekaj novega« (Claude prek Vercel funkcije) | Nove ideje za glavne serije |
