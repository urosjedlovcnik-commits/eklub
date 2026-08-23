# 🚨 HITRI POPRAVEK RLS NAPAKE

## Problem
Napaka: `new row violates row-level security policy for table "trainer_attendance"`

## Vzrok
Tabela `trainer_attendance` ima omogočen Row Level Security (RLS), vendar ni nastavljenih policy-jev, ki bi omogočali pisanje podatkov.

## HITRE REŠITVE

### 🟡 MOŽNOST 1: Začasno onemogoči RLS (hitro, vendar ne varno)

V **Supabase Dashboard** → **SQL Editor**:
```sql
-- ZAČASNO ONEMOGOČI RLS (samo za testiranje!)
ALTER TABLE trainer_attendance DISABLE ROW LEVEL SECURITY;
```

### 🟢 MOŽNOST 2: Dodaj ustrezne policy-je (priporočeno)

V **Supabase Dashboard** → **SQL Editor**:
```sql
-- Dodaj policy-je za trainer_attendance tabelo
CREATE POLICY "Allow public access" ON trainer_attendance 
FOR ALL TO anon USING (true);

-- Ali bolj omejen pristop
CREATE POLICY "Allow read access" ON trainer_attendance 
FOR SELECT TO anon USING (true);

CREATE POLICY "Allow insert access" ON trainer_attendance 
FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow update access" ON trainer_attendance 
FOR UPDATE TO anon USING (true);
```

### 🔵 MOŽNOST 3: Onemogoči RLS za vse tabele (enostavno)

V **Supabase Dashboard** → **SQL Editor**:
```sql
-- Onemogoči RLS za vse tabele (če ni potrebna varnost)
ALTER TABLE swimmers DISABLE ROW LEVEL SECURITY;
ALTER TABLE trainers DISABLE ROW LEVEL SECURITY;
ALTER TABLE terms DISABLE ROW LEVEL SECURITY;
ALTER TABLE attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE term_status DISABLE ROW LEVEL SECURITY;
ALTER TABLE trainer_attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE trainer_terms DISABLE ROW LEVEL SECURITY;
```

## KO POŽENETE FIX

1. ✅ Pojdite v Supabase Dashboard
2. ✅ Kliknite na **SQL Editor**
3. ✅ Kopirajte in zaženite enega od zgornjih SQL skriptov
4. ✅ Preverite aplikacijo - napaka bi morala biti odpravljena

## PRODUKCIJSKA NASTAVITEV

Za produkcijsko uporabo priporočamo **MOŽNOST 2** z ustreznimi policy-ji, ki omejujejo dostop samo na avtorizirane uporabnike.

## PREVERJANJE

Če želite preveriti trenutno stanje RLS:
```sql
-- Prikaži vse tabele z RLS statusom
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Prikaži vse policy-je
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public';
```
