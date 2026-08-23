# 🔐 Test Authentication System

## Pregled sistema

Testni sistem avtentikacije za trenerje z vlogami:

- **SUPER_ADMIN**: Popoln dostop (uros.jedlovcnik@gmail.com)
- **TRAINER_ADMIN**: Trener z admin pravicami - vidi vse treninge
- **TRAINER**: Osnovni trener - vidi samo svoje treninge

## Struktura

```
test Authentication/
├── README.md                    # Ta datoteka
├── sql-setup.sql               # SQL nastavitve za vloge
├── trainer-login.html          # Login stran za trenerje
├── trainer-dashboard.html      # Dashboard - različen glede na vlogo
├── trainer-auth.js            # Avtentikacija in vloge
├── trainer-calendar.js        # Koledar z filtri po vlogah
└── config-auth.js             # Konfiguracija
```

## Kako testirati

1. Zaženi SQL setup
2. Odpri trainer-login.html
3. Prijavi se z različnimi računi:
   - Admin trener: vidi VSE
   - Osnovni trener: vidi SAMO SVOJE

## SQL struktura

Sistem uporablja `role` stolpec v `trainers` tabeli za določitev pravic.
