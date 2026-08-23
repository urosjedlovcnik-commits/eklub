-- Trener: uros@playworldgame.com + jutranji termini (začetek pred 12:00)
-- Poženite v Supabase SQL Editor.
--
-- PREDPOGOJE:
-- 1. V Authentication → Users mora obstajati uros@playworldgame.com
--    (Auto Confirm User: ON, nastavite geslo)
-- 2. Poženite phase2_rls_security.sql (super_admin lahko piše trainer_terms)

-- ===== 1. Trener + povezava z Auth =====
DO $$
DECLARE
  v_user_id uuid;
  v_trainer_id uuid;
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'uros@playworldgame.com'
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Auth uporabnik uros@playworldgame.com ne obstaja. Najprej ga ustvarite v Authentication → Users.';
  END IF;

  SELECT id INTO v_trainer_id
  FROM public.trainers
  WHERE email IN ('uros@playworldgame.com', 'uros@playworldgame.ocm')
  ORDER BY CASE WHEN email = 'uros@playworldgame.com' THEN 0 ELSE 1 END
  LIMIT 1;

  IF v_trainer_id IS NULL THEN
    INSERT INTO public.trainers (id, email, first_name, last_name, role, user_id)
    VALUES (
      gen_random_uuid(),
      'uros@playworldgame.com',
      'Uroš',
      'Playworld',
      'trainer',
      v_user_id
    )
    RETURNING id INTO v_trainer_id;
  ELSE
    UPDATE public.trainers
    SET
      email = 'uros@playworldgame.com',
      user_id = v_user_id,
      role = COALESCE(NULLIF(role, ''), 'trainer')
    WHERE id = v_trainer_id;
  END IF;

  RAISE NOTICE 'Trener pripravljen: % (user_id %)', v_trainer_id, v_user_id;
END $$;

-- ===== 2. Jutranji termini (start pred 12:00, še veljavni) =====
INSERT INTO public.trainer_terms (id, trainer_id, term_id)
SELECT
  gen_random_uuid(),
  tr.id,
  t.id
FROM public.trainers tr
CROSS JOIN public.terms t
WHERE tr.email = 'uros@playworldgame.com'
  AND EXTRACT(HOUR FROM t.start_time::time) < 12
  AND t.date_to >= CURRENT_DATE
  AND NOT EXISTS (
    SELECT 1
    FROM public.trainer_terms tt
    WHERE tt.trainer_id = tr.id
      AND tt.term_id = t.id
  );

-- ===== 3. Preverite =====
SELECT tr.email, tr.first_name, tr.last_name, tr.role, tr.user_id
FROM public.trainers tr
WHERE tr.email = 'uros@playworldgame.com';

SELECT t.id, t.label, t.start_time, t.end_time, t.date_from, t.date_to
FROM public.trainer_terms tt
JOIN public.trainers tr ON tr.id = tt.trainer_id
JOIN public.terms t ON t.id = tt.term_id
WHERE tr.email = 'uros@playworldgame.com'
ORDER BY t.day, t.start_time;

-- Pričakovano (sezona 2025/26): pon/tor/čet 06:15–07:15, sre 07:15–08:15
-- Prijava: https://eklub.vercel.app/login.html → vidi samo svoje jutranje termine
