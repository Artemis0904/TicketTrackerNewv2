-- Add policy for Store Managers to update material requests
-- This allows Store Managers to update MRC requests to add MRC numbers

-- Helper to check if user is Store Manager
CREATE OR REPLACE FUNCTION public.is_store_manager(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND department = 'store_manager'
  );
$$;

-- Add policy for Store Managers to update material requests
CREATE POLICY "Store managers can update material requests" 
ON public.material_requests 
FOR UPDATE 
USING (public.is_store_manager(auth.uid()));
