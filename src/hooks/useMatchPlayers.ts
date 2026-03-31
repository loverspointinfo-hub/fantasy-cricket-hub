import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MatchPlayer {
  id: string;
  match_id: string;
  player_id: string;
  is_playing: boolean;
  fantasy_points: number;
  selected_by_percent: number;
  player: {
    id: string;
    name: string;
    role: string;
    team: string;
    credit_value: number;
    photo_url: string | null;
  };
}

export const useMatchPlayers = (matchId: string) => {
  return useQuery({
    queryKey: ["match-players", matchId],
    queryFn: async () => {
      // Recalculate player ownership % before fetching
      try {
        await (supabase.rpc as any)("recalculate_player_ownership", { p_match_id: matchId });
      } catch {
        // Ignore errors - ownership % will just use existing values
      }

      const { data, error } = await (supabase
        .from("match_players" as any) as any)
        .select("*, player:players(*)")
        .eq("match_id", matchId)
        .eq("is_playing", true);
      if (error) throw error;
      return (data as unknown as MatchPlayer[]) ?? [];
    },
    enabled: !!matchId,
  });
};
