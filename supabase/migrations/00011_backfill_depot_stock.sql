-- Track stock transfer + backfill past investments where global_qty was never deducted.

ALTER TABLE public.manager_investments
  ADD COLUMN IF NOT EXISTS stock_applied BOOLEAN NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.apply_manager_investment_stock(p_investment_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv RECORD;
  item RECORD;
  v_current INTEGER;
  v_stock_id UUID;
  v_stock_qty INTEGER;
BEGIN
  SELECT id, location_id, stock_applied INTO inv
  FROM manager_investments
  WHERE id = p_investment_id;

  IF inv IS NULL THEN
    RAISE EXCEPTION 'Approvisionnement introuvable';
  END IF;

  IF inv.stock_applied THEN
    RETURN;
  END IF;

  IF inv.location_id IS NULL THEN
    RAISE EXCEPTION 'Aucun point de vente assigné';
  END IF;

  FOR item IN
    SELECT
      i.erp_product_id,
      i.quantity,
      p.name AS product_name
    FROM manager_investment_items i
    JOIN erp_products p ON p.id = i.erp_product_id
    WHERE i.investment_id = p_investment_id
  LOOP
    IF item.quantity <= 0 THEN
      RAISE EXCEPTION 'Quantité invalide pour %', item.product_name;
    END IF;

    SELECT global_qty INTO v_current
    FROM erp_products
    WHERE id = item.erp_product_id
    FOR UPDATE;

    IF v_current IS NULL THEN
      RAISE EXCEPTION 'Produit introuvable';
    END IF;

    IF v_current < item.quantity THEN
      RAISE EXCEPTION 'Stock dépôt insuffisant pour % (dispo: %)', item.product_name, v_current;
    END IF;

    UPDATE erp_products
    SET global_qty = global_qty - item.quantity,
        updated_at = NOW()
    WHERE id = item.erp_product_id;

    SELECT id, quantity INTO v_stock_id, v_stock_qty
    FROM inventory_stock
    WHERE erp_product_id = item.erp_product_id
      AND location_id = inv.location_id
    FOR UPDATE;

    IF v_stock_id IS NOT NULL THEN
      UPDATE inventory_stock
      SET quantity = v_stock_qty + item.quantity
      WHERE id = v_stock_id;
    ELSE
      INSERT INTO inventory_stock (erp_product_id, location_id, quantity)
      VALUES (item.erp_product_id, inv.location_id, item.quantity);
    END IF;

    INSERT INTO stock_movements (
      erp_product_id,
      location_id,
      movement_type,
      quantity_change,
      reference_type,
      reference_id,
      notes
    )
    VALUES
      (
        item.erp_product_id,
        NULL,
        'depot_out_to_pos',
        -item.quantity,
        'investment',
        p_investment_id,
        'Sortie vers POS · ' || item.product_name
      ),
      (
        item.erp_product_id,
        inv.location_id,
        'pos_restock_from_depot',
        item.quantity,
        'investment',
        p_investment_id,
        'Entrée POS · ' || item.product_name
      );
  END LOOP;

  UPDATE manager_investments
  SET stock_applied = true
  WHERE id = p_investment_id;
END;
$$;

-- Backfill: past manager purchases logged movements/POS stock but could not UPDATE erp_products (RLS).
UPDATE public.erp_products p
SET global_qty = GREATEST(0, p.global_qty - sub.total_out),
    updated_at = NOW()
FROM (
  SELECT sm.erp_product_id, SUM(ABS(sm.quantity_change)) AS total_out
  FROM public.stock_movements sm
  WHERE sm.movement_type = 'depot_out_to_pos'
    AND sm.reference_type = 'investment'
  GROUP BY sm.erp_product_id
) sub
WHERE p.id = sub.erp_product_id
  AND sub.total_out > 0;

UPDATE public.manager_investments mi
SET stock_applied = true
WHERE EXISTS (
  SELECT 1
  FROM public.stock_movements sm
  WHERE sm.reference_type = 'investment'
    AND sm.reference_id = mi.id
    AND sm.movement_type = 'depot_out_to_pos'
);
