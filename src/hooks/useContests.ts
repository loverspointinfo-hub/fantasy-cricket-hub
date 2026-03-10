import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Contest {
  id: string;
  match_id: string;
  name: string;
  type: string;
  entry_fee: number;
  prize_pool: number;
  max_entries: number;
  current_entries: number;
  is_guaranteed: boolean;
  invite_code: string | null;
  prize_breakdown: any[];
  status: string;
}

export const useContests = (matchId: string) => {
  return useQuery({
    queryKey: ["contests", matchId],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("contests" as any) as any)
        .select("*")
        .eq("match_id", matchId)
        .order("prize_pool", { ascending: false });
      if (error) throw error;
      return (data as Contest[]) ?? [];
    },
    enabled: !!matchId,
  });
};
