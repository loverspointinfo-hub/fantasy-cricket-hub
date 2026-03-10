import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface UserTeam {
  id: string;
  match_id: string;
  user_id: string;
  name: string | null;
  captain_id: string | null;
  vice_captain_id: string | null;
  total_credits: number | null;
  total_points: number | null;
  created_at: string | null;
  captain: { id: string; name: string; role: string; team: string } | null;
  vice_captain: { id: string; name: string; role: string; team: string } | null;
  team_players: { player_id: string; player: { id: string; name: string; role: string; team: string; credit_value: number } }[];
}

export const useUserTeams = (matchId: string) => {
  return useQuery({
    queryKey: ["user-teams", matchId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await (supabase
        .from("user_teams" as any) as any)
        .select(`
          *,
          captain:players!user_teams_captain_id_fkey(id, name, role, team),
          vice_captain:players!user_teams_vice_captain_id_fkey(id, name, role, team),
          team_players(player_id, player:players(id, name, role, team, credit_value))
        `)
        .eq("match_id", matchId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data as unknown as UserTeam[]) ?? [];
    },
    enabled: !!matchId,
  });
};

export const useDeleteTeam = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (teamId: string) => {
      // Delete team_players first, then user_teams
      const { error: tpError } = await (supabase.from("team_players" as any) as any).delete().eq("team_id", teamId);
      if (tpError) throw tpError;
      const { error } = await (supabase.from("user_teams" as any) as any).delete().eq("id", teamId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-teams"] });
    },
  });
};
