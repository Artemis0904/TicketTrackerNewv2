-- Update existing MRC requests with 'mcr-needed' status to 'mrc-needed'
UPDATE material_requests 
SET status = 'mrc-needed' 
WHERE status = 'mcr-needed' AND request_type = 'MRC';
