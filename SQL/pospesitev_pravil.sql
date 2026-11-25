-- Hitrejša pravila RLS: is_super_admin() in current_trainer_id() se izračunata enkrat na poizvedbo, ne za vsako vrstico.
-- Kdo kaj vidi in spreminja, ostane enako. Vse ali nič.
DO $$
BEGIN
  ALTER POLICY training_sets_own ON public.training_sets
    USING ((SELECT is_super_admin()) OR trainer_id = (SELECT current_trainer_id()))
    WITH CHECK ((SELECT is_super_admin()) OR trainer_id = (SELECT current_trainer_id()));
  ALTER POLICY trainings_own ON public.trainings
    USING ((SELECT is_super_admin()) OR trainer_id = (SELECT current_trainer_id()))
    WITH CHECK ((SELECT is_super_admin()) OR trainer_id = (SELECT current_trainer_id()));
  ALTER POLICY training_settings_own ON public.training_settings
    USING ((SELECT is_super_admin()) OR trainer_id = (SELECT current_trainer_id()))
    WITH CHECK ((SELECT is_super_admin()) OR trainer_id = (SELECT current_trainer_id()));
  ALTER POLICY training_drill_suggestions_own ON public.training_drill_suggestions
    USING ((SELECT is_super_admin()) OR trainer_id = (SELECT current_trainer_id()))
    WITH CHECK ((SELECT is_super_admin()) OR trainer_id = (SELECT current_trainer_id()));
  ALTER POLICY training_items_own ON public.training_items
    USING ((SELECT is_super_admin()) OR EXISTS (SELECT 1 FROM public.trainings t WHERE t.id = training_items.training_id AND t.trainer_id = (SELECT current_trainer_id())))
    WITH CHECK ((SELECT is_super_admin()) OR EXISTS (SELECT 1 FROM public.trainings t WHERE t.id = training_items.training_id AND t.trainer_id = (SELECT current_trainer_id())));
  -- Koledar: can_access_term() že vsebuje is_super_admin(), zato je pogoj enakovreden.
  ALTER POLICY attendance_select ON public.attendance USING ((SELECT is_super_admin()) OR can_access_term(term_id));
  ALTER POLICY trainer_attendance_select ON public.trainer_attendance USING ((SELECT is_super_admin()) OR can_access_term(term_id));
  ALTER POLICY term_status_select ON public.term_status USING ((SELECT is_super_admin()) OR can_access_term(term_id));
  ALTER POLICY terms_select ON public.terms USING ((SELECT is_super_admin()) OR can_access_term(id));
  ALTER POLICY trainer_terms_select ON public.trainer_terms USING ((SELECT is_super_admin()) OR trainer_id = (SELECT current_trainer_id()));
  IF (SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND qual LIKE '%( SELECT is_super_admin()%') <> 10 THEN
    RAISE EXCEPTION 'Nepričakovano število pravil';
  END IF;
END $$;
