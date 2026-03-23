
CREATE OR REPLACE FUNCTION public.recalculate_team_points(p_match_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  updated_count integer := 0;
  team_rec record;
  v_total numeric;
BEGIN
  -- For each user_team in this match, recalculate total_points
  FOR team_rec IN
    SELECT ut.id, ut.captain_id, ut.vice_captain_id
    FROM public.user_teams ut
    WHERE ut.match_id = p_match_id
  LOOP
    SELECT COALESCE(SUM(
      CASE
        WHEN tp.player_id = team_rec.captain_id THEN COALESCE(mp.fantasy_points, 0) * 2
        WHEN tp.player_id = team_rec.vice_captain_id THEN COALESCE(mp.fantasy_points, 0) * 1.5
        ELSE COALESCE(mp.fantasy_points, 0)
      END
    ), 0) INTO v_total
    FROM public.team_players tp
    LEFT JOIN public.match_players mp ON mp.player_id = tp.player_id AND mp.match_id = p_match_id
    WHERE tp.team_id = team_rec.id;

    UPDATE public.user_teams
    SET total_points = v_total
    WHERE id = team_rec.id;

    updated_count := updated_count + 1;
  END LOOP;

  RETURN updated_count;
END;
$$;
