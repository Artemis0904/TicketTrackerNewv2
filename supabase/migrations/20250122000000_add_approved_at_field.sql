-- Add approved_at field to material_requests table
ALTER TABLE public.material_requests 
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

-- Add courier_name field to material_requests table
ALTER TABLE public.material_requests 
ADD COLUMN IF NOT EXISTS courier_name TEXT;

-- Add received_at field to material_requests table for MRC received dates
ALTER TABLE public.material_requests 
ADD COLUMN IF NOT EXISTS received_at TIMESTAMP WITH TIME ZONE;

-- Add index for better performance on approved_at queries
CREATE INDEX idx_material_requests_approved_at ON public.material_requests(approved_at);

-- Add comment to document the field
COMMENT ON COLUMN public.material_requests.approved_at IS 'Timestamp when the request was approved by regional manager';

