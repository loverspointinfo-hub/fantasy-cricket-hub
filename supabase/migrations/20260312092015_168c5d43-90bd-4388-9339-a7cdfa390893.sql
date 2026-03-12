
CREATE OR REPLACE FUNCTION public.auto_transition_matches()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  updated_count integer;
BEGIN
  UPDATE public.matches
  SET status = 'live'
  WHERE status = 'upcoming'
    AND entry_deadline <= now();
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;
