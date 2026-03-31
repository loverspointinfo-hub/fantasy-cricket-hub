
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
BEGIN
  -- Get match label for notifications
  SELECT team1_short || ' vs ' || team2_short INTO v_match_label
  FROM public.matches WHERE id = p_match_id;

  FOR contest_rec IN
    SELECT id, name, prize_pool, prize_breakdown, max_entries, current_entries
    FROM public.contests
    WHERE match_id = p_match_id
      AND COALESCE(current_entries, 0) > 0
  LOOP
    SELECT EXISTS (
      SELECT 1 FROM public.contest_entries
      WHERE contest_id = contest_rec.id AND winnings > 0
    ) INTO v_already_distributed;

    IF v_already_distributed THEN
      CONTINUE;
    END IF;

    v_breakdown := COALESCE(contest_rec.prize_breakdown, '[]'::jsonb);
    v_contest_name := contest_rec.name;
    v_rank := 0;

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
        (SELECT (elem->>'prize')::numeric
         FROM jsonb_array_elements(v_breakdown) AS elem
         WHERE (elem->>'rank')::int = v_rank),
        (SELECT (elem->>'prize')::numeric
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

        -- Send notification to winner
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
