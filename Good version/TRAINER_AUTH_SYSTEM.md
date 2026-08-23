# 🔐 Sistem avtentikacije za trenerje - Načrt implementacije

## 📋 Pregled sistema

### Trenutno stanje
- **Admin**: Lahko upravlja vse (plavalci, termini, trenerji)
- **Javni dostop**: Vsi lahko vidijo koledar in označujejo prisotnost

### Cilj
- **Trenerji**: Lastna avtentikacija + dostop samo do svojih skupin
- **Admin**: Ohrani popoln dostop
- **Javni dostop**: Ohranjeno ali omejeno

## 🏗️ Arhitektura sistema

### 1. Uporabniške vloge
```
SUPER_ADMIN (uros.jedlovcnik@gmail.com)
├── Popoln dostop do admin panela
├── Upravlja vse trenerje, plavalce, termine
└── Dodeljuje termine trenerjem

TRAINER (trainer@email.com)
├── Dostop do lastnega dashboarda
├── Vidi samo svoje termine in skupine
├── Označuje prisotnost za svoje skupine
└── Upravlja nadomeščanja

PUBLIC (brez prijave)
├── Readonly koledar? (opcijsko)
└── Morda omejen dostop
```

### 2. Podatkovni model

#### Trenutne tabele (✅ Že obstajajo):
```sql
-- GLAVNA TABELA TRENERJEV
trainers (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE,
  first_name TEXT,
  last_name TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  user_id UUID -- ✅ Povezava na Supabase Auth JE ŽE TU!
)

-- DODELJEVANJE TERMINOV TRENERJEM  
trainer_terms (
  id UUID PRIMARY KEY,
  trainer_id UUID REFERENCES trainers(id),
  term_id TEXT REFERENCES terms(id),
  created_at TIMESTAMP
)

-- PRISOTNOST TRENERJEV
trainer_attendance (
  id UUID PRIMARY KEY,
  trainer_id UUID REFERENCES trainers(id),
  term_id TEXT,
  date DATE,
  present BOOLEAN,
  note TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

-- NADOMEŠČANJA - ✅ ŽE OBSTAJA!
substitute_trainers (
  id UUID PRIMARY KEY,
  original_trainer_id UUID REFERENCES trainers(id),
  substitute_trainer_id UUID REFERENCES trainers(id),
  term_id TEXT,
  substitute_date DATE,
  reason TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

#### Manjkajoče za optimalno delovanje:
```sql
-- Dodaj dodatne stolpce v trainers (opcijsko)
ALTER TABLE trainers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE trainers ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE trainers ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'trainer';

-- Indeksi za boljšo performance
CREATE INDEX IF NOT EXISTS idx_trainer_terms_trainer_id ON trainer_terms(trainer_id);
CREATE INDEX IF NOT EXISTS idx_trainer_attendance_date ON trainer_attendance(date, trainer_id);
CREATE INDEX IF NOT EXISTS idx_substitute_trainers_date ON substitute_trainers(substitute_date, substitute_trainer_id);
```

## 🔄 Potek implementacije

### Faza 1: Supabase Auth setup
```sql
-- RLS policies za trenerje
CREATE POLICY "Trainers can read own data" ON trainers
  FOR SELECT TO authenticated 
  USING (auth.uid() = user_id);

CREATE POLICY "Trainers can update own data" ON trainers
  FOR UPDATE TO authenticated 
  USING (auth.uid() = user_id);

-- RLS za trainer_terms (trenerji vidijo samo svoje termine)
CREATE POLICY "Trainers see own terms" ON trainer_terms
  FOR SELECT TO authenticated 
  USING (
    trainer_id IN (
      SELECT id FROM trainers WHERE user_id = auth.uid()
    )
  );

-- RLS za trainer_attendance
CREATE POLICY "Trainers manage own attendance" ON trainer_attendance
  FOR ALL TO authenticated 
  USING (
    trainer_id IN (
      SELECT id FROM trainers WHERE user_id = auth.uid()
    )
  );
```

### Faza 2: Login sistem
```javascript
// trainer-login.html
async function loginTrainer(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: password
  });
  
  if (error) throw error;
  
  // Preveri, če je uporabnik trener
  const { data: trainer } = await supabase
    .from('trainers')
    .select('*')
    .eq('user_id', data.user.id)
    .single();
    
  if (!trainer) {
    throw new Error('Nimate dostopa kot trener');
  }
  
  // Preusmeri na trainer dashboard
  window.location.href = 'trainer-dashboard.html';
}
```

### Faza 3: Trainer Dashboard
```javascript
// trainer-dashboard.js
async function loadTrainerData() {
  const user = await supabase.auth.getUser();
  
  // Pridobi trenerjev profil
  const { data: trainer } = await supabase
    .from('trainers')
    .select('*')
    .eq('user_id', user.data.user.id)
    .single();
    
  // Pridobi trenerjem dodeljene termine
  const { data: trainerTerms } = await supabase
    .from('trainer_terms')
    .select(`
      term_id,
      terms (*)
    `)
    .eq('trainer_id', trainer.id);
    
  // Pridobi nadomeščanja (kjer je substitute)
  const { data: substitutions } = await supabase
    .from('trainer_substitutions')
    .select(`
      *,
      terms (*),
      original_trainer:trainers!original_trainer_id (first_name, last_name)
    `)
    .eq('substitute_trainer_id', trainer.id)
    .gte('date', new Date().toISOString().split('T')[0]);
    
  return { trainer, trainerTerms, substitutions };
}
```

### Faza 4: Filtrirani koledar
```javascript
// trainer-calendar.js
function getTrainerTermsForDate(date, trainerId) {
  const isoDate = iso(date);
  const dayOfWeek = date.getDay() === 0 ? 7 : date.getDay();
  
  // Redno dodeljeni termini
  const regularTerms = TERMS.filter(term => 
    term.day === dayOfWeek && 
    isoDate >= term.date_from && 
    isoDate <= term.date_to &&
    trainerTermsMap[trainerId]?.includes(term.id)
  );
  
  // Nadomeščanja za ta datum
  const substitutionTerms = SUBSTITUTIONS.filter(sub =>
    sub.date === isoDate && 
    sub.substitute_trainer_id === trainerId
  ).map(sub => sub.terms);
  
  return [...regularTerms, ...substitutionTerms];
}
```

## 🔧 Tehnična implementacija

### Struktura datotek
```
trainer-system/
├── trainer-login.html          # Prijava za trenerje
├── trainer-dashboard.html      # Dashboard trenerja
├── trainer-calendar.html       # Koledar trenerja
├── trainer-auth.js            # Auth logika
├── trainer-dashboard.js       # Dashboard logika
├── trainer-calendar.js        # Koledar logika
└── trainer-substitution.js    # Nadomeščanje logika
```

### Routing in varnost
```javascript
// trainer-auth.js
class TrainerAuth {
  async checkTrainerAccess() {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      window.location.href = 'trainer-login.html';
      return null;
    }
    
    const { data: trainer } = await supabase
      .from('trainers')
      .select('*')
      .eq('user_id', user.id)
      .single();
      
    if (!trainer || !trainer.is_active) {
      await supabase.auth.signOut();
      window.location.href = 'trainer-login.html';
      return null;
    }
    
    return trainer;
  }
}
```

## ⚠️ Možne težave in rešitve

### 1. **RLS Policy konflikti**
**Problem**: Obstoječi public dostop vs. trainer omejen dostop
**Rešitev**: 
```sql
-- Stopenjski pristop - najprej public, potem authenticated
CREATE POLICY "Public read access" ON attendance
  FOR SELECT TO anon USING (true);
  
CREATE POLICY "Trainers manage own groups" ON attendance
  FOR ALL TO authenticated USING (
    -- Logic za preverjanje ali trener lahko dostopa do te prisotnosti
    term_id IN (
      SELECT term_id FROM trainer_terms 
      WHERE trainer_id IN (
        SELECT id FROM trainers WHERE user_id = auth.uid()
      )
    )
  );
```

### 2. **User_id povezava delno manjka**
**Ugotovitev**: Nekateri trenerji že imajo user_id, drugi ne
**Iz SQL datotek**:
- ✅ Uroš Jedlovčnik: `user_id = '8615f0eb-e1e9-4ce8-8d16-a7e677207da2'`
- ❌ Urke Care: `user_id = null` 
- ✅ urke prdurke: `user_id = '8f7c54c3-6cb4-4192-ab3d-7cb73a01c020'`

**Rešitev**:
```sql
-- 1. Preveri obstoječe stanje
SELECT email, user_id, 
       CASE WHEN user_id IS NULL THEN 'NEEDS AUTH SETUP' ELSE 'OK' END as status
FROM trainers;

-- 2. Ustvari Auth uporabnike za trenerje brez user_id
-- (To naredimo v Supabase Dashboard preko invite funkcionalnosti)

-- 3. Posodobi user_id za nove Auth uporabnike
UPDATE trainers SET user_id = '[new-auth-user-id]' 
WHERE email = 'uros@playworldgame.ocm' AND user_id IS NULL;
```

### 3. **Nadomeščanje kompleksnost**
**Problem**: Trener A nadomešča trener B - kdo vidi kaj?
**Rešitev**:
```javascript
// Unified view - trener vidi vse (svoje + nadomeščanja)
async function getAllTrainerTerms(trainerId, date) {
  // Svoje termine
  const ownTerms = await getOwnTerms(trainerId, date);
  
  // Nadomeščanja kjer nadomešča druge
  const substitutingTerms = await getSubstitutionTerms(trainerId, date);
  
  // Združi in odstrani duplikate
  return [...new Set([...ownTerms, ...substitutingTerms])];
}
```

### 4. **Performance z velikimi podatki**
**Problem**: RLS upočasni poizvedbe
**Rešitev**:
```sql
-- Dodaj indekse
CREATE INDEX idx_trainer_terms_trainer_id ON trainer_terms(trainer_id);
CREATE INDEX idx_trainer_attendance_date_term ON trainer_attendance(date, term_id);
CREATE INDEX idx_trainers_user_id ON trainers(user_id);
```

### 5. **Sinhronizacija med Admin in Trainer vmesnikom**
**Problem**: Admin doda termin trenerju, trener ne vidi spremembe
**Rešitev**:
```javascript
// Real-time updates z Supabase Realtime
supabase
  .channel('trainer-terms-changes')
  .on(
    'postgres_changes',
    { 
      event: '*', 
      schema: 'public', 
      table: 'trainer_terms',
      filter: `trainer_id=eq.${currentTrainerId}`
    },
    (payload) => {
      console.log('Term assignment changed!', payload);
      refreshTrainerCalendar();
    }
  )
  .subscribe();
```

## 📊 SQL Pregled trenutnega stanja

### ✅ Kar je odlično nastavljeno:
```sql
-- ✅ POPOLNA STRUKTURA ZA TRAINER AUTH SISTEM!

trainers (
  id UUID,
  email TEXT UNIQUE, 
  first_name TEXT,
  last_name TEXT,
  user_id UUID,      -- 🎯 Ključno za Supabase Auth!
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

trainer_terms (
  id UUID,
  trainer_id UUID,   -- 🎯 Dodeljevanje terminov
  term_id TEXT,
  created_at TIMESTAMP
)

trainer_attendance (
  id UUID,
  trainer_id UUID,   -- 🎯 Prisotnost trenerjev
  term_id TEXT,
  date DATE,
  present BOOLEAN,
  note TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

substitute_trainers (
  id UUID,
  original_trainer_id UUID,    -- 🎯 Kdo je odsoten
  substitute_trainer_id UUID,  -- 🎯 Kdo nadomešča
  term_id TEXT,
  substitute_date DATE,
  reason TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

### 🔧 Manjkajoče optimizacije:
```sql
-- 1. Opcijski stolpci za boljšo funkcionalnost
ALTER TABLE trainers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE trainers ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE trainers ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'trainer';

-- 2. Performance indeksi
CREATE INDEX IF NOT EXISTS idx_trainer_terms_trainer_id ON trainer_terms(trainer_id);
CREATE INDEX IF NOT EXISTS idx_trainer_attendance_date ON trainer_attendance(date, trainer_id);
CREATE INDEX IF NOT EXISTS idx_substitute_trainers_date ON substitute_trainers(substitute_date, substitute_trainer_id);

-- 3. RLS policies setup (najpomembnejše!)
-- (glej spodaj v implementaciji)
```

### 🚨 Kritični koraki pred implementacijo:
1. **Backup baze** - obvezno!
2. **Ustvari test environment** 
3. **Migracija obstoječih trenerjev** v Supabase Auth
4. **Testiranje RLS policies** z različnimi uporabniki
5. **Performance testing** z večjimi podatki

## 🎯 Fazni pristop implementacije

### Faza 1 (Foundation): 2-3 dni
- [x] SQL migracije
- [x] Supabase Auth setup
- [x] Osnovni login za trenerje

### Faza 2 (Core Features): 3-4 dni  
- [x] Trainer dashboard
- [x] Filtrirani koledar
- [x] Prisotnost za svoje skupine

### Faza 3 (Advanced): 2-3 dni
- [x] Sistem nadomeščanj
- [x] Real-time updates
- [x] Admin upravljanje dodeljevanj

### Faza 4 (Polish): 1-2 dni
- [x] UI/UX improvements
- [x] Error handling
- [x] Documentation

**Skupaj**: ~8-12 dni dela

## 🔒 Varnostni vidiki

### Principais implementacija:
1. **Najmanj privilegijev** - trener vidi samo svoje
2. **RLS na vseh tabelah** - baza sama varuje dostop  
3. **Frontend validacija + backend varnost**
4. **Audit trail** - kdo kaj kdaj spremeni
5. **Časovna omejitev sessions** - avtomatska odjava

Ta sistem bo omogočil **varno, skalabilno in uporabniku prijazno** okolje za trenerje! 🎉
