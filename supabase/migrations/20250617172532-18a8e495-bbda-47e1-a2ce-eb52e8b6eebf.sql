
-- Create organization_rules table
CREATE TABLE public.organization_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_name text NOT NULL DEFAULT 'YOUR ORGANIZATION NAME HERE',
  rules_content text NOT NULL,
  startup_costs text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.organization_rules ENABLE ROW LEVEL SECURITY;

-- Create policies for organization_rules
CREATE POLICY "Users can view organization rules" 
  ON public.organization_rules 
  FOR SELECT 
  USING (true);

CREATE POLICY "Users can create organization rules" 
  ON public.organization_rules 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Users can update organization rules" 
  ON public.organization_rules 
  FOR UPDATE 
  USING (true);
