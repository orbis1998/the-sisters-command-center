-- Sync manager accounts onto user_roles
ALTER TABLE public.user_roles
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS badge_code TEXT,
  ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations(id);

CREATE UNIQUE INDEX IF NOT EXISTS user_roles_badge_code_key
  ON public.user_roles (badge_code);

-- Allow badge-based lookup for manager sessions while keeping authenticated access for CEO sessions
DROP POLICY IF EXISTS "Allow anon read managers" ON public.user_roles;
CREATE POLICY "Allow anon read managers" ON public.user_roles
FOR SELECT
USING (role = 'manager' OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow admin manage user_roles" ON public.user_roles;
CREATE POLICY "Allow admin manage user_roles" ON public.user_roles
FOR ALL
USING (auth.role() = 'authenticated');

-- Re-point operational tables to user_roles for auditability
ALTER TABLE public.manager_reports
  DROP CONSTRAINT IF EXISTS manager_reports_manager_id_fkey;
ALTER TABLE public.manager_reports
  ADD CONSTRAINT manager_reports_manager_id_fkey
  FOREIGN KEY (manager_id) REFERENCES public.user_roles(id) ON DELETE CASCADE;

ALTER TABLE public.global_expenses
  DROP CONSTRAINT IF EXISTS global_expenses_recorded_by_fkey;
ALTER TABLE public.global_expenses
  ADD CONSTRAINT global_expenses_recorded_by_fkey
  FOREIGN KEY (recorded_by) REFERENCES public.user_roles(id) ON DELETE SET NULL;

ALTER TABLE public.restocks
  DROP CONSTRAINT IF EXISTS restocks_created_by_fkey;
ALTER TABLE public.restocks
  ADD CONSTRAINT restocks_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.user_roles(id) ON DELETE SET NULL;

ALTER TABLE public.stock_adjustments
  DROP CONSTRAINT IF EXISTS stock_adjustments_adjusted_by_fkey;
ALTER TABLE public.stock_adjustments
  ADD CONSTRAINT stock_adjustments_adjusted_by_fkey
  FOREIGN KEY (adjusted_by) REFERENCES public.user_roles(id) ON DELETE SET NULL;
