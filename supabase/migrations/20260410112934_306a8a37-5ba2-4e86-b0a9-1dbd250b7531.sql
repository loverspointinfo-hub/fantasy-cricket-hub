
-- Add cricket API match ID column to matches table
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS cricket_api_match_id text;

-- Create point_events table for ball-by-ball ticker
CREATE TABLE public.point_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  player_name text NOT NULL,
  player_team text,
  event_type text NOT NULL DEFAULT 'points',
  description text NOT NULL,
  points_change numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.point_events ENABLE ROW LEVEL SECURITY;

-- Anyone can view point events (public match data)
CREATE POLICY "Anyone can view point events" ON public.point_events
  FOR SELECT TO public USING (true);

-- Admins can manage point events
CREATE POLICY "Admins can manage point events" ON public.point_events
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Index for fast lookup
CREATE INDEX idx_point_events_match_id ON public.point_events(match_id, created_at DESC);

-- Enable realtime for point_events
ALTER PUBLICATION supabase_realtime ADD TABLE public.point_events;
