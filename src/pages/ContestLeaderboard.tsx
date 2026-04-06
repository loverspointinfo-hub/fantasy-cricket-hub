import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Trophy, Crown, Medal, Eye, Award, ArrowUp, ArrowDown, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
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
  rank: number;
  winnings: number;
  username: string;
  team_name: string;
  total_points: number;
}

interface RankChange {
  direction: "up" | "down" | "same";
  delta: number;
}

const useContestLeaderboard = (contestId: string) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!contestId) return;
    const channel = supabase
      .channel(`leaderboard-${contestId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'user_teams' }, () => {
        queryClient.invalidateQueries({ queryKey: ["contest-leaderboard", contestId] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contest_entries' }, () => {
        queryClient.invalidateQueries({ queryKey: ["contest-leaderboard", contestId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [contestId, queryClient]);

  return useQuery({
    queryKey: ["contest-leaderboard", contestId],
    queryFn: async () => {
      const { data: entries, error } = await (supabase
        .from("contest_entries" as any) as any)
        .select(`
          id, user_id, team_id, rank, winnings,
          user_teams!contest_entries_team_id_fkey(name, total_points, user_id)
        `)
        .eq("contest_id", contestId);
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

      const mapped: LeaderboardEntry[] = (entries || []).map((e: any) => ({
        id: e.id,
        user_id: e.user_id,
        team_id: e.team_id,
        rank: 0,
        winnings: e.winnings ?? 0,
        username: profiles[e.user_id] || "Player",
        team_name: e.user_teams?.name || "Team",
        total_points: e.user_teams?.total_points ?? 0,
      }));

      mapped.sort((a, b) => b.total_points - a.total_points);

      let currentRank = 1;
      for (let i = 0; i < mapped.length; i++) {
        if (i > 0 && mapped[i].total_points < mapped[i - 1].total_points) {
          currentRank = i + 1;
        }
        mapped[i].rank = currentRank;
      }

      return mapped;
    },
    enabled: !!contestId,
    refetchInterval: 10_000,
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
      const { data: team } = await (supabase
        .from("user_teams" as any) as any)
        .select("*")
        .eq("id", teamId)
        .single();
      if (!team) return null;
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
      return { team, players: matchPlayers };
    },
    enabled: !!teamId && !!matchId,
  });
};

const getRankBadge = (rank: number) => {
  if (rank === 1) return (
    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center shadow-lg shadow-yellow-500/30 ring-2 ring-yellow-400/20">
      <Crown className="h-4 w-4 text-white drop-shadow" />
    </div>
  );
  if (rank === 2) return (
    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-slate-300 to-slate-500 flex items-center justify-center shadow-lg shadow-slate-400/30 ring-2 ring-slate-300/20">
      <Medal className="h-4 w-4 text-white drop-shadow" />
    </div>
  );
  if (rank === 3) return (
    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-700 flex items-center justify-center shadow-lg shadow-orange-500/30 ring-2 ring-orange-400/20">
      <Medal className="h-4 w-4 text-white drop-shadow" />
    </div>
  );
  return (
    <div className="h-8 w-8 rounded-full bg-secondary/60 flex items-center justify-center">
      <span className="text-xs font-bold text-muted-foreground">{rank}</span>
    </div>
  );
};

const RankChangeIndicator = ({ change }: { change: RankChange }) => {
  if (change.direction === "same" || change.delta === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5, y: change.direction === "up" ? 10 : -10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.5 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      className={cn(
        "absolute -top-2 -right-2 flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold shadow-lg z-10",
        change.direction === "up"
          ? "bg-emerald-500 text-white shadow-emerald-500/40"
          : "bg-red-500 text-white shadow-red-500/40"
      )}
    >
      {change.direction === "up" ? (
        <ArrowUp className="h-2.5 w-2.5" />
      ) : (
        <ArrowDown className="h-2.5 w-2.5" />
      )}
      {change.delta}
    </motion.div>
  );
};

const LivePulse = () => (
  <div className="flex items-center gap-1.5">
    <span className="relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive" />
    </span>
    <span className="text-[10px] font-bold text-destructive uppercase tracking-wider">Live</span>
  </div>
);

const ContestLeaderboard = () => {
  const { contestId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: entries = [], isLoading } = useContestLeaderboard(contestId || "");
  const { data: contest } = useContestInfo(contestId || "");

  const [previewTeamId, setPreviewTeamId] = useState<string | null>(null);
  const matchId = contest?.matches?.id || null;
  const isLive = contest?.matches?.status === "live";
  const isCompleted = contest?.matches?.status === "completed";
  const hasWinners = entries.some(e => e.winnings > 0);

  // Track previous ranks for animation
  const prevRanksRef = useRef<Record<string, number>>({});
  const [rankChanges, setRankChanges] = useState<Record<string, RankChange>>({});
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    const prev = prevRanksRef.current;
    const changes: Record<string, RankChange> = {};
    let hasChanges = false;

    entries.forEach(e => {
      if (prev[e.id] !== undefined) {
        const delta = prev[e.id] - e.rank;
        if (delta > 0) {
          changes[e.id] = { direction: "up", delta };
          hasChanges = true;
        } else if (delta < 0) {
          changes[e.id] = { direction: "down", delta: Math.abs(delta) };
          hasChanges = true;
        } else {
          changes[e.id] = { direction: "same", delta: 0 };
        }
      } else {
        changes[e.id] = { direction: "same", delta: 0 };
      }
    });

    setRankChanges(changes);
    if (hasChanges) setLastUpdate(new Date());

    const newRanks: Record<string, number> = {};
    entries.forEach(e => { newRanks[e.id] = e.rank; });
    prevRanksRef.current = newRanks;

    if (hasChanges) {
      const timer = setTimeout(() => setRankChanges({}), 3000);
      return () => clearTimeout(timer);
    }
  }, [entries]);

  const { data: previewData } = useTeamPreviewData(previewTeamId, matchId);
  const myEntry = entries.find(e => e.user_id === user?.id);

  return (
    <div className="min-h-screen relative overflow-hidden bg-background">
      <div className="fixed inset-0 pointer-events-none gradient-mesh opacity-50" />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/20"
        style={{
          background: "linear-gradient(180deg, hsl(var(--background) / 0.97), hsl(var(--background) / 0.85))",
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
          {isLive && <LivePulse />}
          {isCompleted && (
            <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/25 text-[10px] font-bold gap-1">
              <Trophy className="h-3 w-3" /> Completed
            </Badge>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-lg relative z-10">
        {/* Contest Info Bar */}
        {contest && (
          <div className="px-4 py-3 border-b border-border/10 bg-secondary/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] text-muted-foreground uppercase tracking-[0.2em]">Prize Pool</p>
                <p className="font-display text-xl font-bold text-primary">₹{contest.prize_pool?.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] text-muted-foreground uppercase tracking-[0.2em]">Entry</p>
                <p className="font-display text-lg font-bold">
                  {contest.entry_fee === 0 ? <span className="text-emerald-400">FREE</span> : `₹${contest.entry_fee}`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[9px] text-muted-foreground uppercase tracking-[0.2em]">Winners</p>
                <p className="font-display text-lg font-bold text-amber-400">{contest.prize_breakdown?.length || 1}</p>
              </div>
            </div>
          </div>
        )}

        {/* My Rank Card */}
        {myEntry && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-4 mt-4 rounded-2xl p-4 relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, hsl(var(--primary) / 0.12), hsl(var(--primary) / 0.04))",
              border: "1px solid hsl(var(--primary) / 0.2)",
            }}
          >
            <div className="absolute top-0 right-0 w-24 h-24 opacity-5">
              <TrendingUp className="w-full h-full" />
            </div>
            <div className="flex items-center justify-between relative">
              <div className="flex items-center gap-3">
                <motion.div
                  key={myEntry.rank}
                  initial={{ scale: 1.3 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30"
                >
                  <span className="font-display font-bold text-lg text-primary-foreground">#{myEntry.rank}</span>
                </motion.div>
                <div>
                  <p className="text-sm font-bold text-primary">Your Rank</p>
                  <p className="text-[11px] text-muted-foreground">{myEntry.team_name}</p>
                </div>
              </div>
              <div className="text-right">
                <motion.p
                  key={myEntry.total_points}
                  initial={{ scale: 1.2, color: "hsl(var(--primary))" }}
                  animate={{ scale: 1, color: "hsl(var(--foreground))" }}
                  className="font-display font-bold text-xl"
                >
                  {myEntry.total_points}
                </motion.p>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Points</p>
                {myEntry.winnings > 0 && (
                  <p className="font-display font-bold text-sm text-emerald-400 mt-0.5">₹{myEntry.winnings}</p>
                )}
              </div>
            </div>
            {rankChanges[myEntry.id] && rankChanges[myEntry.id].direction !== "same" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className={cn(
                  "mt-2 pt-2 border-t flex items-center gap-1.5 text-xs font-semibold",
                  rankChanges[myEntry.id].direction === "up"
                    ? "border-emerald-500/20 text-emerald-400"
                    : "border-red-500/20 text-red-400"
                )}
              >
                {rankChanges[myEntry.id].direction === "up" ? (
                  <>
                    <ArrowUp className="h-3.5 w-3.5" />
                    Moved up {rankChanges[myEntry.id].delta} position{rankChanges[myEntry.id].delta > 1 ? "s" : ""}!
                  </>
                ) : (
                  <>
                    <ArrowDown className="h-3.5 w-3.5" />
                    Dropped {rankChanges[myEntry.id].delta} position{rankChanges[myEntry.id].delta > 1 ? "s" : ""}
                  </>
                )}
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Live update indicator */}
        {isLive && lastUpdate && (
          <div className="px-4 py-2 flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </p>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Auto-refreshing
            </div>
          </div>
        )}

        {/* Table Header */}
        <div className="flex items-center justify-between px-4 py-3 text-[10px] text-muted-foreground uppercase tracking-[0.15em] font-semibold border-b border-border/10">
          <span className="w-12 text-center">#</span>
          <span className="flex-1 pl-2">Player</span>
          <span className="w-16 text-right">Points</span>
          <span className="w-20 text-right">{hasWinners ? "Won" : "Prize"}</span>
          {(isLive || isCompleted) && <span className="w-8" />}
        </div>

        {/* Leaderboard List */}
        {isLoading ? (
          <div className="px-4 space-y-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-center gap-3 py-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-4 flex-1 rounded" />
                <Skeleton className="h-4 w-12 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <LayoutGroup>
            <div className="px-4 pb-24">
              <AnimatePresence mode="popLayout">
                {entries.map((entry) => {
                  const isMe = entry.user_id === user?.id;
                  const isTop3 = entry.rank <= 3;
                  const change = rankChanges[entry.id];
                  const hasRankChange = change && change.direction !== "same" && change.delta > 0;

                  return (
                    <motion.div
                      key={entry.id}
                      layout
                      layoutId={entry.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{
                        opacity: 1,
                        x: 0,
                        backgroundColor: hasRankChange
                          ? change.direction === "up"
                            ? "hsl(152 100% 50% / 0.06)"
                            : "hsl(0 100% 50% / 0.06)"
                          : "transparent",
                      }}
                      transition={{
                        layout: { type: "spring", stiffness: 300, damping: 30 },
                        backgroundColor: { duration: 0.5 },
                      }}
                      onClick={() => (isLive || isCompleted) && setPreviewTeamId(entry.team_id)}
                      className={cn(
                        "flex items-center py-3 border-b border-border/10 last:border-0 transition-colors rounded-lg",
                        isMe && "bg-primary/5 -mx-2 px-2 border-primary/10",
                        isTop3 && !isMe && "bg-amber-500/[0.02]",
                        hasWinners && entry.winnings > 0 && !isMe && "bg-emerald-500/[0.03]",
                        (isLive || isCompleted) && "cursor-pointer hover:bg-secondary/30 active:scale-[0.99]"
                      )}
                    >
                      {/* Rank Badge */}
                      <div className="w-12 flex items-center justify-center relative">
                        <motion.div
                          key={entry.rank}
                          initial={{ scale: hasRankChange ? 1.3 : 1 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 400, damping: 15 }}
                        >
                          {getRankBadge(entry.rank)}
                        </motion.div>
                        <AnimatePresence>
                          {change && <RankChangeIndicator change={change} />}
                        </AnimatePresence>
                      </div>

                      {/* Player Info */}
                      <div className="flex-1 min-w-0 pl-2">
                        <div className="flex items-center gap-1.5">
                          <p className={cn("text-sm font-semibold truncate", isMe && "text-primary")}>
                            {isMe ? "You" : entry.username}
                          </p>
                          {hasWinners && entry.winnings > 0 && (
                            <Badge className="bg-emerald-500/12 text-emerald-400 border-emerald-500/20 text-[8px] px-1.5 py-0 h-4 font-bold uppercase tracking-wider gap-0.5">
                              <Award className="h-2.5 w-2.5" /> Winner
                            </Badge>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground">{entry.team_name}</p>
                      </div>

                      {/* Points */}
                      <div className="w-16 text-right">
                        <motion.p
                          key={entry.total_points}
                          initial={{ scale: 1.15, color: "hsl(var(--primary))" }}
                          animate={{ scale: 1, color: isTop3 ? "hsl(45 100% 60%)" : "hsl(var(--foreground))" }}
                          transition={{ duration: 0.4 }}
                          className="font-display font-bold text-sm"
                        >
                          {entry.total_points}
                        </motion.p>
                        <p className="text-[9px] text-muted-foreground">pts</p>
                      </div>

                      {/* Winnings */}
                      <div className="w-20 text-right">
                        {entry.winnings > 0 ? (
                          <div>
                            <p className="font-display font-bold text-sm text-emerald-400">₹{entry.winnings}</p>
                            {hasWinners && <p className="text-[8px] text-emerald-400/60 font-medium">Credited</p>}
                          </div>
                        ) : (
                          <p className="text-[10px] text-muted-foreground">—</p>
                        )}
                      </div>

                      {/* Eye icon for preview */}
                      {(isLive || isCompleted) && (
                        <div className="w-8 flex items-center justify-center">
                          <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {entries.length === 0 && (
                <div className="flex flex-col items-center py-16 text-muted-foreground">
                  <Trophy className="h-8 w-8 opacity-20 mb-3" />
                  <p className="text-sm font-medium">No participants yet</p>
                </div>
              )}
            </div>
          </LayoutGroup>
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
