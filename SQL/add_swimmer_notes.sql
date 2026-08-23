-- Opombe pri plavalcu (admin → Uredi plavalca)
ALTER TABLE swimmers ADD COLUMN IF NOT EXISTS notes TEXT;

COMMENT ON COLUMN swimmers.notes IS 'Interne opombe (admin), opcijsko';

-- RLS: dovoli anon posodobitev, če že imate politike za swimmers
-- Po potrebi poženite fix_rls_policies.sql ali prilagodite obstoječe politike.
