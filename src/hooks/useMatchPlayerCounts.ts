import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useMatchPlayerCounts = () => {
  return useQuery({
    queryKey: ["match-player-counts"],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("match_players" as any) as any)
        .select("match_id, is_playing")
        .eq("is_playing", true);
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const row of (data ?? []) as { match_id: string }[]) {
        counts[row.match_id] = (counts[row.match_id] || 0) + 1;
      }
      return counts;
    },
    refetchInterval: 60_000,
  });
};
