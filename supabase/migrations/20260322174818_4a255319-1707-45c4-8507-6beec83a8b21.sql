
-- Allow all authenticated users to view contest entries (for leaderboard)
CREATE POLICY "Anyone can view contest entries"
ON public.contest_entries
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to view all team_players (for previewing other users' teams during live matches)
CREATE POLICY "Authenticated users can view all team players"
ON public.team_players
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to view all user_teams (for team preview on leaderboard)
CREATE POLICY "Authenticated users can view all user teams"
ON public.user_teams
FOR SELECT
TO authenticated
USING (true);
