-- Dostop do terminov, kjer je trener vpisan kot nadomešča (trainer_attendance)
-- Poženite v Supabase SQL Editor.

CREATE OR REPLACE FUNCTION public.can_access_term(p_term_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_super_admin()
  OR EXISTS (
    SELECT 1
    FROM public.trainer_terms tt
    JOIN public.trainers tr ON tr.id = tt.trainer_id
    WHERE tt.term_id = p_term_id
      AND tr.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.trainer_attendance ta
    JOIN public.trainers tr ON tr.id = ta.trainer_id
    WHERE ta.term_id = p_term_id
      AND tr.user_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION public.can_access_term(text) TO authenticated;
