-- Opcijski telefon trenerja (admin: dodaj / uredi trenerja)
-- Poženite v Supabase SQL Editor, če še ni aplicirano.

ALTER TABLE public.trainers ADD COLUMN IF NOT EXISTS phone TEXT;

COMMENT ON COLUMN public.trainers.phone IS 'Opcijski telefon trenerja (prikaz v adminu)';
