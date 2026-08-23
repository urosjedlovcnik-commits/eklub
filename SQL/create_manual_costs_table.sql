-- ===== USTVARJANJE TABELE ZA ROČNO VNESENE STROŠKE =====
-- Ta tabela shranjuje ročno vnesene vrednosti stroškov za posamezne mesece

CREATE TABLE IF NOT EXISTS "public"."manual_costs" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "month" integer NOT NULL CHECK (month >= 1 AND month <= 12),
    "year" integer NOT NULL CHECK (year >= 2000),
    "monthly_fee" decimal(10,2),
    "trainer_cost" decimal(10,2),
    "management_cost" decimal(10,2),
    "facility_cost" decimal(10,2),
    "membership_fee" decimal(10,2) DEFAULT 0.00,
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now(),
    UNIQUE("month", "year")
);

-- Dodaj RLS politiko
ALTER TABLE "public"."manual_costs" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "manual_costs_admin_access" ON "public"."manual_costs";
CREATE POLICY "manual_costs_admin_access" ON "public"."manual_costs"
    FOR ALL USING (auth.role() = 'authenticated');

-- Dodaj trigger za updated_at
DROP TRIGGER IF EXISTS update_manual_costs_updated_at ON "public"."manual_costs";
CREATE TRIGGER update_manual_costs_updated_at 
    BEFORE UPDATE ON "public"."manual_costs" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

