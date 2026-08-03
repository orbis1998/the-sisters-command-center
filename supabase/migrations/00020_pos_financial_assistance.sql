-- Financial assistance between POS (and depot → POS). Atomic debit/credit + audit.

ALTER TABLE public.global_expenses
  DROP CONSTRAINT IF EXISTS global_expenses_category_check;

ALTER TABLE public.global_expenses
  ADD CONSTRAINT global_expenses_category_check
  CHECK (category IN (
    'salary',
    'rent',
    'marketing',
    'subscription',
    'transport_taxi',
    'shipping',
    'stock_purchase',
    'investment',
    'taxes',
    'unexpected',
    'financial_assistance'
  ));

CREATE TABLE IF NOT EXISTS public.pos_financial_assistances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'cancelled')),
  from_type TEXT NOT NULL CHECK (from_type IN ('pos', 'depot')),
  from_location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  from_depot_id UUID REFERENCES public.erp_depot_accounts(id) ON DELETE SET NULL,
  to_location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  performed_by_manager_id UUID REFERENCES public.user_roles(id) ON DELETE SET NULL,
  performed_by_depot_id UUID REFERENCES public.erp_depot_accounts(id) ON DELETE SET NULL,
  sender_expense_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT pos_financial_assistances_from_chk CHECK (
    (from_type = 'pos' AND from_location_id IS NOT NULL)
    OR (from_type = 'depot' AND from_depot_id IS NOT NULL)
  ),
  CONSTRAINT pos_financial_assistances_not_self CHECK (
    from_location_id IS NULL OR from_location_id <> to_location_id
  )
);

CREATE INDEX IF NOT EXISTS idx_pos_fin_assist_from_loc_date
  ON public.pos_financial_assistances (from_location_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_pos_fin_assist_to_loc_date
  ON public.pos_financial_assistances (to_location_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_pos_fin_assist_created
  ON public.pos_financial_assistances (created_at DESC);

ALTER TABLE public.pos_financial_assistances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon manage pos financial assistances" ON public.pos_financial_assistances;
CREATE POLICY "Allow anon manage pos financial assistances"
ON public.pos_financial_assistances FOR ALL USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pos_financial_assistances TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.apply_pos_financial_assistance(
  p_amount NUMERIC,
  p_to_location_id UUID,
  p_from_type TEXT,
  p_from_location_id UUID DEFAULT NULL,
  p_from_depot_id UUID DEFAULT NULL,
  p_performed_by_manager_id UUID DEFAULT NULL,
  p_performed_by_depot_id UUID DEFAULT NULL,
  p_date DATE DEFAULT CURRENT_DATE,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_expense_id UUID;
  v_to_name TEXT;
  v_from_name TEXT;
  v_depot_name TEXT;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Montant invalide';
  END IF;

  IF p_from_type NOT IN ('pos', 'depot') THEN
    RAISE EXCEPTION 'Type émetteur invalide';
  END IF;

  SELECT name INTO v_to_name FROM locations WHERE id = p_to_location_id;
  IF v_to_name IS NULL THEN
    RAISE EXCEPTION 'Point de vente bénéficiaire introuvable';
  END IF;
  IF v_to_name = 'DEPOT GLOBAL' THEN
    RAISE EXCEPTION 'Le dépôt ne peut pas recevoir une assistance financière';
  END IF;

  IF p_from_type = 'pos' THEN
    IF p_from_location_id IS NULL THEN
      RAISE EXCEPTION 'Point de vente émetteur requis';
    END IF;
    IF p_from_location_id = p_to_location_id THEN
      RAISE EXCEPTION 'Impossible d''assister son propre point de vente';
    END IF;
    SELECT name INTO v_from_name FROM locations WHERE id = p_from_location_id;
    IF v_from_name IS NULL OR v_from_name = 'DEPOT GLOBAL' THEN
      RAISE EXCEPTION 'Émetteur POS invalide';
    END IF;

    INSERT INTO global_expenses (
      date, category, amount, location_id, description, recorded_by
    )
    VALUES (
      COALESCE(p_date, CURRENT_DATE),
      'financial_assistance',
      p_amount,
      p_from_location_id,
      COALESCE(p_notes, 'Assistance financière vers ' || v_to_name),
      p_performed_by_manager_id
    )
    RETURNING id INTO v_expense_id;

  ELSIF p_from_type = 'depot' THEN
    IF p_from_depot_id IS NULL THEN
      RAISE EXCEPTION 'Compte dépôt émetteur requis';
    END IF;
    SELECT name INTO v_depot_name FROM erp_depot_accounts WHERE id = p_from_depot_id;
    IF v_depot_name IS NULL THEN
      RAISE EXCEPTION 'Compte dépôt introuvable';
    END IF;
    v_from_name := COALESCE(v_depot_name, 'Dépôt');

    INSERT INTO depot_expenses (
      date, object, description, amount, responsible, recorded_by_depot_id
    )
    VALUES (
      COALESCE(p_date, CURRENT_DATE),
      'financial_assistance',
      COALESCE(p_notes, 'Assistance financière vers ' || v_to_name),
      p_amount,
      v_from_name,
      p_from_depot_id
    )
    RETURNING id INTO v_expense_id;
  END IF;

  INSERT INTO pos_financial_assistances (
    date, amount, notes, status, from_type,
    from_location_id, from_depot_id, to_location_id,
    performed_by_manager_id, performed_by_depot_id, sender_expense_id
  )
  VALUES (
    COALESCE(p_date, CURRENT_DATE),
    p_amount,
    p_notes,
    'completed',
    p_from_type,
    p_from_location_id,
    p_from_depot_id,
    p_to_location_id,
    p_performed_by_manager_id,
    p_performed_by_depot_id,
    v_expense_id
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_pos_financial_assistance(
  NUMERIC, UUID, TEXT, UUID, UUID, UUID, UUID, DATE, TEXT
) TO anon, authenticated;
