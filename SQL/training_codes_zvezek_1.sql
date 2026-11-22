-- Dopolnitev šifranta po pregledu zvezka (22. 11. 2026): samo zanesljive kratice.
-- Nejasne kratice (CT, KZ, PPV, BD, MBD ...) počakajo na potrditev (gl. treningi_uvoz/zvezek_2026_osnutek.md).
-- Ponovljivo.

-- Sinonimi: besedne oblike, kot so zapisane v zvezku
UPDATE public.training_codes SET aliases = (SELECT array_agg(DISTINCT a) FROM unnest(aliases || ARRAY['STOP']) a) WHERE code = 'ST';
UPDATE public.training_codes SET aliases = (SELECT array_agg(DISTINCT a) FROM unnest(aliases || ARRAY['HITRO']) a) WHERE code = 'HIT';
UPDATE public.training_codes SET aliases = (SELECT array_agg(DISTINCT a) FROM unnest(aliases || ARRAY['TEMPO']) a) WHERE code = 'T';
UPDATE public.training_codes SET aliases = (SELECT array_agg(DISTINCT a) FROM unnest(aliases || ARRAY['POČASI', 'POCASI']) a) WHERE code = 'POČ';
UPDATE public.training_codes SET aliases = (SELECT array_agg(DISTINCT a) FROM unnest(aliases || ARRAY['DESKA', 'DESKO']) a) WHERE code = 'DE';
UPDATE public.training_codes SET aliases = (SELECT array_agg(DISTINCT a) FROM unnest(aliases || ARRAY['VALČEK', 'VALCEK']) a) WHERE code = 'V';
UPDATE public.training_codes SET aliases = (SELECT array_agg(DISTINCT a) FROM unnest(aliases || ARRAY['MADŽ', 'MADZ']) a) WHERE code = 'MAD';
UPDATE public.training_codes SET aliases = (SELECT array_agg(DISTINCT a) FROM unnest(aliases || ARRAY['PRSNO']) a) WHERE code = 'P';
UPDATE public.training_codes SET aliases = (SELECT array_agg(DISTINCT a) FROM unnest(aliases || ARRAY['KRAVL']) a) WHERE code = 'K';
UPDATE public.training_codes SET aliases = (SELECT array_agg(DISTINCT a) FROM unnest(aliases || ARRAY['HRBTNO']) a) WHERE code = 'H';
UPDATE public.training_codes SET aliases = (SELECT array_agg(DISTINCT a) FROM unnest(aliases || ARRAY['DELFIN']) a) WHERE code = 'D';
UPDATE public.training_codes SET aliases = (SELECT array_agg(DISTINCT a) FROM unnest(aliases || ARRAY['MEŠANO', 'MESANO']) a) WHERE code = 'M';

-- Nove kratice in imena vaj (razlage vaj dopolni trener)
WITH owner AS (
  SELECT id FROM public.trainers WHERE email = 'uros.jedlovcnik@gmail.com' LIMIT 1
)
INSERT INTO public.training_codes (code, meaning, category, aliases, explanation, created_by)
SELECT v.code, v.meaning, v.category, v.aliases, v.explanation, (SELECT id FROM owner)
FROM (VALUES
  ('RAZP',      'razplavanje',  'drugo', '{RAZ}'::text[], 'Lahko plavanje; npr. 300 RAZP, ali v ponovitvi 25 D + 25 RAZP.'),
  ('SUPERMAN',  'superman',     'vaja',  '{}'::text[], NULL),
  ('SHARK',     'shark',        'vaja',  '{}'::text[], 'Različici SHARK 1 in SHARK 2.'),
  ('VATERPOLO', 'vaterpolo kravl', 'vaja', '{}'::text[], NULL),
  ('SCULLING',  'sculling',     'vaja',  '{}'::text[], NULL),
  ('ZADRGA',    'zadrga',       'vaja',  '{}'::text[], NULL)
) AS v(code, meaning, category, aliases, explanation)
ON CONFLICT ((lower(code))) DO NOTHING;
