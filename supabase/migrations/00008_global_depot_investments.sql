-- Global depot fields on ERP products (Excel INVENTORY style)
ALTER TABLE public.erp_products
  ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'unit',
  ADD COLUMN IF NOT EXISTS global_qty INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_checked DATE;

-- Manager investment = purchase from global depot
CREATE TABLE IF NOT EXISTS public.manager_investments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  manager_id UUID NOT NULL REFERENCES public.user_roles(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.locations(id),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.manager_investment_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  investment_id UUID NOT NULL REFERENCES public.manager_investments(id) ON DELETE CASCADE,
  erp_product_id UUID NOT NULL REFERENCES public.erp_products(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  line_total DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.manager_investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manager_investment_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon manage investments" ON public.manager_investments;
CREATE POLICY "Allow anon manage investments"
ON public.manager_investments FOR ALL
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon manage investment items" ON public.manager_investment_items;
CREATE POLICY "Allow anon manage investment items"
ON public.manager_investment_items FOR ALL
USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.manager_investments TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.manager_investment_items TO anon, authenticated;

-- Global depot restocks are not tied to a POS
ALTER TABLE public.restocks
  ALTER COLUMN location_id DROP NOT NULL;

INSERT INTO public.locations (name, country)
SELECT 'DEPOT GLOBAL', 'Global'
WHERE NOT EXISTS (
  SELECT 1 FROM public.locations WHERE name = 'DEPOT GLOBAL'
);
