-- Povezava trenerke Elena Bagdalova z Auth računom
-- Poženite v Supabase SQL Editor.
--
-- PREDPOGOJ (ročno v Dashboard):
--   Authentication → Users → Add user
--     Email: elenagolovko83@gmail.com
--     Password: (nastavite geslo in ga posredujte trenerki)
--     Auto Confirm User: ON
--
-- Nato poženite ta skript.

DO $$
DECLARE
  v_user_id uuid;
  v_trainer_id uuid := 'a25e6812-d5f3-49d7-8e01-e86a78f552a1';
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'elenagolovko83@gmail.com'
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Auth uporabnik elenagolovko83@gmail.com ne obstaja. Najprej ga ustvarite v Authentication → Users (Auto Confirm: ON).';
  END IF;

  UPDATE public.trainers
  SET
    user_id = v_user_id,
    email = 'elenagolovko83@gmail.com',
    first_name = COALESCE(NULLIF(first_name, ''), 'Elena'),
    last_name = COALESCE(NULLIF(last_name, ''), 'Bagdalova'),
    role = COALESCE(NULLIF(role, ''), 'trainer')
  WHERE id = v_trainer_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trener z id % ni najden.', v_trainer_id;
  END IF;

  RAISE NOTICE 'Elena povezana: user_id %', v_user_id;
END $$;

-- Preverite
SELECT email, first_name, last_name, role, user_id IS NOT NULL AS can_login
FROM public.trainers
WHERE email = 'elenagolovko83@gmail.com';

-- Prijava: https://eklub.vercel.app/login.html
