-- Legacy public.stock_movements (product_id/pos_id/delta) already exists from the site.
-- ERP flows use a dedicated table instead.

CREATE TABLE IF NOT EXISTS public.erp_stock_movements (
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

ALTER TABLE public.erp_stock_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon manage erp stock movements" ON public.erp_stock_movements;
CREATE POLICY "Allow anon manage erp stock movements"
ON public.erp_stock_movements FOR ALL USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.erp_stock_movements TO anon, authenticated;

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

    INSERT INTO erp_stock_movements (
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

GRANT EXECUTE ON FUNCTION public.apply_manager_investment_stock(UUID) TO anon, authenticated;

-- Backfill global depot stock for past manager purchases (POS stock was updated but depot was not).
UPDATE public.erp_products p
SET global_qty = GREATEST(0, p.global_qty - sub.total_out),
    updated_at = NOW()
FROM (
  SELECT mii.erp_product_id, SUM(mii.quantity) AS total_out
  FROM public.manager_investment_items mii
  JOIN public.manager_investments mi ON mi.id = mii.investment_id
  WHERE COALESCE(mi.stock_applied, false) = false
  GROUP BY mii.erp_product_id
) sub
WHERE p.id = sub.erp_product_id
  AND sub.total_out > 0;

UPDATE public.manager_investments
SET stock_applied = true
WHERE stock_applied = false
  AND EXISTS (
    SELECT 1
    FROM public.manager_investment_items mii
    WHERE mii.investment_id = manager_investments.id
  );
