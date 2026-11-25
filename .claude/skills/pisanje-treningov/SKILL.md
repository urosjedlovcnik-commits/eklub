---
name: pisanje-treningov
description: Navodila, kako sestaviti ali popraviti plavalni trening za eKlub (nivoji A, B, C), in dnevnik trenerjevih odzivov po izvedenih treningih. Uporabi pri sestavljanju treninga ali serije, pri spreminjanju generatorja (treningi-core.js) in ko trener pove, kaj mu je bilo na treningu všeč ali ne.
---

# Pisanje treningov

Trener plava po teh treningih z ekipo, zato mora biti vsak trening smiseln kot celota, ne le seštevek pravih metrov.
Pravila spodaj je potrdil trener. Kjer je navedena številka iz zvezka, je to navada iz 171 pregledanih treningov.

## Kako to datoteko vzdrževati

1. Po odzivu na trening ga dodaj v **Dnevnik odzivov** (datum, nivo, kaj je bilo, kaj iz tega sledi).
2. Če iz odziva sledi splošno pravilo, ga dodaj v ustrezno poglavje. Če ni jasno, ali velja vedno, vprašaj.
3. Pravilo, ki ga je mogoče preveriti, naj upošteva tudi generator v `treningi-core.js`. V tabeli na koncu označi, kaj je v kodi.
4. Pred vpisom v bazo in pred vsakim pushom počakaj na trenerjevo izrecno potrditev.
5. Brez imen plavalcev in brez osebnih podatkov (datoteka je v repozitoriju).

## Zgradba treninga

Vrstni red: razplavanje → ogrevalna → vaje → 50 RAZP → glavna → (zaključek) → zaključno razplavanje.
Različica »glavna takoj« (ogrevalna → glavna → 50 RAZP → vaje) je mogoča ob ponedeljkih.

| | A in B | C |
|---|---|---|
| Skupaj | 2200–2500 m | 1400–1700 m |
| Razplavanje | 300 | 200 |
| Serije vaj | 2–3, pred glavno najpogosteje 2 | 3–5, pred glavno skoraj vedno vsaj 3 |
| Metri vaj | okrog 500 | okrog 650 |
| Glavna | okrog 900 (vsaj ~30 % treninga, več kot vse vaje) | okrog 300, največ ~350 |

- Ponedeljek in četrtek: A+B skupaj. Sreda: A in C ločeno. B dobi v glavni za 1 ponovitev krajšo različico.
- Privzeti štarti glavne: 50 @1', 75 @1'30", 100 @2', 200 @3'30". Drugih štartov si ne izmišljaj.
- Ciljni časi samo za A: 50 T 38-42, hitro 33-38; 100 T 1:18-1:30, hitro 1:15-1:25. B in C jih nimata.

## Vaje

- **V seriji ↑/↓ ali 1x/1x ne mešaj vaj dveh tehnik, če ima ena od njiju v treningu še svojo serijo.** Deluje čudno zastavljeno. Napačno: `↑HN ROTACIJA ↓K 6-3-6`, nato `HV HITLER`. Pravilno: `↑HN ROTACIJA ↓H CT`, nato `HV HITLER`.
- Cela serija druge tehnike med dvema serijama iste tehnike **je dovoljena** (npr. kravl, delfin, kravl). Raje pa naj bodo iste tehnike skupaj.
- Znotraj tehnike: najprej noge, nato vaje, nato cela tehnika.
- Nivo C: če so noge neke tehnike, morajo biti tudi vaje za isto tehniko.
- Ista vaja se ne ponovi 21 dni, ne glede na število ponovitev.
- 6x50, 8x50 in 10x50 vaj so redkost; raje 10x25, 12x25, 8x25, 6x25, 4x50.
- Vaje po strani (BOK, SUPERMAN, RV 90°) potrebujejo sodo število dolžin.
- ORKA in BIONDI nikoli v istem treningu in vsaj 28 dni narazen.
- `H 90°` samo po sebi ni vaja: ali `HN 90°` ali `HV RRU 90°`. Na trebuhu so roke spredaj `RS`, na hrbtu `RZ` ali `OT`.
- `V ML PR` je vedno z malimi lopatkami. `PL` se piše pred HN/HV/KN.
- Pri novih vajah upoštevaj razdaljo in plavutke iz šifranta (oprema PL / BREZ PL).

## Glavna serija

- Ista glavna se ne ponovi 60 dni (zgodovina A velja za A in B, C posebej).
- Šprinterski trening: več kot 150 m max v celem treningu (štejejo tudi noge; MAX OBRAT, MAX FREK in stopnjevano ne). Med šprinterskima vsaj 14 dni, najpozneje na 21 dni.
- Posamezna razdalja max je največ 100 m v kosu. Serija jih ima lahko več (`6x50 MAX NOGE`); nikoli »300 m MAX«.
- `1-4 4-1` pomeni stopnjuj do četrtega in nazaj; 4 in 5 sta hitro ali max.
- Nove serije so označene ★ in čakajo na pregled; naj bodo ustvarjalne, a v trenerjevem slogu.

## Nivo C

- Otroci se še učijo: več vaj in kratkih serij (6x25, 8x25, 4x50), manj celega stila v enem kosu.
- **Pred glavno vsaj 3 serije vaj.** Če sta ogrevalna in glavna obe cela tehnika, dodaj serijo vaj.
- Obratov še ne znajo dobro; PODVODNI (prsni) se učijo.

## Skupni trening A+B

Enkrat v koledarskem mesecu ob četrtku, vsaj 3 tedne po prejšnjem. A in B plavata isto, glavna je samo iz 50 m dolžin, brez ciljnih časov.

## Pregled pred oddajo

1. Metri v razponu, razmerje vaje : glavna ustreza nivoju.
2. V vaje ene tehnike se v isti seriji ne vriva vaja druge tehnike.
3. C: vsaj 3 serije vaj pred glavno; noge imajo vaje iste tehnike.
4. Ponovitve: glavna 60 dni, vaja 21 dni, ORKA/BIONDI 28 dni.
5. Max: skupaj do 150 m, razen če je šprinterski; v kosu do 100 m.
6. Sodo število dolžin pri vajah po strani.

## Dnevnik odzivov

| Datum | Nivo | Odziv trenerja | Sledi |
|---|---|---|---|
| 25. 11. 2026 | A | Hrbtni vaji sta bili ločeni (`↑HN ROTACIJA ↓K 6-3-6`, nato `HV HITLER 1x 2-2-2`), vmes neumestno kravl. Pojasnilo: druga tehnika je lahko vmes, tu pa je bila kravl vaja v isti seriji s hrbtno. | Brez vaje druge tehnike v isti seriji; cela serija vmes je v redu. |
| 25. 11. 2026 | C | Preveč plavanja celega stila (samo `8x25 HN` in `4x50 HV RRU`, nato `16x25`); pred glavno bi potrebovali še kakšno serijo. | C: vsaj 3 serije vaj, krajša glavna. |
| 25. 11. 2026 | A | Glavna mu je bila zelo všeč: `6x50 KVL @1'` / `6x50 PL NOGE 1x MAX 1x EASY @1'10"` / `6x50 @50"` / `6x50 KVL @1'`. | Zgradba, ki naj se pojavlja: pripomoček → noge → kratek štart → pripomoček, vse po 50 m. |

## Kaj upošteva generator

| Pravilo | V kodi |
|---|---|
| Metri, razmerja, ponovitve, šprint, max, ORKA/BIONDI, sode dolžine | da |
| Brez mešanja vaj dveh tehnik v seriji (`splitStrokes`); iste tehnike raje skupaj, noge pred vajami (`orderDrills`) | da |
| C: vsaj 3 serije vaj, okrog 600 m, glavna do ~350 m | da |
| C: noge imajo vaje iste tehnike | da |
| Skupni trening, plavutke novih vaj | da |
| Pogostejša zgradba glavne, ki je bila všeč | ne |
