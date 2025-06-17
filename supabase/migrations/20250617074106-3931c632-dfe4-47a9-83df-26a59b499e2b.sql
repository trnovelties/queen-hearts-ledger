
-- Add card_payouts column to games table to snapshot payouts per game
ALTER TABLE public.games 
ADD COLUMN card_payouts jsonb;

-- Update existing games to have the current card payouts configuration
UPDATE public.games 
SET card_payouts = (
  SELECT card_payouts 
  FROM public.configurations 
  LIMIT 1
)
WHERE card_payouts IS NULL;

-- Add configuration_version to track changes
ALTER TABLE public.games 
ADD COLUMN configuration_version integer DEFAULT 1;

-- Add version tracking to configurations table
ALTER TABLE public.configurations 
ADD COLUMN version integer DEFAULT 1;

-- Create a trigger to increment version when configurations change
CREATE OR REPLACE FUNCTION increment_configuration_version()
RETURNS TRIGGER AS $$
BEGIN
  NEW.version = COALESCE(OLD.version, 0) + 1;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER configuration_version_trigger
  BEFORE UPDATE ON public.configurations
  FOR EACH ROW
  EXECUTE FUNCTION increment_configuration_version();
