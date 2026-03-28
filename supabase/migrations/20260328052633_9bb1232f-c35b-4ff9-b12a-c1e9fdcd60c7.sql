
-- Add team logo columns to matches
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS team1_logo text DEFAULT NULL;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS team2_logo text DEFAULT NULL;

-- Create team-logos storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('team-logos', 'team-logos', true) ON CONFLICT (id) DO NOTHING;

-- Allow admins to manage team logos
CREATE POLICY "Admins can manage team logos" ON storage.objects FOR ALL TO authenticated USING (bucket_id = 'team-logos' AND public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (bucket_id = 'team-logos' AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- Allow public read access to team logos
CREATE POLICY "Anyone can view team logos" ON storage.objects FOR SELECT TO public USING (bucket_id = 'team-logos');
