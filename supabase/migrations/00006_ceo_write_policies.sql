DROP POLICY IF EXISTS "Allow authenticated read" ON public.products;
CREATE POLICY "Allow authenticated manage products"
ON public.products
FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated read" ON public.restocks;
CREATE POLICY "Allow authenticated manage restocks"
ON public.restocks
FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated read" ON public.stock_adjustments;
CREATE POLICY "Allow authenticated manage stock adjustments"
ON public.stock_adjustments
FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');
