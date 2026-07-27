-- ERP catalog separate from website e-commerce products
CREATE TABLE IF NOT EXISTS public.erp_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  unit_purchase_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  selling_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  min_stock INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Point ERP stock to erp_products (not website products)
ALTER TABLE public.inventory_stock
  DROP CONSTRAINT IF EXISTS inventory_stock_product_id_fkey;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'inventory_stock' AND column_name = 'erp_product_id'
  ) THEN
    ALTER TABLE public.inventory_stock ADD COLUMN erp_product_id UUID;
  END IF;
END $$;

-- Prefer erp_product_id going forward; keep product_id nullable for legacy rows
ALTER TABLE public.inventory_stock
  ALTER COLUMN product_id DROP NOT NULL;

ALTER TABLE public.inventory_stock
  DROP CONSTRAINT IF EXISTS inventory_stock_erp_product_id_fkey;

ALTER TABLE public.inventory_stock
  ADD CONSTRAINT inventory_stock_erp_product_id_fkey
  FOREIGN KEY (erp_product_id) REFERENCES public.erp_products(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS inventory_stock_erp_product_location_key
  ON public.inventory_stock (erp_product_id, location_id)
  WHERE erp_product_id IS NOT NULL;

-- Restocks / adjustments also need ERP product refs
ALTER TABLE public.restocks
  DROP CONSTRAINT IF EXISTS restocks_product_id_fkey;
ALTER TABLE public.restocks
  ALTER COLUMN product_id DROP NOT NULL;
ALTER TABLE public.restocks
  ADD COLUMN IF NOT EXISTS erp_product_id UUID REFERENCES public.erp_products(id);

ALTER TABLE public.stock_adjustments
  DROP CONSTRAINT IF EXISTS stock_adjustments_product_id_fkey;
ALTER TABLE public.stock_adjustments
  ALTER COLUMN product_id DROP NOT NULL;
ALTER TABLE public.stock_adjustments
  ADD COLUMN IF NOT EXISTS erp_product_id UUID REFERENCES public.erp_products(id);

ALTER TABLE public.manager_report_inventory
  DROP CONSTRAINT IF EXISTS manager_report_inventory_product_id_fkey;
ALTER TABLE public.manager_report_inventory
  ALTER COLUMN product_id DROP NOT NULL;
ALTER TABLE public.manager_report_inventory
  ADD COLUMN IF NOT EXISTS erp_product_id UUID REFERENCES public.erp_products(id);

-- Manager ERP access flag on user_roles
ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Helper view for CEO team page (no direct auth.users from client)
CREATE OR REPLACE VIEW public.erp_managers AS
SELECT
  ur.id,
  ur.user_id,
  COALESCE(NULLIF(ur.name, ''), p.full_name, 'Manager') AS name,
  COALESCE(ur.badge_code, p.badge_id) AS badge_code,
  COALESCE(ur.location_id, p.pos_id) AS location_id,
  COALESCE(ur.is_active, true) AS is_active,
  p.phone,
  p.city_scope,
  p.badge_id,
  ur.created_at
FROM public.user_roles ur
LEFT JOIN public.profiles p ON p.id = ur.user_id
WHERE ur.role = 'manager'::app_role;

-- RLS for erp_products
ALTER TABLE public.erp_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated manage erp products" ON public.erp_products;
CREATE POLICY "Allow authenticated manage erp products"
ON public.erp_products
FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow anon read erp products" ON public.erp_products;
CREATE POLICY "Allow anon read erp products"
ON public.erp_products
FOR SELECT
USING (true);

-- Allow reading managers view
GRANT SELECT ON public.erp_managers TO anon, authenticated;
GRANT SELECT, UPDATE ON public.user_roles TO authenticated;
GRANT SELECT ON public.profiles TO anon, authenticated;
