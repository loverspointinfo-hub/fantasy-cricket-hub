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
      let query = supabase.from("matches").select("*").order("match_time", { ascending: true });
      if (status) query = query.eq("status", status);
      const { data, error } = await query;
      if (error) throw error;
      return (data as Match[]) ?? [];
    },
  });
};

export const useMatch = (matchId: string) => {
  return useQuery({
    queryKey: ["match", matchId],
    queryFn: async () => {
      const { data, error } = await supabase.from("matches").select("*").eq("id", matchId).single();
      if (error) throw error;
      return data as Match;
    },
    enabled: !!matchId,
  });
};
