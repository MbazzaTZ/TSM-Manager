-- Create DSR role support: tag in profiles, RLS policies, sales commission function, and DSR report view

-- 1) Ensure a profiles table has role; if not, add a role column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN role text CHECK (role IN ('admin','tl','dsr')) DEFAULT 'dsr';
  END IF;
END $$;

-- 2) Inventory assignments: allow DSR to read items assigned to them; TL/Admin broader
-- Assumes inventory table has assigned_to_dsr text UUID referencing profiles(id)
-- Create policy if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='inventory' AND policyname='inventory_select_by_role'
  ) THEN
    CREATE POLICY inventory_select_by_role ON public.inventory
      FOR SELECT
      USING (
        -- Admin: full access
        EXISTS (
          SELECT 1 FROM public.profiles p 
          WHERE p.id = auth.uid() AND p.role = 'admin'
        )
        OR
        -- TL: read items assigned to their team leader id
        EXISTS (
          SELECT 1 FROM public.profiles p 
          WHERE p.id = auth.uid() AND p.role = 'tl' AND inventory.assigned_to_tl = p.id
        )
        OR
        -- DSR: read items assigned to them
        EXISTS (
          SELECT 1 FROM public.profiles p 
          WHERE p.id = auth.uid() AND p.role = 'dsr' AND inventory.assigned_to_dsr = p.id
        )
      );
  END IF;
END $$;

-- 3) Sales table: DSR can insert their own sales for items assigned to them; everyone reads per role
-- Assumes sales(inventory_id, sold_at, price, created_by) and inventory.id exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='sales' AND policyname='sales_select_by_role'
  ) THEN
    CREATE POLICY sales_select_by_role ON public.sales
      FOR SELECT
      USING (
        EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
        OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'tl')
        OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'dsr' AND sales.created_by = p.id)
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='sales' AND policyname='sales_insert_by_dsr'
  ) THEN
    CREATE POLICY sales_insert_by_dsr ON public.sales
      FOR INSERT
      WITH CHECK (
        -- created_by must be current user
        sales.created_by = auth.uid()
        AND EXISTS (
          SELECT 1 FROM public.inventory i 
          WHERE i.id = sales.inventory_id AND i.assigned_to_dsr = auth.uid()
        )
      );
  END IF;
END $$;

-- 4) Commission function: compute commission per sale based on simple rate or tier
-- Create a function if not exists
CREATE OR REPLACE FUNCTION public.compute_commission(price numeric, rate numeric DEFAULT 0.05)
RETURNS numeric AS $$
BEGIN
  RETURN ROUND(price * rate, 2);
END; $$ LANGUAGE plpgsql IMMUTABLE;

-- 5) DSR report view: expose per-user aggregated sales and commission
CREATE OR REPLACE VIEW public.v_dsr_sales_report AS
SELECT 
  s.created_by AS dsr_id,
  COUNT(*) AS sales_count,
  COALESCE(SUM(s.price), 0) AS total_sales,
  COALESCE(SUM(public.compute_commission(s.price)), 0) AS total_commission,
  MIN(s.sold_at) AS first_sale_at,
  MAX(s.sold_at) AS last_sale_at
FROM public.sales s
GROUP BY s.created_by;

-- 6) RLS on the view via underlying table policies suffices; optional explicit policy for select on view
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='v_dsr_sales_report' AND policyname='v_dsr_select'
  ) THEN
    CREATE POLICY v_dsr_select ON public.v_dsr_sales_report
      FOR SELECT
      USING (
        EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','tl'))
        OR dsr_id = auth.uid()
      );
  END IF;
END $$;
