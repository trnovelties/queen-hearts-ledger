-- Add rule_type column to organization_rules table
ALTER TABLE public.organization_rules 
ADD COLUMN IF NOT EXISTS rule_type TEXT DEFAULT 'custom';

-- Add a check constraint to ensure valid rule types
ALTER TABLE public.organization_rules 
ADD CONSTRAINT rule_type_check CHECK (rule_type IN ('professional', 'custom'));

-- Update existing records to have 'custom' rule type
UPDATE public.organization_rules 
SET rule_type = 'custom' 
WHERE rule_type IS NULL;