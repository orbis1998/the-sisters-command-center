-- Accounting flows: depot receipts, stock movements, weekly sales lines

CREATE TABLE IF NOT EXISTS public.depot_receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  investment_id UUID REFERENCES public.manager_investments(id) ON DELETE SET NULL,
  manager_id UUID NOT NULL REFERENCES public.user_roles(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.locations(id),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  erp_product_id UUID NOT NULL REFERENCES public.erp_products(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.locations(id),
  movement_type TEXT NOT NULL CHECK (movement_type IN (
    'depot_restock',
    'depot_out_to_pos',
    'pos_restock_from_depot',
    'weekly_stock_update',
    'correction'
  )),
  quantity_change INTEGER NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.manager_report_sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID NOT NULL REFERENCES public.manager_reports(id) ON DELETE CASCADE,
  erp_product_id UUID NOT NULL REFERENCES public.erp_products(id) ON DELETE CASCADE,
  retail_qty INTEGER NOT NULL DEFAULT 0,
  wholesale_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  retail_revenue DECIMAL(12,2) NOT NULL DEFAULT 0,
  remaining_stock INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.manager_reports
  ADD COLUMN IF NOT EXISTS retail_revenue DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wholesale_revenue DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_revenue DECIMAL(12,2) NOT NULL DEFAULT 0;

ALTER TABLE public.depot_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manager_report_sales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon manage depot receipts" ON public.depot_receipts;
CREATE POLICY "Allow anon manage depot receipts"
ON public.depot_receipts FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon manage stock movements" ON public.stock_movements;
CREATE POLICY "Allow anon manage stock movements"
ON public.stock_movements FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon manage report sales" ON public.manager_report_sales;
CREATE POLICY "Allow anon manage report sales"
ON public.manager_report_sales FOR ALL USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.depot_receipts TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_movements TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.manager_report_sales TO anon, authenticated;
