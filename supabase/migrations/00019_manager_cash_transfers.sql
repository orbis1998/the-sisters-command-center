-- Manager weekly cash remittances (transfert / remise → caisse à 0)

CREATE TABLE IF NOT EXISTS public.manager_cash_transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  manager_id UUID NOT NULL REFERENCES public.user_roles(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_manager_cash_transfers_manager_date
  ON public.manager_cash_transfers (manager_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_manager_cash_transfers_location_date
  ON public.manager_cash_transfers (location_id, date DESC);

ALTER TABLE public.manager_cash_transfers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon manage manager cash transfers" ON public.manager_cash_transfers;
CREATE POLICY "Allow anon manage manager cash transfers"
ON public.manager_cash_transfers FOR ALL USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.manager_cash_transfers TO anon, authenticated;
