-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ROLES & PERMISSIONS
-- Links auth.users to their role in the ERP (CEO, Manager)
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('ceo', 'manager')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- 2. LOCATIONS / POINTS OF SALE
CREATE TABLE IF NOT EXISTS public.locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    country TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. INVENTORY (Pricing Calculator & Inventory Tracker)
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    category TEXT,
    unit_purchase_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    selling_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    -- Margin is calculated: selling_price - unit_purchase_price
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stock per location
CREATE TABLE IF NOT EXISTS public.inventory_stock (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, location_id)
);

-- 4. RESTOCKS (Approvisionnements)
CREATE TABLE IF NOT EXISTS public.restocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES public.products(id),
    location_id UUID NOT NULL REFERENCES public.locations(id),
    quantity INTEGER NOT NULL,
    unit_cost DECIMAL(10,2) NOT NULL,
    total_cost DECIMAL(10,2) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. MANAGER WEEKLY REPORTS (Ultimate Bookkeeping)
CREATE TABLE IF NOT EXISTS public.manager_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    manager_id UUID NOT NULL REFERENCES auth.users(id),
    location_id UUID NOT NULL REFERENCES public.locations(id),
    week_start_date DATE NOT NULL,
    week_end_date DATE NOT NULL,
    products_sold INTEGER NOT NULL DEFAULT 0,
    investment DECIMAL(10,2) NOT NULL DEFAULT 0,
    expenses DECIMAL(10,2) NOT NULL DEFAULT 0,
    salary DECIMAL(10,2) NOT NULL DEFAULT 0,
    rent DECIMAL(10,2) NOT NULL DEFAULT 0,
    observations TEXT,
    status TEXT DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted', 'approved')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Report details (Remaining stock per product for the week)
CREATE TABLE IF NOT EXISTS public.manager_report_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID NOT NULL REFERENCES public.manager_reports(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id),
    remaining_stock INTEGER NOT NULL,
    sold_quantity INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. GLOBAL EXPENSES (Dépenses hors site)
CREATE TABLE IF NOT EXISTS public.global_expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    category TEXT NOT NULL CHECK (category IN ('rent', 'salary', 'marketing', 'logistics', 'other')),
    amount DECIMAL(10,2) NOT NULL,
    location_id UUID REFERENCES public.locations(id), -- Optional, can be global
    description TEXT,
    recorded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. STOCK ADJUSTMENT HISTORY
CREATE TABLE IF NOT EXISTS public.stock_adjustments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES public.products(id),
    location_id UUID NOT NULL REFERENCES public.locations(id),
    previous_quantity INTEGER NOT NULL,
    new_quantity INTEGER NOT NULL,
    change INTEGER NOT NULL,
    reason TEXT NOT NULL CHECK (reason IN ('restock', 'sale', 'loss', 'correction', 'transfer')),
    date TIMESTAMPTZ DEFAULT NOW(),
    adjusted_by UUID REFERENCES auth.users(id)
);

-- RLS Policies
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manager_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manager_report_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_adjustments ENABLE ROW LEVEL SECURITY;

-- Basic policies (to refine based on exact needs, currently allowing authenticated users)
CREATE POLICY "Allow authenticated read" ON public.user_roles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated read" ON public.locations FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated read" ON public.products FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated read" ON public.inventory_stock FOR SELECT USING (auth.role() = 'authenticated');
-- (In a real scenario, we would restrict writes to CEO only for products/locations, and managers for their reports)
