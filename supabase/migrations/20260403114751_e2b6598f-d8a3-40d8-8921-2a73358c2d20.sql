
CREATE TABLE public.scoring_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_key text NOT NULL UNIQUE,
  label text NOT NULL,
  category text NOT NULL DEFAULT 'other',
  value numeric NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.scoring_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage scoring rules" ON public.scoring_rules
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view scoring rules" ON public.scoring_rules
  FOR SELECT TO public USING (true);

-- Seed default Dream11-style scoring rules
INSERT INTO public.scoring_rules (rule_key, label, category, value, sort_order) VALUES
  ('run', 'Per Run', 'Batting', 1, 1),
  ('boundary_bonus', 'Per Boundary (4s)', 'Batting', 1, 2),
  ('six_bonus', 'Per Six', 'Batting', 2, 3),
  ('half_century', 'Half Century (50)', 'Batting', 8, 4),
  ('century', 'Century (100)', 'Batting', 16, 5),
  ('duck', 'Duck (BAT/WK/AR)', 'Batting', -2, 6),
  ('wicket', 'Per Wicket', 'Bowling', 25, 7),
  ('lbw_bowled_bonus', 'LBW/Bowled Bonus', 'Bowling', 8, 8),
  ('three_wicket_haul', '3 Wicket Haul', 'Bowling', 4, 9),
  ('four_wicket_haul', '4 Wicket Haul', 'Bowling', 8, 10),
  ('five_wicket_haul', '5 Wicket Haul', 'Bowling', 16, 11),
  ('maiden_over', 'Maiden Over', 'Bowling', 12, 12),
  ('catch_points', 'Catch', 'Fielding', 8, 13),
  ('stumping', 'Stumping', 'Fielding', 12, 14),
  ('run_out_direct', 'Run Out (Direct)', 'Fielding', 12, 15),
  ('run_out_indirect', 'Run Out (Indirect)', 'Fielding', 6, 16),
  ('economy_below_5', 'Economy Below 5', 'Economy Rate', 6, 17),
  ('economy_5_to_6', 'Economy 5-6', 'Economy Rate', 4, 18),
  ('economy_6_to_7', 'Economy 6-7', 'Economy Rate', 2, 19),
  ('economy_10_to_11', 'Economy 10-11', 'Economy Rate', -2, 20),
  ('economy_11_to_12', 'Economy 11-12', 'Economy Rate', -4, 21),
  ('economy_above_12', 'Economy Above 12', 'Economy Rate', -6, 22),
  ('sr_above_170', 'SR Above 170', 'Strike Rate', 6, 23),
  ('sr_150_to_170', 'SR 150-170', 'Strike Rate', 4, 24),
  ('sr_130_to_150', 'SR 130-150', 'Strike Rate', 2, 25),
  ('sr_60_to_70', 'SR 60-70', 'Strike Rate', -2, 26),
  ('sr_50_to_60', 'SR 50-60', 'Strike Rate', -4, 27),
  ('sr_below_50', 'SR Below 50', 'Strike Rate', -6, 28),
  ('playing', 'Playing XI', 'Other', 4, 29);
