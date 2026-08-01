-- Depot staff accounts (badge login, like managers)
CREATE TABLE IF NOT EXISTS public.erp_depot_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL DEFAULT 'Dépôt',
  badge_code TEXT UNIQUE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.erp_depot_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read depot accounts" ON public.erp_depot_accounts;
CREATE POLICY "Allow read depot accounts"
ON public.erp_depot_accounts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated manage depot accounts" ON public.erp_depot_accounts;
CREATE POLICY "Allow authenticated manage depot accounts"
ON public.erp_depot_accounts FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

GRANT SELECT ON public.erp_depot_accounts TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.erp_depot_accounts TO authenticated;

INSERT INTO public.erp_depot_accounts (name, badge_code, is_active)
SELECT 'Compte Dépôt', 'DEPOT001', true
WHERE NOT EXISTS (
  SELECT 1 FROM public.erp_depot_accounts WHERE badge_code = 'DEPOT001'
);

-- Managers record CEO personal expenses (anon badge session)
ALTER TABLE public.ceo_personal_expenses
  ADD COLUMN IF NOT EXISTS recorded_by_manager_id UUID REFERENCES public.user_roles(id) ON DELETE SET NULL;

ALTER TABLE public.depot_expenses
  ADD COLUMN IF NOT EXISTS recorded_by_depot_id UUID REFERENCES public.erp_depot_accounts(id) ON DELETE SET NULL;

DROP POLICY IF EXISTS "Allow anon manage ceo personal expenses" ON public.ceo_personal_expenses;
CREATE POLICY "Allow anon manage ceo personal expenses"
ON public.ceo_personal_expenses FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon manage depot expenses" ON public.depot_expenses;
CREATE POLICY "Allow anon manage depot expenses"
ON public.depot_expenses FOR ALL USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ceo_personal_expenses TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.depot_expenses TO anon, authenticated;

-- Ensure DEPOT GLOBAL location exists for depot weekly reports
INSERT INTO public.locations (name, country)
SELECT 'DEPOT GLOBAL', 'CD'
WHERE NOT EXISTS (
  SELECT 1 FROM public.locations WHERE name = 'DEPOT GLOBAL'
);

ALTER TABLE public.erp_depot_accounts
  ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS report_manager_id UUID REFERENCES public.user_roles(id) ON DELETE SET NULL;

-- Synthetic manager row for depot weekly reports (no badge → never used for login)
INSERT INTO public.user_roles (name, role, location_id, is_active)
SELECT 'Compte Dépôt', 'manager', loc.id, true
FROM public.locations loc
WHERE loc.name = 'DEPOT GLOBAL'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.name = 'Compte Dépôt' AND ur.location_id = loc.id
  );

UPDATE public.erp_depot_accounts da
SET
  location_id = loc.id,
  report_manager_id = ur.id
FROM public.locations loc
JOIN public.user_roles ur
  ON ur.location_id = loc.id AND ur.name = 'Compte Dépôt' AND ur.role = 'manager'
WHERE loc.name = 'DEPOT GLOBAL'
  AND da.badge_code = 'DEPOT001';

-- Anon (badge) can read restock history; writes go through RPC
DROP POLICY IF EXISTS "Allow anon read restocks" ON public.restocks;
CREATE POLICY "Allow anon read restocks"
ON public.restocks FOR SELECT USING (true);

GRANT SELECT ON public.restocks TO anon, authenticated;

-- Depot restock: update global_qty + restocks + movement (SECURITY DEFINER for anon badge)
CREATE OR REPLACE FUNCTION public.apply_depot_restock(
  p_product_id UUID,
  p_quantity INTEGER,
  p_unit_cost NUMERIC,
  p_date DATE DEFAULT CURRENT_DATE,
  p_notes TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_restock_id UUID;
  v_next_qty INTEGER;
BEGIN
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantité invalide';
  END IF;

  UPDATE public.erp_products
  SET
    global_qty = COALESCE(global_qty, 0) + p_quantity,
    unit_purchase_price = COALESCE(p_unit_cost, unit_purchase_price),
    last_checked = COALESCE(p_date, CURRENT_DATE)
  WHERE id = p_product_id
  RETURNING global_qty INTO v_next_qty;

  IF v_next_qty IS NULL THEN
    RAISE EXCEPTION 'Produit introuvable';
  END IF;

  INSERT INTO public.restocks (
    erp_product_id, quantity, unit_cost, total_cost, date, notes, location_id, created_by
  )
  VALUES (
    p_product_id,
    p_quantity,
    COALESCE(p_unit_cost, 0),
    p_quantity * COALESCE(p_unit_cost, 0),
    COALESCE(p_date, CURRENT_DATE),
    p_notes,
    NULL,
    p_created_by
  )
  RETURNING id INTO v_restock_id;

  INSERT INTO public.erp_stock_movements (
    erp_product_id, location_id, movement_type, quantity_change,
    reference_type, reference_id, notes
  )
  VALUES (
    p_product_id, NULL, 'depot_restock', p_quantity,
    'restock', v_restock_id, COALESCE(p_notes, 'Approvisionnement dépôt')
  );

  RETURN v_restock_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_depot_restock(UUID, INTEGER, NUMERIC, DATE, TEXT, UUID)
  TO anon, authenticated;

-- Depot weekly report: set remaining global stock
CREATE OR REPLACE FUNCTION public.apply_depot_weekly_stock(
  p_product_id UUID,
  p_remaining INTEGER,
  p_report_id UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_remaining IS NULL OR p_remaining < 0 THEN
    RAISE EXCEPTION 'Stock restant invalide';
  END IF;

  UPDATE public.erp_products
  SET global_qty = p_remaining, last_checked = CURRENT_DATE
  WHERE id = p_product_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Produit introuvable';
  END IF;

  INSERT INTO public.erp_stock_movements (
    erp_product_id, location_id, movement_type, quantity_change,
    reference_type, reference_id, notes
  )
  VALUES (
    p_product_id, NULL, 'weekly_stock_update', 0,
    'report', p_report_id, 'Stock dépôt restant: ' || p_remaining
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_depot_weekly_stock(UUID, INTEGER, UUID)
  TO anon, authenticated;
