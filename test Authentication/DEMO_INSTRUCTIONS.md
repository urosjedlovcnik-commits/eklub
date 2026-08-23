# 🚀 Demo navodila - Trainer Auth sistem

## Hitri zagon

### 1. SQL setup (najprej!)
```sql
-- Zaženi v Supabase SQL Editor
-- Kopiraj vse iz sql-setup.sql
```

### 2. Odpri trainer-login.html
```
file:///.../test Authentication/trainer-login.html
```

### 3. Test računi (klikni na njih v UI)

#### 🔴 Super Admin
- **Email**: uros.jedlovcnik@gmail.com  
- **Geslo**: PlavalnaSola2025!
- **Rezultat**: Preusmeri na obstoječi admin.html

#### 🔵 Trainer Admin (VIDI VSE!)
- **Email**: m4j0n3z4@gmail.com
- **Geslo**: TrainerAdmin123!  
- **Rezultat**: Dashboard z vsemi treningi

#### 🟡 Osnovni Trener (samo svoje)
- **Email**: uros@playworldgame.ocm
- **Geslo**: Trainer123!
- **Rezultat**: Dashboard samo s svojimi treningi

## Funkcionalnosti

### ✅ Implementirano
- [x] Login sistem z vlogami
- [x] Dashboard z različnimi prikazi
- [x] Koledar filtriran po vlogah
- [x] Session management
- [x] Preusmeritev glede na vlogo
- [x] Responsive design

### 🔧 Funkcionalnosti po vlogah

#### Super Admin
- Popoln dostop do admin panela
- Preusmeri na obstoječi sistem

#### Trainer Admin  
- Vidi **vse treninge** v koledarju
- Dostop do statistik za vse
- Gumb "Prikaži vse/samo svoje"
- Link na glavni koledar

#### Osnovni Trener
- Vidi **samo svoje treninge**
- Statistike za svoje termine
- Omejen dostop

## Tehnične lastnosti

### Vloge v bazi
```sql
trainers.role:
- 'super_admin' → popoln dostop
- 'trainer_admin' → vidi vse treninge  
- 'trainer' → samo svoje termine
```

### Supabase Auth
- Uporabi obstoječe API ključe
- Session timeout 8 ur
- Avtomatska odjava ob poteku

### UI/UX
- Responsive design
- Intuitivne barve po vlogah
- Hitri test računi
- Error handling

## Demonstracija

### Scenario 1: Trainer Admin
1. Login z m4j0n3z4@gmail.com
2. Vidi dashboard z "Trener Administrator" značko
3. Kalendar prikaže vse treninge
4. Gumb "Prikaži vse treninge" je viden
5. Klik na termin → odpre glavni koledar

### Scenario 2: Osnovni Trener  
1. Login z uros@playworldgame.ocm
2. Vidi dashboard z "Trener" značko
3. Kalendar prikaže samo njegove termine
4. Ni gumba za prikaz vseh
5. Omejena funkcionalnost

### Scenario 3: Super Admin
1. Login z uros.jedlovcnik@gmail.com
2. Avtomatska preusmeritev na admin.html
3. Ohrani obstoječi admin sistem

## Možne izboljšave

### Faza 2 (naslednja)
- [ ] Nadomeščanja v koledarju
- [ ] Označevanje prisotnosti direktno
- [ ] Push obvestila
- [ ] Eksport roporjevov

### Faza 3 (kasnejša)
- [ ] Mobilna aplikacija
- [ ] QR kode za checkin
- [ ] Integracija s Stripe/PayPal
- [ ] Automatski emaili

## Varnost

### ✅ Implementirano
- Row Level Security ready (RLS onemogočen za demo)
- Session timeout
- Password hashing
- Role-based access control

### 🔒 Za produkcijo
- Omogoči RLS policies
- 2FA avtentikacija  
- Audit logging
- HTTPS only

---

**🎯 Cilj**: Demonstrirati, kako lahko trener z "admin" vlogo vidi vse treninge, medtem ko osnovni trenerji vidijo samo svoje.
