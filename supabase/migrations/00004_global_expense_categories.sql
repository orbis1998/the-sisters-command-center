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
    'unexpected'
  ));
