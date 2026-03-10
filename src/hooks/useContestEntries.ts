import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useContestEntries = (contestId: string) => {
  return useQuery({
    queryKey: ["contest-entries", contestId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await (supabase
        .from("contest_entries" as any) as any)
        .select("*")
        .eq("contest_id", contestId)
        .eq("user_id", user.id);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!contestId,
  });
};

export const useMyContestEntries = (matchId: string) => {
  return useQuery({
    queryKey: ["my-contest-entries", matchId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      // Get all contest IDs for this match first
      const { data: contests, error: cErr } = await (supabase
        .from("contests" as any) as any)
        .select("id")
        .eq("match_id", matchId);
      if (cErr) throw cErr;
      if (!contests?.length) return [];

      const contestIds = contests.map((c: any) => c.id);
      const { data, error } = await (supabase
        .from("contest_entries" as any) as any)
        .select("*")
        .eq("user_id", user.id)
        .in("contest_id", contestIds);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!matchId,
  });
};

export const useJoinContest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ contestId, teamId }: { contestId: string; teamId: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Please login first");

      const { error } = await (supabase
        .from("contest_entries" as any) as any)
        .insert({
          contest_id: contestId,
          team_id: teamId,
          user_id: user.id,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contest-entries"] });
      queryClient.invalidateQueries({ queryKey: ["my-contest-entries"] });
      queryClient.invalidateQueries({ queryKey: ["contests"] });
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
    },
  });
};
