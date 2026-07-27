-- Accounting periods (exercices comptables)

CREATE TABLE IF NOT EXISTS public.accounting_periods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  label TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  closed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.accounting_period_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  period_id UUID NOT NULL REFERENCES public.accounting_periods(id) ON DELETE CASCADE,
  depot_revenue DECIMAL(12,2) NOT NULL DEFAULT 0,
  sales_revenue DECIMAL(12,2) NOT NULL DEFAULT 0,
  operating_expenses DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_revenue DECIMAL(12,2) NOT NULL DEFAULT 0,
  profit DECIMAL(12,2) NOT NULL DEFAULT 0,
  global_stock_qty INTEGER NOT NULL DEFAULT 0,
  pos_stock_qty INTEGER NOT NULL DEFAULT 0,
  snapshot_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS accounting_periods_one_open_idx
  ON public.accounting_periods ((status))
  WHERE status = 'open';

ALTER TABLE public.accounting_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_period_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read accounting periods" ON public.accounting_periods;
CREATE POLICY "Allow read accounting periods"
ON public.accounting_periods FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated manage accounting periods" ON public.accounting_periods;
CREATE POLICY "Allow authenticated manage accounting periods"
ON public.accounting_periods FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow read period snapshots" ON public.accounting_period_snapshots;
CREATE POLICY "Allow read period snapshots"
ON public.accounting_period_snapshots FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated manage period snapshots" ON public.accounting_period_snapshots;
CREATE POLICY "Allow authenticated manage period snapshots"
ON public.accounting_period_snapshots FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

GRANT SELECT ON public.accounting_periods TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.accounting_periods TO authenticated;
GRANT SELECT ON public.accounting_period_snapshots TO anon, authenticated;
GRANT SELECT, INSERT ON public.accounting_period_snapshots TO authenticated;

INSERT INTO public.accounting_periods (label, start_date, status)
SELECT 'Exercice 2026', DATE '2026-01-01', 'open'
WHERE NOT EXISTS (
  SELECT 1 FROM public.accounting_periods WHERE status = 'open'
);

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

GRANT EXECUTE ON FUNCTION public.close_accounting_period(UUID, DATE, TEXT) TO authenticated;
