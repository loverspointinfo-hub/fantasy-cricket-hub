
-- Create scheduled_notifications table for timed reminders
CREATE TABLE public.scheduled_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'general',
  target_segment TEXT NOT NULL DEFAULT 'all',
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_sent BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.scheduled_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage scheduled notifications"
  ON public.scheduled_notifications FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Function to recalculate player ownership percentage for a match
CREATE OR REPLACE FUNCTION public.recalculate_player_ownership(p_match_id UUID)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  total_teams integer;
  updated_count integer := 0;
  mp_rec record;
  player_count integer;
BEGIN
  SELECT COUNT(*) INTO total_teams FROM public.user_teams WHERE match_id = p_match_id;
  IF total_teams = 0 THEN RETURN 0; END IF;

  FOR mp_rec IN SELECT id, player_id FROM public.match_players WHERE match_id = p_match_id
  LOOP
    SELECT COUNT(*) INTO player_count
    FROM public.team_players tp
    JOIN public.user_teams ut ON ut.id = tp.team_id
    WHERE tp.player_id = mp_rec.player_id AND ut.match_id = p_match_id;

    UPDATE public.match_players
    SET selected_by_percent = ROUND((player_count::numeric / total_teams::numeric) * 100, 1)
    WHERE id = mp_rec.id;

    updated_count := updated_count + 1;
  END LOOP;

  RETURN updated_count;
END;
$$;

-- Update distribute_contest_winnings to auto-adjust prize pool if < 50% spots filled
CREATE OR REPLACE FUNCTION public.distribute_contest_winnings(p_match_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  contest_rec record;
  entry_rec record;
  v_rank integer;
  v_prize numeric;
  v_breakdown jsonb;
  v_total_distributed integer := 0;
  v_already_distributed boolean;
  v_contest_name text;
  v_match_label text;
  v_fill_ratio numeric;
  v_adjusted_pool numeric;
  v_scale_factor numeric;
BEGIN
  SELECT team1_short || ' vs ' || team2_short INTO v_match_label
  FROM public.matches WHERE id = p_match_id;

  FOR contest_rec IN
    SELECT id, name, prize_pool, prize_breakdown, max_entries, current_entries, entry_fee, is_guaranteed
    FROM public.contests
    WHERE match_id = p_match_id
      AND COALESCE(current_entries, 0) > 0
  LOOP
    SELECT EXISTS (
      SELECT 1 FROM public.contest_entries
      WHERE contest_id = contest_rec.id AND winnings > 0
    ) INTO v_already_distributed;

    IF v_already_distributed THEN CONTINUE; END IF;

    v_breakdown := COALESCE(contest_rec.prize_breakdown, '[]'::jsonb);
    v_contest_name := contest_rec.name;
    v_rank := 0;

    -- Auto-adjust prize pool if < 50% filled and NOT guaranteed
    v_fill_ratio := CASE WHEN contest_rec.max_entries > 0
      THEN COALESCE(contest_rec.current_entries, 0)::numeric / contest_rec.max_entries::numeric
      ELSE 1 END;

    IF v_fill_ratio < 0.5 AND NOT COALESCE(contest_rec.is_guaranteed, false) THEN
      -- Scale prize pool proportionally to fill ratio
      v_adjusted_pool := ROUND(COALESCE(contest_rec.prize_pool, 0) * (COALESCE(contest_rec.current_entries, 0)::numeric * COALESCE(contest_rec.entry_fee, 0)::numeric) / GREATEST(COALESCE(contest_rec.prize_pool, 0), 1), 2);
      v_adjusted_pool := LEAST(v_adjusted_pool, COALESCE(contest_rec.prize_pool, 0));
      v_scale_factor := CASE WHEN COALESCE(contest_rec.prize_pool, 0) > 0 THEN v_adjusted_pool / contest_rec.prize_pool ELSE 1 END;
    ELSE
      v_adjusted_pool := COALESCE(contest_rec.prize_pool, 0);
      v_scale_factor := 1;
    END IF;

    FOR entry_rec IN
      SELECT ce.id AS entry_id, ce.user_id, ce.team_id,
             COALESCE(ut.total_points, 0) AS pts
      FROM public.contest_entries ce
      JOIN public.user_teams ut ON ut.id = ce.team_id
      WHERE ce.contest_id = contest_rec.id
      ORDER BY COALESCE(ut.total_points, 0) DESC, ce.created_at ASC
    LOOP
      v_rank := v_rank + 1;
      v_prize := 0;

      SELECT COALESCE(
        (SELECT ROUND((elem->>'prize')::numeric * v_scale_factor, 2)
         FROM jsonb_array_elements(v_breakdown) AS elem
         WHERE (elem->>'rank')::int = v_rank),
        (SELECT ROUND((elem->>'prize')::numeric * v_scale_factor, 2)
         FROM jsonb_array_elements(v_breakdown) AS elem
         WHERE (elem->>'rank_from') IS NOT NULL
           AND v_rank >= (elem->>'rank_from')::int
           AND v_rank <= (elem->>'rank_to')::int),
        0
      ) INTO v_prize;

      UPDATE public.contest_entries
      SET rank = v_rank, winnings = v_prize
      WHERE id = entry_rec.entry_id;

      IF v_prize > 0 THEN
        UPDATE public.wallets
        SET winning_balance = COALESCE(winning_balance, 0) + v_prize,
            updated_at = now()
        WHERE user_id = entry_rec.user_id;

        INSERT INTO public.transactions (user_id, type, amount, description, status, reference_id)
        VALUES (
          entry_rec.user_id,
          'contest_winning',
          v_prize,
          'Contest winnings - Rank #' || v_rank,
          'completed',
          contest_rec.id::text
        );

        INSERT INTO public.notifications (user_id, type, title, message, metadata)
        VALUES (
          entry_rec.user_id,
          'contest',
          '🏆 You won ₹' || v_prize || '!',
          'Congratulations! You finished #' || v_rank || ' in "' || v_contest_name || '" (' || COALESCE(v_match_label, '') || '). ₹' || v_prize || ' has been credited to your winnings wallet.',
          jsonb_build_object('contest_id', contest_rec.id, 'rank', v_rank, 'prize', v_prize, 'match_id', p_match_id)
        );

        v_total_distributed := v_total_distributed + 1;
      END IF;
    END LOOP;
  END LOOP;

  UPDATE public.matches SET status = 'completed' WHERE id = p_match_id;

  RETURN v_total_distributed;
END;
$$;
