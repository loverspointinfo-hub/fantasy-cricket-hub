import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Trophy, Crown, Medal, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { staggerContainer, item } from "@/lib/animations";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { MatchPlayer } from "@/hooks/useMatchPlayers";
import TeamPreview from "@/components/team/TeamPreview";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

interface LeaderboardEntry {
  id: string;
  user_id: string;
  team_id: string;
  rank: number | null;
  winnings: number | null;
  username: string;
  team_name: string;
  total_points: number;
}

const useContestLeaderboard = (contestId: string) => {
  return useQuery({
    queryKey: ["contest-leaderboard", contestId],
    queryFn: async () => {
      const { data: entries, error } = await (supabase
        .from("contest_entries" as any) as any)
        .select(`
          id, user_id, team_id, rank, winnings,
          user_teams!contest_entries_team_id_fkey(name, total_points, user_id)
        `)
        .eq("contest_id", contestId)
        .order("rank", { ascending: true, nullsFirst: false });
      if (error) throw error;

      const userIds = [...new Set((entries || []).map((e: any) => e.user_id))];
      let profiles: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profs } = await (supabase
          .from("profiles" as any) as any)
          .select("id, username")
          .in("id", userIds);
        profs?.forEach((p: any) => { profiles[p.id] = p.username || "Player"; });
      }

      // Sort by total_points descending for ranking
      const mapped = (entries || []).map((e: any) => ({
        id: e.id,
        user_id: e.user_id,
        team_id: e.team_id,
        rank: e.rank ?? 0,
        winnings: e.winnings ?? 0,
        username: profiles[e.user_id] || "Player",
        team_name: e.user_teams?.name || "Team",
        total_points: e.user_teams?.total_points ?? 0,
      }));

      // Sort by points desc and assign ranks
      mapped.sort((a: any, b: any) => b.total_points - a.total_points);
      mapped.forEach((e: any, i: number) => { e.rank = i + 1; });

      return mapped as LeaderboardEntry[];
    },
    enabled: !!contestId,
    refetchInterval: 15_000,
  });
};

const useContestInfo = (contestId: string) => {
  return useQuery({
    queryKey: ["contest-info", contestId],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("contests" as any) as any)
        .select("*, matches!contests_match_id_fkey(team1_short, team2_short, status, id)")
        .eq("id", contestId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!contestId,
  });
};

const useTeamPreviewData = (teamId: string | null, matchId: string | null) => {
  return useQuery({
    queryKey: ["team-preview", teamId],
    queryFn: async () => {
      if (!teamId || !matchId) return null;

      // Get team info
      const { data: team } = await (supabase
        .from("user_teams" as any) as any)
        .select("*")
        .eq("id", teamId)
        .single();
      if (!team) return null;

      // Get team players with player details
      const { data: teamPlayers } = await (supabase
        .from("team_players" as any) as any)
        .select("player_id, players(*)")
        .eq("team_id", teamId);

      const matchPlayers: MatchPlayer[] = (teamPlayers || []).map((tp: any) => ({
        id: tp.player_id,
        match_id: matchId,
        player_id: tp.player_id,
        is_playing: true,
        fantasy_points: 0,
        selected_by_percent: 0,
        player: tp.players,
      }));

      return {
        team,
        players: matchPlayers,
      };
    },
    enabled: !!teamId && !!matchId,
  });
};

const getRankIcon = (rank: number) => {
  if (rank === 1) return <Crown className="h-4 w-4 text-[hsl(var(--gold))]" />;
  if (rank === 2) return <Medal className="h-4 w-4 text-[hsl(var(--neon-cyan))]" />;
  if (rank === 3) return <Medal className="h-4 w-4 text-[hsl(var(--neon-orange))]" />;
  return <span className="text-xs font-bold text-muted-foreground">#{rank}</span>;
};

const ContestLeaderboard = () => {
  const { contestId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: entries = [], isLoading } = useContestLeaderboard(contestId || "");
  const { data: contest } = useContestInfo(contestId || "");

  const [previewTeamId, setPreviewTeamId] = useState<string | null>(null);
  const matchId = contest?.matches?.id || null;
  const isLive = contest?.matches?.status === "live";

  const { data: previewData } = useTeamPreviewData(previewTeamId, matchId);

  const myEntry = entries.find(e => e.user_id === user?.id);

  const handleEntryClick = (entry: LeaderboardEntry) => {
    if (isLive) {
      setPreviewTeamId(entry.team_id);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-background">
      <div className="fixed inset-0 pointer-events-none gradient-mesh opacity-50" />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/20"
        style={{
          background: "linear-gradient(180deg, hsl(228 18% 5% / 0.97), hsl(228 18% 5% / 0.85))",
          backdropFilter: "blur(24px)",
        }}>
        <div className="mx-auto max-w-lg px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-1 rounded-xl hover:bg-secondary/80 active:scale-95 transition-all">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="font-display text-base font-bold truncate">{contest?.name || "Leaderboard"}</p>
            <p className="text-[10px] text-muted-foreground">
              {contest?.matches?.team1_short} vs {contest?.matches?.team2_short} • {entries.length} participants
            </p>
          </div>
          {isLive && (
            <Badge className="bg-[hsl(var(--neon-red)/0.15)] text-[hsl(var(--neon-red))] border-[hsl(var(--neon-red)/0.25)] text-[10px] font-bold gap-1 animate-pulse">
              <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--neon-red))]" /> LIVE
            </Badge>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-lg relative z-10">
        {/* Prize info bar */}
        {contest && (
          <div className="px-4 py-3 border-b border-border/10"
            style={{ background: "hsl(228 16% 8% / 0.8)" }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] text-muted-foreground uppercase tracking-[0.2em]">Prize Pool</p>
                <p className="font-display text-xl font-bold text-gradient">₹{contest.prize_pool?.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] text-muted-foreground uppercase tracking-[0.2em]">Entry</p>
                <p className="font-display text-lg font-bold">
                  {contest.entry_fee === 0 ? <span className="text-[hsl(var(--neon-green))]">FREE</span> : `₹${contest.entry_fee}`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[9px] text-muted-foreground uppercase tracking-[0.2em]">Winners</p>
                <p className="font-display text-lg font-bold text-[hsl(var(--gold))]">
                  {contest.prize_breakdown?.length || 1}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* My rank banner */}
        {myEntry && (
          <div className="mx-4 mt-4 rounded-xl p-3 flex items-center justify-between"
            style={{
              background: "linear-gradient(135deg, hsl(152 100% 50% / 0.08), hsl(195 100% 55% / 0.05))",
              border: "1px solid hsl(152 100% 50% / 0.15)",
            }}>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center">
                <span className="font-display font-bold text-sm text-primary-foreground">#{myEntry.rank}</span>
              </div>
              <div>
                <p className="text-xs font-bold text-primary">Your Rank</p>
                <p className="text-[10px] text-muted-foreground">{myEntry.team_name} • {myEntry.total_points} pts</p>
              </div>
            </div>
            {myEntry.winnings > 0 && (
              <div className="text-right">
                <p className="text-[9px] text-muted-foreground">Winnings</p>
                <p className="font-display font-bold text-sm text-[hsl(var(--neon-green))]">₹{myEntry.winnings}</p>
              </div>
            )}
          </div>
        )}

        {/* Leaderboard header */}
        <div className="flex items-center justify-between px-4 py-3 text-[10px] text-muted-foreground uppercase tracking-[0.15em] font-semibold">
          <span className="w-12">Rank</span>
          <span className="flex-1">Player</span>
          <span className="w-16 text-right">Points</span>
          <span className="w-16 text-right">Prize</span>
          {isLive && <span className="w-8" />}
        </div>

        {/* Entries */}
        {isLoading ? (
          <div className="px-4 space-y-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-center gap-3 py-3">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <Skeleton className="h-4 flex-1 rounded" />
                <Skeleton className="h-4 w-12 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <motion.div variants={staggerContainer} initial="hidden" animate="show" className="px-4 pb-24">
            {entries.map((entry) => {
              const isMe = entry.user_id === user?.id;
              const isTop3 = entry.rank <= 3;
              return (
                <motion.div
                  key={entry.id}
                  variants={item}
                  onClick={() => handleEntryClick(entry)}
                  className={cn(
                    "flex items-center py-3 border-b border-border/10 last:border-0 transition-all",
                    isMe && "bg-primary/5 -mx-4 px-4 rounded-xl border-primary/10",
                    isTop3 && !isMe && "bg-[hsl(var(--gold)/0.02)]",
                    isLive && "cursor-pointer hover:bg-secondary/30 active:scale-[0.99]"
                  )}
                >
                  <div className="w-12 flex items-center justify-center">
                    {getRankIcon(entry.rank!)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-semibold truncate", isMe && "text-primary")}>
                      {isMe ? "You" : entry.username}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{entry.team_name}</p>
                  </div>
                  <div className="w-16 text-right">
                    <p className={cn("font-display font-bold text-sm", isTop3 && "text-[hsl(var(--gold))]")}>
                      {entry.total_points}
                    </p>
                  </div>
                  <div className="w-16 text-right">
                    {entry.winnings > 0 ? (
                      <p className="font-display font-bold text-sm text-[hsl(var(--neon-green))]">₹{entry.winnings}</p>
                    ) : (
                      <p className="text-[10px] text-muted-foreground">—</p>
                    )}
                  </div>
                  {isLive && (
                    <div className="w-8 flex items-center justify-center">
                      <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  )}
                </motion.div>
              );
            })}
            {entries.length === 0 && (
              <div className="flex flex-col items-center py-16 text-muted-foreground">
                <Trophy className="h-8 w-8 opacity-20 mb-3" />
                <p className="text-sm font-medium">No participants yet</p>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Team Preview Dialog */}
      <Dialog open={!!previewTeamId && !!previewData} onOpenChange={(open) => !open && setPreviewTeamId(null)}>
        <DialogContent className="max-w-md p-0 bg-transparent border-0 shadow-none [&>button]:hidden">
          {previewData && (
            <TeamPreview
              players={previewData.players}
              captainId={previewData.team.captain_id || ""}
              viceCaptainId={previewData.team.vice_captain_id || ""}
              totalCredits={previewData.team.total_credits || 0}
              team1Short={contest?.matches?.team1_short}
              team2Short={contest?.matches?.team2_short}
              teamName={previewData.team.name}
              onClose={() => setPreviewTeamId(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContestLeaderboard;
