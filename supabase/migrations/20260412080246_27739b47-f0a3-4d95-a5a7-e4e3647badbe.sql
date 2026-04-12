
CREATE TABLE public.api_health_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id uuid NOT NULL,
  provider text NOT NULL,
  status text NOT NULL DEFAULT 'success',
  response_time_ms integer DEFAULT 0,
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.api_health_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage api health log"
ON public.api_health_log
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can insert api health log"
ON public.api_health_log
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE INDEX idx_api_health_match ON public.api_health_log(match_id);
CREATE INDEX idx_api_health_created ON public.api_health_log(created_at DESC);
