
-- Enable RLS on all tables if not already enabled
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Create policies for games table
DROP POLICY IF EXISTS "Users can view games" ON public.games;
DROP POLICY IF EXISTS "Users can create games" ON public.games;
DROP POLICY IF EXISTS "Users can update games" ON public.games;
DROP POLICY IF EXISTS "Users can delete games" ON public.games;

CREATE POLICY "Users can view games" ON public.games
  FOR SELECT USING (true);

CREATE POLICY "Users can create games" ON public.games
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update games" ON public.games
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete games" ON public.games
  FOR DELETE USING (true);

-- Create policies for weeks table
DROP POLICY IF EXISTS "Users can view weeks" ON public.weeks;
DROP POLICY IF EXISTS "Users can create weeks" ON public.weeks;
DROP POLICY IF EXISTS "Users can update weeks" ON public.weeks;
DROP POLICY IF EXISTS "Users can delete weeks" ON public.weeks;

CREATE POLICY "Users can view weeks" ON public.weeks
  FOR SELECT USING (true);

CREATE POLICY "Users can create weeks" ON public.weeks
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update weeks" ON public.weeks
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete weeks" ON public.weeks
  FOR DELETE USING (true);

-- Create policies for ticket_sales table
DROP POLICY IF EXISTS "Users can view ticket_sales" ON public.ticket_sales;
DROP POLICY IF EXISTS "Users can create ticket_sales" ON public.ticket_sales;
DROP POLICY IF EXISTS "Users can update ticket_sales" ON public.ticket_sales;
DROP POLICY IF EXISTS "Users can delete ticket_sales" ON public.ticket_sales;

CREATE POLICY "Users can view ticket_sales" ON public.ticket_sales
  FOR SELECT USING (true);

CREATE POLICY "Users can create ticket_sales" ON public.ticket_sales
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update ticket_sales" ON public.ticket_sales
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete ticket_sales" ON public.ticket_sales
  FOR DELETE USING (true);

-- Create policies for expenses table
DROP POLICY IF EXISTS "Users can view expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can create expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can update expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can delete expenses" ON public.expenses;

CREATE POLICY "Users can view expenses" ON public.expenses
  FOR SELECT USING (true);

CREATE POLICY "Users can create expenses" ON public.expenses
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update expenses" ON public.expenses
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete expenses" ON public.expenses
  FOR DELETE USING (true);
