-- Začetni šifrant kratic in privzete nastavitve za sistem treningov.
-- Poženite PO create_training_builder.sql. Ponovljivo: obstoječe kratice in nastavitve ostanejo nespremenjene.
-- Avtor kratic je trener z e-pošto spodaj (da jih lahko kasneje ureja tudi brez vloge super_admin).

WITH owner AS (
  SELECT id FROM public.trainers WHERE email = 'uros.jedlovcnik@gmail.com' LIMIT 1
)
INSERT INTO public.training_codes
  (code, meaning, category, stroke, variant, takes_params, rarely_used, aliases, explanation, created_by)
SELECT v.code, v.meaning, v.category, v.stroke, v.variant, v.takes_params, v.rarely_used, v.aliases, v.explanation,
       (SELECT id FROM owner)
FROM (VALUES
  -- Tehnike (celo plavanje)
  ('P',   'prsno',                 'tehnika', 'P', 'cela', false, false, '{}'::text[], NULL),
  ('K',   'kravl',                 'tehnika', 'K', 'cela', false, false, '{}'::text[], NULL),
  ('H',   'hrbtno',                'tehnika', 'H', 'cela', false, false, '{}'::text[], NULL),
  ('D',   'delfin',                'tehnika', 'D', 'cela', false, false, '{}'::text[], NULL),
  ('M',   'mešano',                'tehnika', 'M', 'cela', false, false, '{}'::text[], NULL),
  ('MM',  'mešano menjajoče',      'tehnika', 'M', 'cela', false, false, '{}'::text[], NULL),

  -- Vaje v tehniki: samostojno = poljubna vaja po izbiri plavalca; s parametri = točno določena vaja
  ('PV',  'prsno vaje',            'tehnika', 'P', 'vaje', true, false, '{}'::text[], 'Samostojno: plavalci izberejo poljubno vajo. S parametri ali kratico vaje: točno določena vaja.'),
  ('KV',  'kravl vaje',            'tehnika', 'K', 'vaje', true, false, '{}'::text[], 'Samostojno: plavalci izberejo poljubno vajo. S parametri ali kratico vaje: točno določena vaja.'),
  ('HV',  'hrbtno vaje',           'tehnika', 'H', 'vaje', true, false, '{}'::text[], 'Samostojno: plavalci izberejo poljubno vajo. S parametri ali kratico vaje: točno določena vaja.'),
  ('DV',  'delfin vaje',           'tehnika', 'D', 'vaje', true, false, '{}'::text[], 'Samostojno: poljubna delfin vaja. DV 2-2-1 = dva zavesljaja leva, dva desna, en cel (številke so parametri, npr. tudi DV 3-3).'),
  ('MV',  'mešano vaje',           'tehnika', 'M', 'vaje', true, false, '{}'::text[], 'Samostojno: plavalci izberejo poljubno vajo. S parametri ali kratico vaje: točno določena vaja.'),

  -- Noge v tehniki
  ('PN',  'prsno noge',            'tehnika', 'P', 'noge', false, false, '{}'::text[], NULL),
  ('KN',  'kravl noge',            'tehnika', 'K', 'noge', false, false, '{}'::text[], NULL),
  ('HN',  'hrbtno noge',           'tehnika', 'H', 'noge', false, false, '{}'::text[], NULL),
  ('DN',  'delfin noge',           'tehnika', 'D', 'noge', false, false, '{}'::text[], NULL),
  ('MN',  'mešano noge',           'tehnika', 'M', 'noge', false, false, '{}'::text[], NULL),

  -- Izpeljave
  ('VB1T', 'vsakič brez ene tehnike', 'izpeljava', NULL, NULL, false, false, '{}'::text[], 'Uporablja se z M: M VB1T = mešano, vsakič brez ene tehnike.'),

  -- Rekviziti
  ('V',   'valček',                'rekvizit', NULL, NULL, false, false, '{}'::text[], 'Samostojen V je valček; V pripet tehniki (npr. KV) pomeni vaje.'),
  ('L',   'lopatke',               'rekvizit', NULL, NULL, false, false, '{}'::text[], NULL),
  ('VL',  'valček + lopatke',      'rekvizit', NULL, NULL, false, false, '{}'::text[], 'Vedno pisano skupaj.'),
  ('ML',  'male lopatke',          'rekvizit', NULL, NULL, false, true,  '{}'::text[], 'Redko, ker jih nimajo vsi; generator jih privzeto ne predlaga.'),
  ('PL',  'plavutke',              'rekvizit', NULL, NULL, false, false, '{}'::text[], NULL),
  ('DE',  'deska',                 'rekvizit', NULL, NULL, false, false, '{}'::text[], 'Uporablja se občasno.'),
  ('MAD', 'madžarske lopatke',     'rekvizit', NULL, NULL, false, false, '{}'::text[], 'Uporabljajo se občasno.'),

  -- Intenzivnost (lestvica: POČ < T < HIT < Max)
  ('POČ', 'počasi',                'intenzivnost', NULL, NULL, false, false, '{POC}'::text[], NULL),
  ('T',   'tempo',                 'intenzivnost', NULL, NULL, false, false, '{}'::text[], NULL),
  ('HIT', 'hitro',                 'intenzivnost', NULL, NULL, false, false, '{}'::text[], 'Ni isto kot Max.'),
  ('Max', 'maksimalno hitro, all out', 'intenzivnost', NULL, NULL, false, false, '{MAX}'::text[], NULL),

  -- Stopnjevanje znotraj ponovitve (vzorci med ponovitvami, npr. 3+1, 1-3, 1-3/2, 3-1, razbere parser)
  ('ST',  'stopnjevano znotraj ponovitve', 'stopnjevanje', NULL, NULL, false, false, '{}'::text[], 'Vsaka ponovitev se začne počasi in konča čim hitreje.'),
  ('RG',  'regresivno znotraj ponovitve',  'stopnjevanje', NULL, NULL, false, false, '{}'::text[], 'Vsaka ponovitev se začne hitro in konča počasi.'),

  -- Vaje
  ('RRU', 'roka roka ujame',       'vaja', NULL, NULL, false, false, '{}'::text[], NULL)
) AS v(code, meaning, category, stroke, variant, takes_params, rarely_used, aliases, explanation)
ON CONFLICT ((lower(code))) DO NOTHING;

-- Privzete nastavitve (razponi dolžine, tempo za oceno časa, pravila)
INSERT INTO public.training_settings (trainer_id, settings)
SELECT t.id, '{
  "session_minutes": 60,
  "main_repeat_days": 60,
  "sprint_min_gap_days": 14,
  "levels": {
    "A": { "meters_min": 2200, "meters_max": 2500, "warmup_m": 300, "pace_per_100_sec": 85 },
    "B": { "meters_min": 2200, "meters_max": 2500, "warmup_m": 300, "pace_per_100_sec": 85 },
    "C": { "meters_min": 1400, "meters_max": 1700, "warmup_m": 200, "pace_per_100_sec": 120 }
  },
  "b_variant": { "reps_minus": 1, "min_reps_to_reduce": 4 },
  "highlight_order_choice_weekdays": [1]
}'::jsonb
FROM public.trainers t
WHERE t.email = 'uros.jedlovcnik@gmail.com'
ON CONFLICT (trainer_id) DO NOTHING;

-- Kontrola
SELECT category, count(*) AS kratic FROM public.training_codes GROUP BY category ORDER BY category;
SELECT t.email, t.role, (t.user_id IS NOT NULL) AS ima_prijavo, (s.trainer_id IS NOT NULL) AS ima_nastavitve
FROM public.trainers t
LEFT JOIN public.training_settings s ON s.trainer_id = t.id
WHERE t.email = 'uros.jedlovcnik@gmail.com';
