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
      // Fetch upcoming + live from DB, then re-classify client-side
      let query = (supabase.from("matches" as any) as any).select("*").order("match_time", { ascending: true });

      // When requesting "upcoming" or "live", fetch both so we can reclassify
      if (status === "upcoming" || status === "live") {
        query = query.in("status", ["upcoming", "live"]);
      } else if (status) {
        query = query.eq("status", status);
      }

      const { data, error } = await query;
      if (error) throw error;

      const now = Date.now();
      const matches = (data as Match[]) ?? [];

      if (status === "upcoming") {
        // Only show matches whose entry_deadline is still in the future
        return matches.filter((m) => new Date(m.entry_deadline).getTime() > now);
      }
      if (status === "live") {
        // Show DB-live matches + upcoming matches whose entry_deadline has passed
        return matches.filter(
          (m) => m.status === "live" || (m.status === "upcoming" && new Date(m.entry_deadline).getTime() <= now)
        );
      }

      return matches;
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
