DROP POLICY IF EXISTS "Allow authenticated read" ON public.inventory_stock;

CREATE POLICY "Allow anon read inventory stock"
ON public.inventory_stock
FOR SELECT
USING (true);

CREATE POLICY "Allow anon write inventory stock"
ON public.inventory_stock
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow anon update inventory stock"
ON public.inventory_stock
FOR UPDATE
USING (true)
WITH CHECK (true);
