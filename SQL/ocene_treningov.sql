-- Ocena izvedenega treninga 1–10, vidiki, ki so bili najbolj všeč, in opomba. Pravila dostopa (RLS) ostanejo ista.
ALTER TABLE public.trainings
  ADD COLUMN IF NOT EXISTS rating smallint CHECK (rating BETWEEN 1 AND 10),
  ADD COLUMN IF NOT EXISTS liked_phases text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS rating_note text CHECK (char_length(rating_note) <= 500),
  ADD COLUMN IF NOT EXISTS rated_at timestamptz;
NOTIFY pgrst, 'reload schema';
