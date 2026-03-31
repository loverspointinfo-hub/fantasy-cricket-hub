import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Trophy, TrendingUp, Target, Crown, Medal, BarChart3, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { staggerContainer, item } from "@/lib/animations";
import { formatIST } from "@/lib/date-utils";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const usePerformanceData = (userId: string | undefined) => {
  return useQuery({
    queryKey: ["performance", userId],
    queryFn: async () => {
      if (!userId) return null;

      // Get all contest entries
      const { data: entries } = await (supabase.from("contest_entries" as any) as any)
        .select("id, rank, winnings, contest_id, team_id, created_at")
        .eq("user_id", userId);

      // Get contest details for fees
      const contestIds = [...new Set((entries || []).map((e: any) => e.contest_id))];
      let contestMap: Record<string, any> = {};
      if (contestIds.length > 0) {
        const { data: contests } = await (supabase.from("contests" as any) as any)
          .select("id, name, entry_fee, prize_pool, max_entries")
          .in("id", contestIds);
        (contests || []).forEach((c: any) => { contestMap[c.id] = c; });
      }

      // Get captain/VC data
      const teamIds = [...new Set((entries || []).map((e: any) => e.team_id))];
      let teamMap: Record<string, any> = {};
      if (teamIds.length > 0) {
        const { data: teams } = await (supabase.from("user_teams" as any) as any)
          .select("id, captain_id, vice_captain_id, total_points, match_id")
          .in("id", teamIds);
        (teams || []).forEach((t: any) => { teamMap[t.id] = t; });
      }

      // Get player names for captain/vc
      const playerIds = new Set<string>();
      Object.values(teamMap).forEach((t: any) => {
        if (t.captain_id) playerIds.add(t.captain_id);
        if (t.vice_captain_id) playerIds.add(t.vice_captain_id);
      });
      let playerMap: Record<string, string> = {};
      if (playerIds.size > 0) {
        const { data: players } = await (supabase.from("players" as any) as any)
          .select("id, name")
          .in("id", [...playerIds]);
        (players || []).forEach((p: any) => { playerMap[p.id] = p.name; });
      }

      // Match player points for captain/vc success
      const matchIds = new Set<string>();
      Object.values(teamMap).forEach((t: any) => { if (t.match_id) matchIds.add(t.match_id); });
      let matchPlayerPoints: Record<string, Record<string, number>> = {};
      if (matchIds.size > 0) {
        const { data: mps } = await (supabase.from("match_players" as any) as any)
          .select("match_id, player_id, fantasy_points")
          .in("match_id", [...matchIds]);
        (mps || []).forEach((mp: any) => {
          if (!matchPlayerPoints[mp.match_id]) matchPlayerPoints[mp.match_id] = {};
          matchPlayerPoints[mp.match_id][mp.player_id] = mp.fantasy_points || 0;
        });
      }

      const allEntries = entries || [];
      const totalContests = allEntries.length;
      const wins = allEntries.filter((e: any) => e.rank === 1).length;
      const totalWinnings = allEntries.reduce((s: number, e: any) => s + (e.winnings || 0), 0);
      const totalInvested = allEntries.reduce((s: number, e: any) => s + (contestMap[e.contest_id]?.entry_fee || 0), 0);
      const roi = totalInvested > 0 ? ((totalWinnings - totalInvested) / totalInvested) * 100 : 0;
      const winRate = totalContests > 0 ? (wins / totalContests) * 100 : 0;
      const avgRank = totalContests > 0
        ? allEntries.reduce((s: number, e: any) => s + (e.rank || 0), 0) / totalContests
        : 0;

      // Best contest
      const bestEntry = allEntries.reduce((best: any, e: any) =>
        (e.winnings || 0) > (best?.winnings || 0) ? e : best, null);
      const bestContest = bestEntry ? contestMap[bestEntry.contest_id] : null;

      // Monthly earnings chart
      const monthlyMap: Record<string, number> = {};
      allEntries.forEach((e: any) => {
        if (e.winnings > 0 && e.created_at) {
          const month = formatIST(e.created_at, "MMM yyyy");
          monthlyMap[month] = (monthlyMap[month] || 0) + e.winnings;
        }
      });
      const monthlyEarnings = Object.entries(monthlyMap).slice(-6).map(([month, amount]) => ({ month, amount }));

      // Captain/VC success rate
      const captainStats: Record<string, { name: string; totalPoints: number; times: number }> = {};
      Object.values(teamMap).forEach((t: any) => {
        if (t.captain_id && t.match_id) {
          const pts = (matchPlayerPoints[t.match_id]?.[t.captain_id] || 0) * 2;
          if (!captainStats[t.captain_id]) captainStats[t.captain_id] = { name: playerMap[t.captain_id] || "Unknown", totalPoints: 0, times: 0 };
          captainStats[t.captain_id].totalPoints += pts;
          captainStats[t.captain_id].times += 1;
        }
      });
      const topCaptains = Object.values(captainStats)
        .map(c => ({ ...c, avg: c.times > 0 ? c.totalPoints / c.times : 0 }))
        .sort((a, b) => b.avg - a.avg)
        .slice(0, 5);

      return {
        totalContests, wins, winRate, totalWinnings, totalInvested, roi, avgRank,
        bestContest: bestContest ? { name: bestContest.name, prize: bestEntry.winnings, rank: bestEntry.rank } : null,
        monthlyEarnings, topCaptains,
      };
    },
    enabled: !!userId,
  });
};

const PerformanceDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, isLoading } = usePerformanceData(user?.id);

  return (
    <div className="min-h-screen relative overflow-hidden bg-background">
      <div className="fixed inset-0 pointer-events-none gradient-mesh opacity-40" />

      <header className="sticky top-0 z-50 border-b border-border/20"
        style={{ background: "linear-gradient(180deg, hsl(228 18% 5% / 0.97), hsl(228 18% 5% / 0.85))", backdropFilter: "blur(24px)" }}>
        <div className="mx-auto max-w-lg px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-1 rounded-xl hover:bg-secondary/80 active:scale-95 transition-all">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <p className="font-display text-base font-bold">My Performance</p>
            <p className="text-[10px] text-muted-foreground">Stats & analytics</p>
          </div>
        </div>
      </header>

      <motion.div variants={staggerContainer} initial="hidden" animate="show"
        className="mx-auto max-w-lg px-4 pt-4 pb-28 space-y-4 relative z-10">

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-xl bg-secondary/30 animate-pulse" />)}
          </div>
        ) : !data ? (
          <div className="text-center py-16 text-muted-foreground text-sm">No data yet. Join contests to see your performance!</div>
        ) : (
          <>
            {/* Key Stats */}
            <motion.div variants={item} className="grid grid-cols-2 gap-3">
              {[
                { label: "Win Rate", value: `${data.winRate.toFixed(1)}%`, icon: Target, color: "text-primary" },
                { label: "ROI", value: `${data.roi >= 0 ? "+" : ""}${data.roi.toFixed(1)}%`, icon: TrendingUp, color: data.roi >= 0 ? "text-primary" : "text-destructive" },
                { label: "Avg Rank", value: `#${data.avgRank.toFixed(1)}`, icon: BarChart3, color: "text-[hsl(var(--gold))]" },
                { label: "Total Won", value: `₹${data.totalWinnings}`, icon: Trophy, color: "text-[hsl(var(--neon-green))]" },
              ].map(s => (
                <div key={s.label} className="glass-card p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <s.icon className={cn("h-4 w-4", s.color)} />
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{s.label}</span>
                  </div>
                  <p className={cn("font-display text-2xl font-bold", s.color)}>{s.value}</p>
                </div>
              ))}
            </motion.div>

            {/* Summary */}
            <motion.div variants={item} className="glass-card p-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Contests</p>
                  <p className="font-display text-lg font-bold">{data.totalContests}</p>
                </div>
                <div className="border-x border-border/10">
                  <p className="text-[10px] text-muted-foreground uppercase">Wins</p>
                  <p className="font-display text-lg font-bold text-primary">{data.wins}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Invested</p>
                  <p className="font-display text-lg font-bold">₹{data.totalInvested}</p>
                </div>
              </div>
            </motion.div>

            {/* Best Contest */}
            {data.bestContest && (
              <motion.div variants={item} className="glass-card-premium p-4 relative overflow-hidden">
                <div className="shimmer absolute inset-0" />
                <div className="relative z-10 flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center shadow-lg">
                    <Crown className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Best Contest</p>
                    <p className="font-display font-bold text-sm">{data.bestContest.name}</p>
                    <p className="text-[10px] text-muted-foreground">Rank #{data.bestContest.rank}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-xl font-bold text-[hsl(var(--neon-green))]">₹{data.bestContest.prize}</p>
                    <Badge className="bg-primary/10 text-primary text-[8px]">Won</Badge>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Monthly Earnings Chart */}
            {data.monthlyEarnings.length > 0 && (
              <motion.div variants={item}>
                <Card className="glass-card border-0">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-display flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-primary" /> Monthly Earnings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={180}>
                      <AreaChart data={data.monthlyEarnings}>
                        <defs>
                          <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(152, 100%, 50%)" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(152, 100%, 50%)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "hsl(220, 10%, 48%)", fontSize: 10 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(220, 10%, 48%)", fontSize: 10 }} tickFormatter={(v) => `₹${v}`} />
                        <Tooltip
                          contentStyle={{ background: "hsl(228, 16%, 10%)", border: "1px solid hsl(228, 12%, 18%)", borderRadius: "12px", fontSize: 11, color: "hsl(210, 40%, 96%)" }}
                          formatter={(value: number) => [`₹${value}`, "Earnings"]}
                        />
                        <Area type="monotone" dataKey="amount" stroke="hsl(152, 100%, 50%)" strokeWidth={2} fillOpacity={1} fill="url(#colorEarnings)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Captain/VC Success Rate */}
            {data.topCaptains.length > 0 && (
              <motion.div variants={item}>
                <Card className="glass-card border-0">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-display flex items-center gap-2">
                      <Star className="h-4 w-4 text-[hsl(var(--gold))]" /> Captain Success Rate
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {data.topCaptains.map((c, idx) => (
                      <div key={idx} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-secondary/20 transition-colors">
                        <div className="h-8 w-8 rounded-full flex items-center justify-center bg-gradient-to-br from-yellow-400/20 to-amber-600/20">
                          {idx === 0 ? <Crown className="h-4 w-4 text-yellow-400" /> :
                           idx < 3 ? <Medal className="h-4 w-4 text-slate-400" /> :
                           <span className="text-xs font-bold text-muted-foreground">{idx + 1}</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate">{c.name}</p>
                          <p className="text-[10px] text-muted-foreground">Captain {c.times}x</p>
                        </div>
                        <div className="text-right">
                          <p className="font-display text-sm font-bold text-[hsl(var(--gold))]">{c.avg.toFixed(1)}</p>
                          <p className="text-[9px] text-muted-foreground">avg pts</p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
};

export default PerformanceDashboard;
