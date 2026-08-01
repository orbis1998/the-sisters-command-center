-- Fix jsonb_array_elements when client sends a JSON string scalar
CREATE OR REPLACE FUNCTION public.apply_pos_period_opening(
  p_period_id UUID,
  p_location_id UUID,
  p_manager_id UUID,
  p_opening_ca NUMERIC,
  p_notes TEXT DEFAULT NULL,
  p_items JSONB DEFAULT '[]'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_opening_id UUID;
  v_item JSONB;
  v_product_id UUID;
  v_qty INTEGER;
  v_stock_id UUID;
  v_items JSONB;
BEGIN
  IF p_opening_ca IS NULL OR p_opening_ca < 0 THEN
    RAISE EXCEPTION 'CA d''ouverture invalide';
  END IF;

  IF p_location_id IS NULL THEN
    RAISE EXCEPTION 'Point de vente requis';
  END IF;

  IF p_manager_id IS NULL THEN
    RAISE EXCEPTION 'Manager requis';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pos_period_openings
    WHERE period_id = p_period_id AND location_id = p_location_id
  ) THEN
    RAISE EXCEPTION 'Ouverture déjà enregistrée pour cet exercice';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM accounting_periods WHERE id = p_period_id AND status = 'open'
  ) THEN
    RAISE EXCEPTION 'Aucun exercice ouvert';
  END IF;

  -- Accept array or JSON-encoded array string
  v_items := COALESCE(p_items, '[]'::jsonb);
  IF jsonb_typeof(v_items) = 'string' THEN
    v_items := (v_items #>> '{}')::jsonb;
  END IF;
  IF jsonb_typeof(v_items) IS DISTINCT FROM 'array' THEN
    v_items := '[]'::jsonb;
  END IF;

  INSERT INTO pos_period_openings (period_id, location_id, manager_id, opening_ca, notes)
  VALUES (p_period_id, p_location_id, p_manager_id, p_opening_ca, p_notes)
  RETURNING id INTO v_opening_id;

  FOR v_item IN SELECT value FROM jsonb_array_elements(v_items) AS t(value)
  LOOP
    v_product_id := NULLIF(v_item->>'erp_product_id', '')::uuid;
    v_qty := COALESCE((v_item->>'quantity')::integer, 0);
    IF v_product_id IS NULL OR v_qty < 0 THEN
      RAISE EXCEPTION 'Ligne stock invalide';
    END IF;

    INSERT INTO pos_period_opening_items (opening_id, erp_product_id, quantity)
    VALUES (v_opening_id, v_product_id, v_qty);

    SELECT id INTO v_stock_id
    FROM inventory_stock
    WHERE erp_product_id = v_product_id AND location_id = p_location_id
    FOR UPDATE;

    IF v_stock_id IS NULL THEN
      INSERT INTO inventory_stock (erp_product_id, location_id, quantity)
      VALUES (v_product_id, p_location_id, v_qty);
    ELSE
      UPDATE inventory_stock SET quantity = v_qty WHERE id = v_stock_id;
    END IF;

    INSERT INTO erp_stock_movements (
      erp_product_id, location_id, movement_type, quantity_change,
      reference_type, reference_id, notes
    )
    VALUES (
      v_product_id, p_location_id, 'correction', v_qty,
      'period_opening', v_opening_id, 'Stock d''ouverture d''exercice'
    );
  END LOOP;

  RETURN v_opening_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_pos_period_opening(UUID, UUID, UUID, NUMERIC, TEXT, JSONB)
  TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
