import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { UserTeam } from "@/hooks/useUserTeams";

export const useAllMatchTeams = (matchId: string) => {
  return useQuery({
    queryKey: ["all-match-teams", matchId],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("user_teams" as any) as any)
        .select(`
          *,
          captain:players!user_teams_captain_id_fkey(id, name, role, team),
          vice_captain:players!user_teams_vice_captain_id_fkey(id, name, role, team),
          team_players(player_id, player:players(id, name, role, team, credit_value))
        `)
        .eq("match_id", matchId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data as unknown as UserTeam[]) ?? [];
    },
    enabled: !!matchId,
  });
};
