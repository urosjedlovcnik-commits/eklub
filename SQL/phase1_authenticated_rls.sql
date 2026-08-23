-- Faza 1: RLS za prijavljene trenerje (authenticated)
-- Koledar po prijavi uporablja JWT vloge "authenticated", ne "anon".
-- Poženite v Supabase SQL Editor.

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'terms',
    'swimmers',
    'trainers',
    'trainer_terms',
    'attendance',
    'term_status',
    'trainer_attendance',
    'swimmer_term_assignments',
    'substitute_trainers'
  ]
  LOOP
    IF EXISTS (
      SELECT 1 FROM pg_tables
      WHERE schemaname = 'public' AND tablename = tbl
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);

      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = tbl
          AND policyname = 'Allow authenticated calendar access'
      ) THEN
        EXECUTE format(
          'CREATE POLICY "Allow authenticated calendar access" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
          tbl
        );
        RAISE NOTICE 'Policy dodana za %', tbl;
      ELSE
        RAISE NOTICE 'Policy za % že obstaja', tbl;
      END IF;
    ELSE
      RAISE NOTICE 'Tabela % ne obstaja — preskočeno', tbl;
    END IF;
  END LOOP;
END $$;

-- Preverite (prijavljeni uporabniki morajo videti termine):
-- SELECT COUNT(*) FROM terms;
