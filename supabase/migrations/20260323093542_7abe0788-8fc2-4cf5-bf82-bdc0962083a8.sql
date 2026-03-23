
CREATE TABLE public.scoring_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  value numeric NOT NULL,
  roles text[] NOT NULL DEFAULT '{}',
  color text NOT NULL DEFAULT 'bg-secondary/60 hover:bg-secondary',
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.scoring_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage scoring presets"
  ON public.scoring_presets FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view scoring presets"
  ON public.scoring_presets FOR SELECT
  TO authenticated
  USING (true);

-- Seed default presets
INSERT INTO public.scoring_presets (label, value, roles, color, sort_order) VALUES
  ('Run', 1, '{BAT,BOWL,AR,WK}', 'bg-secondary/60 hover:bg-secondary', 1),
  ('4s', 4, '{BAT,BOWL,AR,WK}', 'bg-blue-500/15 hover:bg-blue-500/30 text-blue-400', 2),
  ('6s', 6, '{BAT,BOWL,AR,WK}', 'bg-purple-500/15 hover:bg-purple-500/30 text-purple-400', 3),
  ('Wicket', 25, '{BOWL,AR}', 'bg-red-500/15 hover:bg-red-500/30 text-red-400', 4),
  ('Catch', 8, '{BAT,BOWL,AR,WK}', 'bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-400', 5),
  ('Maiden', 12, '{BOWL,AR}', 'bg-amber-500/15 hover:bg-amber-500/30 text-amber-400', 6),
  ('50 Runs', 50, '{BAT,AR,WK}', 'bg-yellow-500/15 hover:bg-yellow-500/30 text-yellow-400', 7),
  ('100 Runs', 100, '{BAT,AR,WK}', 'bg-green-500/15 hover:bg-green-500/30 text-green-400', 8),
  ('Stumping', 12, '{WK}', 'bg-amber-500/15 hover:bg-amber-500/30 text-amber-400', 9),
  ('Run Out', 10, '{BAT,BOWL,AR,WK}', 'bg-orange-500/15 hover:bg-orange-500/30 text-orange-400', 10),
  ('Duck', -5, '{BAT,AR,WK}', 'bg-red-500/15 hover:bg-red-500/30 text-red-400', 11);
