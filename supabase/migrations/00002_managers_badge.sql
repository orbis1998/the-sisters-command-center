-- 1. Create managers table for Badge Authentication
CREATE TABLE IF NOT EXISTS public.managers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    badge_code TEXT UNIQUE NOT NULL,
    location_id UUID REFERENCES public.locations(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Update manager_reports to reference managers instead of auth.users
ALTER TABLE public.manager_reports DROP CONSTRAINT IF EXISTS manager_reports_manager_id_fkey;
ALTER TABLE public.manager_reports ADD CONSTRAINT manager_reports_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES public.managers(id) ON DELETE CASCADE;

-- 3. RLS Policies for Managers (Anon access using badge code)
ALTER TABLE public.managers ENABLE ROW LEVEL SECURITY;

-- Allow anon to read managers (to verify badge login)
CREATE POLICY "Allow anon read managers" ON public.managers FOR SELECT USING (true);
-- Allow authenticated (CEO) to manage managers
CREATE POLICY "Allow admin manage managers" ON public.managers FOR ALL USING (auth.role() = 'authenticated');

-- Allow anon to read products and locations
DROP POLICY IF EXISTS "Allow authenticated read" ON public.locations;
CREATE POLICY "Allow anon read locations" ON public.locations FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated read" ON public.products;
CREATE POLICY "Allow anon read products" ON public.products FOR SELECT USING (true);

-- Allow anon to insert and read reports
DROP POLICY IF EXISTS "Allow authenticated read" ON public.manager_reports;
CREATE POLICY "Allow anon insert reports" ON public.manager_reports FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon read reports" ON public.manager_reports FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated read" ON public.manager_report_inventory;
CREATE POLICY "Allow anon insert report inventory" ON public.manager_report_inventory FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon read report inventory" ON public.manager_report_inventory FOR SELECT USING (true);

-- Allow anon to insert expenses
DROP POLICY IF EXISTS "Allow authenticated read" ON public.global_expenses;
CREATE POLICY "Allow anon insert expenses" ON public.global_expenses FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon read expenses" ON public.global_expenses FOR SELECT USING (true);
