-- Change material_requests table ID from UUID to SERIAL
-- This migration will convert existing UUID IDs to sequential integers

-- First, create a new table with SERIAL ID
CREATE TABLE public.material_requests_new (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  request_type TEXT NOT NULL DEFAULT 'MR',
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  requested_by TEXT NOT NULL,
  requester_email TEXT,
  requester_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending',
  ticket_number TEXT,
  zone TEXT,
  description TEXT,
  transport_mode TEXT,
  edt TIMESTAMP WITH TIME ZONE,
  tracking_no TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  mrc_number TEXT,
  received_at TIMESTAMP WITH TIME ZONE
);

-- Copy data from old table to new table
INSERT INTO public.material_requests_new (
  title, request_type, items, requested_by, requester_email, requester_id,
  created_at, updated_at, status, ticket_number, zone, description,
  transport_mode, edt, tracking_no, sent_at, mrc_number, received_at
)
SELECT 
  title, request_type, items, requested_by, requester_email, requester_id,
  created_at, updated_at, status, ticket_number, zone, description,
  transport_mode, edt, tracking_no, sent_at, mrc_number, received_at
FROM public.material_requests
ORDER BY created_at;

-- Drop the old table
DROP TABLE public.material_requests;

-- Rename new table to original name
ALTER TABLE public.material_requests_new RENAME TO material_requests;

-- Re-enable RLS
ALTER TABLE public.material_requests ENABLE ROW LEVEL SECURITY;

-- Recreate policies
CREATE POLICY "Anyone authenticated can view material requests" 
ON public.material_requests 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create their own requests" 
ON public.material_requests 
FOR INSERT 
WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update their own requests" 
ON public.material_requests 
FOR UPDATE 
USING (auth.uid() = requester_id);

CREATE POLICY "Regional managers can update any request" 
ON public.material_requests 
FOR UPDATE 
USING (is_regional_manager(auth.uid()));

CREATE POLICY "Regional managers can delete any request" 
ON public.material_requests 
FOR DELETE 
USING (is_regional_manager(auth.uid()));

-- Recreate trigger for automatic timestamp updates
CREATE TRIGGER update_material_requests_updated_at
BEFORE UPDATE ON public.material_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Recreate indexes
CREATE INDEX idx_material_requests_requester_id ON public.material_requests(requester_id);
CREATE INDEX idx_material_requests_status ON public.material_requests(status);
CREATE INDEX idx_material_requests_request_type ON public.material_requests(request_type);
