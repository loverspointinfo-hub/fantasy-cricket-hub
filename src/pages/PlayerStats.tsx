import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, TrendingUp, TrendingDown, Minus, Star, Crown, Zap, Target, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { staggerContainer, item } from "@/lib/animations";
import { Skeleton } from "@/components/ui/skeleton";
import { formatIST } from "@/lib/date-utils";

const ROLE_LABELS: Record<string, string> = { BAT: "Batsman", BOWL: "Bowler", AR: "All-Rounder", WK: "Wicket-Keeper" };
const ROLE_COLORS: Record<string, string> = {
  BAT: "from-blue-500 to-blue-700",
  BOWL: "from-red-500 to-red-700",
  AR: "from-purple-500 to-purple-700",
  WK: "from-amber-500 to-amber-700",
};

interface PlayerDetail {
  id: string;
  name: string;
  role: string;
  team: string;
  credit_value: number;
  photo_url: string | null;
}

interface MatchPerformance {
  match_id: string;
  fantasy_points: number;
  selected_by_percent: number;
  is_playing: boolean;
  match: {
    team1_short: string;
    team2_short: string;
    match_time: string;
    status: string;
  };
}

const usePlayerDetail = (playerId: string) => {
  return useQuery({
    queryKey: ["player-detail", playerId],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("players" as any) as any)
        .select("*")
        .eq("id", playerId)
        .single();
      if (error) throw error;
      return data as PlayerDetail;
    },
    enabled: !!playerId,
  });
};

const usePlayerMatches = (playerId: string) => {
  return useQuery({
    queryKey: ["player-matches", playerId],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("match_players" as any) as any)
        .select("match_id, fantasy_points, selected_by_percent, is_playing, match:matches!match_players_match_id_fkey(team1_short, team2_short, match_time, status)")
        .eq("player_id", playerId)
        .order("match:matches(match_time)", { ascending: false });
      if (error) throw error;
      // Sort by match_time descending
      const sorted = (data || []).sort((a: any, b: any) => 
        new Date(b.match?.match_time || 0).getTime() - new Date(a.match?.match_time || 0).getTime()
      );
      return sorted as MatchPerformance[];
    },
    enabled: !!playerId,
  });
};

const FormIndicator = ({ points }: { points: number }) => {
  if (points >= 50) return <div className="h-6 w-6 rounded-md bg-[hsl(var(--neon-green)/0.15)] flex items-center justify-center"><TrendingUp className="h-3.5 w-3.5 text-[hsl(var(--neon-green))]" /></div>;
  if (points >= 25) return <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center"><TrendingUp className="h-3.5 w-3.5 text-primary" /></div>;
  if (points >= 10) return <div className="h-6 w-6 rounded-md bg-[hsl(var(--neon-orange)/0.1)] flex items-center justify-center"><Minus className="h-3.5 w-3.5 text-[hsl(var(--neon-orange))]" /></div>;
  return <div className="h-6 w-6 rounded-md bg-destructive/10 flex items-center justify-center"><TrendingDown className="h-3.5 w-3.5 text-destructive" /></div>;
};

const PlayerStats = () => {
  const { playerId } = useParams();
  const navigate = useNavigate();
  const { data: player, isLoading: playerLoading } = usePlayerDetail(playerId || "");
  const { data: matches = [], isLoading: matchesLoading } = usePlayerMatches(playerId || "");

  const completedMatches = matches.filter(m => m.match?.status === "completed" || m.match?.status === "live");
  const totalPoints = completedMatches.reduce((sum, m) => sum + (m.fantasy_points || 0), 0);
  const avgPoints = completedMatches.length > 0 ? totalPoints / completedMatches.length : 0;
  const bestScore = completedMatches.length > 0 ? Math.max(...completedMatches.map(m => m.fantasy_points || 0)) : 0;
  const avgSelected = completedMatches.length > 0
    ? completedMatches.reduce((sum, m) => sum + (m.selected_by_percent || 0), 0) / completedMatches.length
    : 0;

  // Recent form = last 5 completed matches
  const recentForm = completedMatches.slice(0, 5);

  if (playerLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 border-b border-border/20 px-4 py-3"
          style={{ background: "hsl(228 18% 5% / 0.97)", backdropFilter: "blur(24px)" }}>
          <div className="mx-auto max-w-lg flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 -ml-1 rounded-xl hover:bg-secondary/80"><ArrowLeft className="h-5 w-5" /></button>
            <Skeleton className="h-5 w-32 rounded" />
          </div>
        </header>
        <div className="mx-auto max-w-lg px-4 py-6 space-y-4">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <p className="text-muted-foreground">Player not found</p>
        <button onClick={() => navigate(-1)} className="text-primary text-sm font-bold">Go Back</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-background">
      <div className="fixed inset-0 pointer-events-none gradient-mesh opacity-50" />
      <div className="floating-orb w-64 h-64 bg-[hsl(var(--neon-green))] -top-20 -right-20" />
      <div className="floating-orb w-48 h-48 bg-[hsl(var(--neon-cyan))] bottom-20 -left-10" style={{ animationDelay: "3s" }} />

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
            <p className="font-display text-base font-bold truncate">{player.name}</p>
            <p className="text-[10px] text-muted-foreground">{player.team} • {ROLE_LABELS[player.role] || player.role}</p>
          </div>
        </div>
      </header>

      <motion.div variants={staggerContainer} initial="hidden" animate="show"
        className="mx-auto max-w-lg px-4 py-5 space-y-4 relative z-10 pb-24">

        {/* Player Hero Card */}
        <motion.div variants={item} className="glass-card-premium p-5 relative overflow-hidden">
          <div className="shimmer absolute inset-0" />
          <div className="relative z-10 flex items-center gap-4">
            {/* Avatar */}
            <div className={cn(
              "h-20 w-20 rounded-2xl flex items-center justify-center text-white shadow-xl bg-gradient-to-br flex-shrink-0 overflow-hidden",
              ROLE_COLORS[player.role] || "from-gray-500 to-gray-700"
            )}>
              {player.photo_url ? (
                <img src={player.photo_url} alt={player.name} className="h-full w-full object-cover" onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                  (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
                }} />
              ) : null}
              <span className={cn("font-display text-2xl font-bold", player.photo_url && "hidden")}>
                {player.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-display text-xl font-bold truncate">{player.name}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={cn(
                  "text-[9px] font-bold",
                  player.role === "BAT" ? "bg-blue-500/15 text-blue-400 border-blue-500/20" :
                  player.role === "BOWL" ? "bg-red-500/15 text-red-400 border-red-500/20" :
                  player.role === "AR" ? "bg-purple-500/15 text-purple-400 border-purple-500/20" :
                  "bg-amber-500/15 text-amber-400 border-amber-500/20"
                )}>
                  {ROLE_LABELS[player.role]}
                </Badge>
                <span className="text-xs text-muted-foreground">{player.team}</span>
              </div>
              <div className="flex items-center gap-1 mt-2">
                <Zap className="h-3.5 w-3.5 text-primary" />
                <span className="font-display font-bold text-sm text-gradient">{player.credit_value} Credits</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div variants={item} className="grid grid-cols-4 gap-2">
          {[
            { label: "Matches", value: completedMatches.length, color: "" },
            { label: "Avg Pts", value: avgPoints.toFixed(1), color: "text-primary" },
            { label: "Best", value: bestScore, color: "text-[hsl(var(--gold))]" },
            { label: "Sel %", value: `${avgSelected.toFixed(0)}%`, color: "text-[hsl(var(--neon-cyan))]" },
          ].map(s => (
            <div key={s.label} className="glass-card p-3 text-center">
              <p className={cn("font-display text-lg font-bold", s.color)}>{s.value}</p>
              <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Recent Form */}
        {recentForm.length > 0 && (
          <motion.div variants={item} className="glass-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Target className="h-4 w-4 text-primary" />
              <h3 className="font-display text-sm font-bold uppercase tracking-wider">Recent Form</h3>
            </div>
            <div className="flex gap-2 justify-center">
              {recentForm.map((m, i) => (
                <div key={i} className="flex flex-col items-center gap-1.5">
                  <FormIndicator points={m.fantasy_points || 0} />
                  <span className="font-display font-bold text-xs">{m.fantasy_points || 0}</span>
                  <span className="text-[8px] text-muted-foreground">
                    {m.match?.team1_short} v {m.match?.team2_short}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Match History */}
        <motion.div variants={item} className="glass-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Star className="h-4 w-4 text-[hsl(var(--gold))]" />
            <h3 className="font-display text-sm font-bold uppercase tracking-wider">Match History</h3>
          </div>

          {matchesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 rounded-lg" />)}
            </div>
          ) : completedMatches.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-muted-foreground">
              <Target className="h-8 w-8 opacity-20 mb-2" />
              <p className="text-sm">No match history available</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Header */}
              <div className="flex items-center text-[9px] text-muted-foreground uppercase tracking-[0.15em] font-semibold px-2 pb-1">
                <span className="flex-1">Match</span>
                <span className="w-14 text-center">Sel %</span>
                <span className="w-14 text-right">Points</span>
              </div>

              {completedMatches.map((m, i) => (
                <div key={i} className={cn(
                  "flex items-center px-2 py-2.5 rounded-lg transition-all",
                  i % 2 === 0 && "bg-secondary/20"
                )}>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold">
                      {m.match?.team1_short} vs {m.match?.team2_short}
                    </p>
                    <p className="text-[9px] text-muted-foreground">
                      {m.match?.match_time ? formatIST(m.match.match_time, "dd MMM") : "—"}
                    </p>
                  </div>
                  <div className="w-14 text-center">
                    <span className="text-xs text-muted-foreground">{m.selected_by_percent?.toFixed(0)}%</span>
                  </div>
                  <div className="w-14 text-right">
                    <span className={cn(
                      "font-display font-bold text-sm",
                      (m.fantasy_points || 0) >= 50 ? "text-[hsl(var(--neon-green))]" :
                      (m.fantasy_points || 0) >= 25 ? "text-primary" :
                      (m.fantasy_points || 0) >= 10 ? "text-[hsl(var(--neon-orange))]" :
                      "text-destructive"
                    )}>
                      {m.fantasy_points || 0}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Upcoming matches */}
        {matches.filter(m => m.match?.status === "upcoming").length > 0 && (
          <motion.div variants={item} className="glass-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-4 w-4 text-[hsl(var(--neon-cyan))]" />
              <h3 className="font-display text-sm font-bold uppercase tracking-wider">Upcoming Matches</h3>
            </div>
            <div className="space-y-2">
              {matches.filter(m => m.match?.status === "upcoming").map((m, i) => (
                <div key={i} className="flex items-center justify-between px-2 py-2 rounded-lg bg-secondary/20">
                  <div>
                    <p className="text-xs font-semibold">{m.match?.team1_short} vs {m.match?.team2_short}</p>
                    <p className="text-[9px] text-muted-foreground">
                      {m.match?.match_time ? formatIST(m.match.match_time, "dd MMM, h:mm a") : "—"}
                    </p>
                  </div>
                  <Badge className="bg-primary/10 text-primary border-primary/20 text-[9px] font-bold">
                    {m.selected_by_percent?.toFixed(0)}% Sel
                  </Badge>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default PlayerStats;
