import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Match {
  id: string;
  team1_name: string;
  team2_name: string;
  team1_short: string;
  team2_short: string;
  team1_color: string;
  team2_color: string;
  league: string;
  sport: string;
  venue: string | null;
  match_time: string;
  entry_deadline: string;
  status: string;
}

export const useMatches = (status?: string) => {
  return useQuery({
    queryKey: ["matches", status],
    queryFn: async () => {
      // Auto-transition matches whose deadline has passed
      await (supabase.rpc as any)("auto_transition_matches");

      let query = (supabase.from("matches" as any) as any).select("*").order("match_time", { ascending: true });

      if (status) {
        query = query.eq("status", status);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data as Match[]) ?? [];
    },
    // Refetch every 30s so matches transition automatically
    refetchInterval: 30_000,
  });
};

export const useMatch = (matchId: string) => {
  return useQuery({
    queryKey: ["match", matchId],
    queryFn: async () => {
      const { data, error } = await (supabase.from("matches" as any) as any).select("*").eq("id", matchId).single();
      if (error) throw error;
      return data as Match;
    },
    enabled: !!matchId,
  });
};
