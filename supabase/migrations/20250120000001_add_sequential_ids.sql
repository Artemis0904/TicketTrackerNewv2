-- Add sequential ID support while preserving existing UUID data
-- This approach keeps existing data unchanged and only affects new requests

-- Create a sequence for new sequential IDs
CREATE SEQUENCE IF NOT EXISTS public.material_requests_seq START 1;

-- Add a new column for sequential ID (nullable to preserve existing data)
ALTER TABLE public.material_requests 
ADD COLUMN IF NOT EXISTS seq_id INTEGER;

-- Update existing records to have sequential IDs based on creation order
UPDATE public.material_requests 
SET seq_id = nextval('public.material_requests_seq')
WHERE seq_id IS NULL
ORDER BY created_at;

-- Set the sequence to continue from the max value
SELECT setval('public.material_requests_seq', COALESCE((SELECT MAX(seq_id) FROM public.material_requests), 0) + 1);

-- Create a trigger to automatically assign sequential IDs for new records
CREATE OR REPLACE FUNCTION public.assign_sequential_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.seq_id IS NULL THEN
    NEW.seq_id := nextval('public.material_requests_seq');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new records
DROP TRIGGER IF EXISTS trigger_assign_sequential_id ON public.material_requests;
CREATE TRIGGER trigger_assign_sequential_id
  BEFORE INSERT ON public.material_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_sequential_id();

-- Create index on seq_id for better performance
CREATE INDEX IF NOT EXISTS idx_material_requests_seq_id ON public.material_requests(seq_id);
