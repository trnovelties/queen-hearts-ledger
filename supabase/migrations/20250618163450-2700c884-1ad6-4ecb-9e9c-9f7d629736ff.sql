
-- Make startup_costs column nullable in organization_rules table
ALTER TABLE public.organization_rules 
ALTER COLUMN startup_costs DROP NOT NULL;

-- Set a default value for existing records that might not have startup_costs
UPDATE public.organization_rules 
SET startup_costs = '' 
WHERE startup_costs IS NULL;
