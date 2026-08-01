-- Stock write-offs at $0: loss / damage / gift (depot global or POS)

ALTER TABLE public.erp_stock_movements
  DROP CONSTRAINT IF EXISTS erp_stock_movements_movement_type_check;

ALTER TABLE public.erp_stock_movements
  ADD CONSTRAINT erp_stock_movements_movement_type_check
  CHECK (movement_type IN (
    'depot_restock',
    'depot_out_to_pos',
    'pos_restock_from_depot',
    'weekly_stock_update',
    'correction',
    'loss',
    'damage',
    'gift'
  ));

CREATE OR REPLACE FUNCTION public.apply_stock_writeoff(
  p_product_id UUID,
  p_quantity INTEGER,
  p_reason TEXT,
  p_scope TEXT,
  p_location_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current INTEGER;
  v_stock_id UUID;
  v_movement_id UUID;
  v_type TEXT;
BEGIN
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantité invalide';
  END IF;

  IF p_reason NOT IN ('loss', 'damage', 'gift') THEN
    RAISE EXCEPTION 'Motif invalide';
  END IF;

  v_type := p_reason;

  IF p_scope = 'depot' THEN
    SELECT global_qty INTO v_current
    FROM erp_products
    WHERE id = p_product_id
    FOR UPDATE;

    IF v_current IS NULL THEN
      RAISE EXCEPTION 'Produit introuvable';
    END IF;

    IF v_current < p_quantity THEN
      RAISE EXCEPTION 'Stock dépôt insuffisant (dispo: %)', v_current;
    END IF;

    UPDATE erp_products
    SET global_qty = global_qty - p_quantity,
        last_checked = CURRENT_DATE,
        updated_at = NOW()
    WHERE id = p_product_id;

    INSERT INTO erp_stock_movements (
      erp_product_id, location_id, movement_type, quantity_change,
      reference_type, notes
    )
    VALUES (
      p_product_id, NULL, v_type, -p_quantity,
      'writeoff', COALESCE(p_notes, p_reason || ' · 0$')
    )
    RETURNING id INTO v_movement_id;

  ELSIF p_scope = 'pos' THEN
    IF p_location_id IS NULL THEN
      RAISE EXCEPTION 'Point de vente requis';
    END IF;

    SELECT id, quantity INTO v_stock_id, v_current
    FROM inventory_stock
    WHERE erp_product_id = p_product_id
      AND location_id = p_location_id
    FOR UPDATE;

    IF v_stock_id IS NULL THEN
      RAISE EXCEPTION 'Aucun stock POS pour ce produit';
    END IF;

    IF v_current < p_quantity THEN
      RAISE EXCEPTION 'Stock POS insuffisant (dispo: %)', v_current;
    END IF;

    UPDATE inventory_stock
    SET quantity = quantity - p_quantity
    WHERE id = v_stock_id;

    INSERT INTO erp_stock_movements (
      erp_product_id, location_id, movement_type, quantity_change,
      reference_type, notes
    )
    VALUES (
      p_product_id, p_location_id, v_type, -p_quantity,
      'writeoff', COALESCE(p_notes, p_reason || ' · 0$')
    )
    RETURNING id INTO v_movement_id;
  ELSE
    RAISE EXCEPTION 'Scope invalide (depot|pos)';
  END IF;

  RETURN v_movement_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_stock_writeoff(UUID, INTEGER, TEXT, TEXT, UUID, TEXT)
  TO anon, authenticated;
