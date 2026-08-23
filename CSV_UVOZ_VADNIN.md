# Navodila za uvoz vadnin iz CSV datoteke

## Opis
Sistem omogoča uvoz mesečnih pristojbin plavalcev iz CSV datoteke. To je koristno za množično nastavljanje pristojbin za več plavalcev hkrati.

## Format CSV datoteke
CSV datoteka mora vsebovati naslednje stolpce v glavi:

| Stolpec | Opis | Primer |
|---------|------|---------|
| `first_name` | Ime plavalca | Janez |
| `last_name` | Priimek plavalca | Novak |
| `email` | Email naslov plavalca (opcijsko) | janez.novak@email.com |
| `phone` | Telefonska številka plavalca (opcijsko) | +386 40 123 456 |
| `monthly_fee` | Mesečna pristojbina v EUR | 80.00 |
| `discount` | Popust v EUR (opcijsko) | 5.00 |

## Primer CSV datoteke
```csv
first_name,last_name,email,phone,monthly_fee,discount
Janez,Novak,janez.novak@email.com,+386 40 123 456,80.00,0.00
Maja,Kovač,maja.kovac@email.com,+386 41 234 567,75.00,5.00
Peter,Horvat,peter.horvat@email.com,+386 42 345 678,85.00,0.00
Ana,Žnidar,ana.znidar@email.com,+386 43 456 789,70.00,10.00
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
- **Prihodnji meseci**: **Pomembno!** Uvožene vadnine veljajo za vse prihodnje mesece (od izbranega meseca naprej), ne samo za izbrani mesec

## Omejitve
- Sistem poišče plavalce po imenu in priimku
- Če plavalec ni najden, se njegova vadnina ne bo uvožila
- Vse vadnine se uvozi za izbrani mesec in leto ter **vse prihodnje mesece**
- **Popusti**: Popusti se upoštevajo samo za mesec, v katerem so uvoženi, ne pa tudi za prihodnje mesece
- Sistem avtomatsko ustvari vadnine za trenutno leto in naslednje leto

## Reševanje težav
- **"Plavalec ni bil najden"**: Preveri, ali se ime in priimek natančno ujemata z vnosom v sistem
- **"Ni bilo mogoče uvožiti nobene vadnine"**: Preveri format CSV datoteke in imena plavalcev
- **Napaka pri branju**: Preveri, ali je datoteka v CSV formatu in ali uporablja vejice kot ločila

## 🔄 Avtomatsko kopiranje vadnin

Sistem sedaj vključuje **avtomatsko kopiranje vadnin** iz prejšnega meseca v trenutni mesec:

### Kako deluje
1. **Avtomatsko preverjanje**: Ob nalaganju admin strani sistem preveri, ali obstajajo vadnine za trenutni mesec
2. **Avtomatsko kopiranje**: Če vadnine ne obstajajo, sistem avtomatsko kopira vse vadnine iz prejšnega meseca v trenutni mesec
3. **Ročno kopiranje**: Administrator lahko ročno zažene kopiranje z gumbom "Kopiraj vadnine iz prejšnega meseca"
4. **Preverjanje stanja**: Gumb "Preveri stanje vadnin" prikaže stanje vadnin za trenutni mesec

### Prednosti
- **Dinamično kopiranje**: Vadnine se kopirajo iz prejšnega meseca, ne iz fiksnega meseca
- **Ni več manjkajočih vadnin**: Sistem avtomatsko zagotovi, da so vadnine na voljo za trenutni mesec
- **Enostavna uporaba**: Administrator ni več odvisen od ročnega uvažanja CSV datotek
- **Pametno preverjanje**: Sistem preveri stanje ob vsakem prehodu v finance sekcijo
- **Varnost**: Kopirajo se samo vadnine, ki že obstajajo v sistemu
