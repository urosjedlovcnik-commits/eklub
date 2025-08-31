# Navodila za uvoz vadnin iz CSV datoteke

## Opis
Sistem omogoča uvoz mesečnih pristojbin plavalcev iz CSV datoteke. To je koristno za množično nastavljanje pristojbin za več plavalcev hkrati.

## Format CSV datoteke
CSV datoteka mora vsebovati naslednje stolpce v glavi:

| Stolpec | Opis | Primer |
|---------|------|---------|
| `ime` | Ime plavalca | Janez |
| `priimek` | Priimek plavalca | Novak |
| `znesek` | Mesečna pristojbina v EUR | 80.00 |

## Primer CSV datoteke
```csv
ime,priimek,znesek
Janez,Novak,80.00
Maja,Kovač,75.00
Peter,Horvat,85.00
Ana,Žnidar,70.00
```

## Navodila za uvoz
1. **Pripravi CSV datoteko** - Ustvari CSV datoteko z zgornjim formatom
2. **Izberi mesec in leto** - V finance sekciji izberi mesec in leto za katerega uvozujemo vadnine
3. **Uvozi datoteko** - Klikni na "Uvozi vadnine" in izberi CSV datoteko
4. **Preveri rezultate** - Sistem bo prikazal, koliko vadnin je bilo uvoženih

## Pomembne opombe
- **Ločilo**: Uporabi vejico (`,`) kot ločilo med stolpci
- **Imena plavalcev**: Mora se natančno ujemati z imeni v sistemu (velike/male črke niso pomembne)
- **Zneski**: Mora biti število (npr. 80.00, ne "80€" ali "80 EUR")
- **Mesec in leto**: Mora biti izbran v finance sekciji pred uvozom
- **Obstoječe vadnine**: Če plavalec že ima nastavljeno pristojbino za izbrani mesec, bo prepisana

## Omejitve
- Sistem poišče plavalce po imenu in priimku
- Če plavalec ni najden, se njegova vadnina ne bo uvožila
- Vse vadnine se uvozi za izbrani mesec in leto
- Ni možnosti nastavitve popustov preko CSV (privzeto 0.00)

## Reševanje težav
- **"Plavalec ni bil najden"**: Preveri, ali se ime in priimek natančno ujemata z vnosom v sistem
- **"Ni bilo mogoče uvožiti nobene vadnine"**: Preveri format CSV datoteke in imena plavalcev
- **Napaka pri branju**: Preveri, ali je datoteka v CSV formatu in ali uporablja vejice kot ločila
