-- Drop the existing organization_rules table and recreate it simplified
DROP TABLE IF EXISTS public.organization_rules CASCADE;

-- Create a simple organization_rules table
CREATE TABLE public.organization_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_name TEXT NOT NULL DEFAULT 'YOUR ORGANIZATION NAME HERE',
  rules_content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.organization_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own organization rules"
  ON public.organization_rules FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own organization rules"
  ON public.organization_rules FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own organization rules"
  ON public.organization_rules FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own organization rules"
  ON public.organization_rules FOR DELETE
  USING (auth.uid() = user_id);

-- Admin policies
CREATE POLICY "organization_rules_admin_select_all"
  ON public.organization_rules FOR SELECT
  USING (is_current_user_admin());

CREATE POLICY "organization_rules_update_policy"
  ON public.organization_rules FOR UPDATE
  USING (auth.uid() = user_id OR is_current_user_admin());

CREATE POLICY "organization_rules_delete_policy"
  ON public.organization_rules FOR DELETE
  USING (auth.uid() = user_id OR is_current_user_admin());

CREATE POLICY "organization_rules_insert_policy"
  ON public.organization_rules FOR INSERT
  WITH CHECK (auth.uid() = user_id);