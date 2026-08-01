-- CEO personal expenses (Axelle / Allexe) and depot operating expenses

CREATE TABLE IF NOT EXISTS public.ceo_personal_expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner TEXT NOT NULL CHECK (owner IN ('axelle', 'allexe')),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  description TEXT NOT NULL,
  comment TEXT,
  recorded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ceo_personal_expenses_owner_date_idx
  ON public.ceo_personal_expenses (owner, date DESC);

CREATE TABLE IF NOT EXISTS public.depot_expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  object TEXT NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  responsible TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS depot_expenses_date_idx
  ON public.depot_expenses (date DESC);

ALTER TABLE public.ceo_personal_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.depot_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated manage ceo personal expenses" ON public.ceo_personal_expenses;
CREATE POLICY "Allow authenticated manage ceo personal expenses"
ON public.ceo_personal_expenses FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated manage depot expenses" ON public.depot_expenses;
CREATE POLICY "Allow authenticated manage depot expenses"
ON public.depot_expenses FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ceo_personal_expenses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.depot_expenses TO authenticated;

-- Include CEO personal + depot expenses in period close snapshot totals
CREATE OR REPLACE FUNCTION public.close_accounting_period(
  p_period_id UUID,
  p_end_date DATE DEFAULT CURRENT_DATE,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  period_row public.accounting_periods%ROWTYPE;
  v_depot_revenue DECIMAL(12,2) := 0;
  v_sales_revenue DECIMAL(12,2) := 0;
  v_operating_expenses DECIMAL(12,2) := 0;
  v_ceo_expenses DECIMAL(12,2) := 0;
  v_depot_expenses DECIMAL(12,2) := 0;
  v_global_stock_qty INTEGER := 0;
  v_pos_stock_qty INTEGER := 0;
  v_new_period_id UUID;
  v_new_label TEXT;
BEGIN
  SELECT * INTO period_row
  FROM public.accounting_periods
  WHERE id = p_period_id
  FOR UPDATE;

  IF period_row IS NULL THEN
    RAISE EXCEPTION 'Exercice introuvable';
  END IF;

  IF period_row.status <> 'open' THEN
    RAISE EXCEPTION 'Cet exercice est déjà clôturé';
  END IF;

  IF p_end_date < period_row.start_date THEN
    RAISE EXCEPTION 'La date de clôture ne peut pas être avant le début de l''exercice';
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_depot_revenue
  FROM public.depot_receipts
  WHERE date >= period_row.start_date
    AND date <= p_end_date;

  SELECT COALESCE(SUM(total_revenue), 0) INTO v_sales_revenue
  FROM public.manager_reports
  WHERE COALESCE(week_end_date, week_start_date, created_at::date) >= period_row.start_date
    AND COALESCE(week_end_date, week_start_date, created_at::date) <= p_end_date;

  SELECT COALESCE(SUM(amount), 0) INTO v_operating_expenses
  FROM public.global_expenses
  WHERE date >= period_row.start_date
    AND date <= p_end_date
    AND category NOT IN ('stock_purchase', 'investment');

  SELECT COALESCE(SUM(amount), 0) INTO v_ceo_expenses
  FROM public.ceo_personal_expenses
  WHERE date >= period_row.start_date
    AND date <= p_end_date;

  SELECT COALESCE(SUM(amount), 0) INTO v_depot_expenses
  FROM public.depot_expenses
  WHERE date >= period_row.start_date
    AND date <= p_end_date;

  v_operating_expenses := v_operating_expenses + v_ceo_expenses + v_depot_expenses;

  SELECT COALESCE(SUM(global_qty), 0) INTO v_global_stock_qty
  FROM public.erp_products;

  SELECT COALESCE(SUM(quantity), 0) INTO v_pos_stock_qty
  FROM public.inventory_stock;

  INSERT INTO public.accounting_period_snapshots (
    period_id,
    depot_revenue,
    sales_revenue,
    operating_expenses,
    total_revenue,
    profit,
    global_stock_qty,
    pos_stock_qty
  )
  VALUES (
    p_period_id,
    v_depot_revenue,
    v_sales_revenue,
    v_operating_expenses,
    v_depot_revenue + v_sales_revenue,
    (v_depot_revenue + v_sales_revenue) - v_operating_expenses,
    v_global_stock_qty,
    v_pos_stock_qty
  );

  UPDATE public.accounting_periods
  SET status = 'closed',
      end_date = p_end_date,
      closed_at = NOW(),
      notes = COALESCE(p_notes, notes)
  WHERE id = p_period_id;

  v_new_label := 'Exercice ' || EXTRACT(YEAR FROM (p_end_date + INTERVAL '1 day'))::TEXT;

  INSERT INTO public.accounting_periods (label, start_date, status)
  VALUES (v_new_label, p_end_date + INTERVAL '1 day', 'open')
  RETURNING id INTO v_new_period_id;

  RETURN v_new_period_id;
END;
$$;
