import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Zap, Save, RefreshCw, Trophy, Users } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const AdminLiveScoring = () => {
  const qc = useQueryClient();
  const [selectedMatchId, setSelectedMatchId] = useState<string>("");
  const [points, setPoints] = useState<Record<string, string>>({});

  // Fetch live matches
  const { data: liveMatches = [] } = useQuery({
    queryKey: ["admin-live-matches"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("matches") as any)
        .select("*")
        .in("status", ["live", "completed"])
        .order("match_time", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 30_000,
  });

  // Fetch match players for selected match
  const { data: matchPlayers = [], isLoading: loadingPlayers } = useQuery({
    queryKey: ["admin-match-players-scoring", selectedMatchId],
    queryFn: async () => {
      const { data, error } = await (supabase.from("match_players") as any)
        .select("*, players!match_players_player_id_fkey(name, role, team, photo_url)")
        .eq("match_id", selectedMatchId)
        .order("fantasy_points", { ascending: false });
      if (error) throw error;
      // Initialize points state
      const pts: Record<string, string> = {};
      (data || []).forEach((mp: any) => {
        pts[mp.id] = String(mp.fantasy_points ?? 0);
      });
      setPoints(pts);
      return data ?? [];
    },
    enabled: !!selectedMatchId,
  });

  // Count teams affected
  const { data: teamCount = 0 } = useQuery({
    queryKey: ["admin-team-count", selectedMatchId],
    queryFn: async () => {
      const { count, error } = await (supabase.from("user_teams") as any)
        .select("id", { count: "exact", head: true })
        .eq("match_id", selectedMatchId);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!selectedMatchId,
  });

  // Save points and recalculate
  const savePoints = useMutation({
    mutationFn: async () => {
      // Update each match_player's fantasy_points
      for (const mp of matchPlayers) {
        const newPts = parseFloat(points[mp.id] || "0");
        if (newPts !== (mp.fantasy_points ?? 0)) {
          const { error } = await (supabase.from("match_players") as any)
            .update({ fantasy_points: newPts })
            .eq("id", mp.id);
          if (error) throw error;
        }
      }
      // Recalculate all team total_points
      const { data, error } = await (supabase.rpc as any)("recalculate_team_points", {
        p_match_id: selectedMatchId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (count) => {
      qc.invalidateQueries({ queryKey: ["admin-match-players-scoring"] });
      qc.invalidateQueries({ queryKey: ["contest-leaderboard"] });
      qc.invalidateQueries({ queryKey: ["user-teams"] });
      toast.success(`Points saved! ${count} teams recalculated`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const selectedMatch = liveMatches.find((m: any) => m.id === selectedMatchId);

  // Group players by team
  const groupedPlayers = matchPlayers.reduce((acc: Record<string, any[]>, mp: any) => {
    const team = mp.players?.team || "Unknown";
    if (!acc[team]) acc[team] = [];
    acc[team].push(mp);
    return acc;
  }, {});

  const roleColors: Record<string, string> = {
    BAT: "bg-blue-500/15 text-blue-400 border-blue-500/20",
    BOWL: "bg-purple-500/15 text-purple-400 border-purple-500/20",
    AR: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    WK: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <Zap className="h-5 w-5 text-[hsl(var(--neon-red))]" />
            Live Scoring
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Update player fantasy points during live matches
          </p>
        </div>
      </div>

      {/* Match Selector */}
      <Card className="glass-card p-4">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Select Match</label>
        <Select value={selectedMatchId} onValueChange={setSelectedMatchId}>
          <SelectTrigger className="mt-2">
            <SelectValue placeholder="Choose a live or completed match" />
          </SelectTrigger>
          <SelectContent>
            {liveMatches.map((m: any) => (
              <SelectItem key={m.id} value={m.id}>
                <span className="flex items-center gap-2">
                  {m.status === "live" && <span className="h-2 w-2 rounded-full bg-[hsl(var(--neon-red))] animate-pulse" />}
                  {m.team1_short} vs {m.team2_short} — {m.league}
                  <Badge variant="outline" className="text-[9px] ml-1">{m.status}</Badge>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Card>

      {selectedMatchId && (
        <>
          {/* Info bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {selectedMatch?.status === "live" && (
                <Badge className="bg-[hsl(var(--neon-red)/0.15)] text-[hsl(var(--neon-red))] border-[hsl(var(--neon-red)/0.25)] text-[10px] font-bold gap-1 animate-pulse">
                  <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--neon-red))]" /> LIVE
                </Badge>
              )}
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Users className="h-3 w-3" /> {teamCount} teams will be recalculated
              </span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Trophy className="h-3 w-3" /> {matchPlayers.length} players
              </span>
            </div>
            <Button
              onClick={() => savePoints.mutate()}
              disabled={savePoints.isPending}
              className="gap-1.5 rounded-xl"
              size="sm"
            >
              {savePoints.isPending ? (
                <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Saving...</>
              ) : (
                <><Save className="h-3.5 w-3.5" /> Save & Recalculate</>
              )}
            </Button>
          </div>

          {/* Players by team */}
          {loadingPlayers ? (
            <p className="text-sm text-muted-foreground">Loading players...</p>
          ) : Object.keys(groupedPlayers).length === 0 ? (
            <Card className="glass-card p-8 text-center">
              <p className="text-sm text-muted-foreground">No players in this match lineup. Add players from the Matches page first.</p>
            </Card>
          ) : (
            Object.entries(groupedPlayers).map(([team, players]: [string, any[]]) => (
              <motion.div
                key={team}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="glass-card overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-border/20 flex items-center justify-between"
                    style={{ background: "hsl(228 16% 10% / 0.6)" }}>
                    <span className="text-xs font-bold uppercase tracking-wider">{team}</span>
                    <span className="text-[10px] text-muted-foreground">{players.length} players</span>
                  </div>
                  <div className="divide-y divide-border/10">
                    {players.map((mp: any) => {
                      const role = mp.players?.role;
                      // Role-specific quick presets
                      const presets = [
                        { label: "Run", value: 1, color: "bg-secondary/60 hover:bg-secondary" },
                        { label: "4s", value: 4, color: "bg-blue-500/15 hover:bg-blue-500/30 text-blue-400" },
                        { label: "6s", value: 6, color: "bg-purple-500/15 hover:bg-purple-500/30 text-purple-400" },
                        { label: "W", value: 25, color: "bg-[hsl(var(--neon-red)/0.15)] hover:bg-[hsl(var(--neon-red)/0.3)] text-[hsl(var(--neon-red))]" },
                        { label: "Catch", value: 8, color: "bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-400" },
                        ...(role === "BOWL" || role === "AR" ? [
                          { label: "Maiden", value: 12, color: "bg-amber-500/15 hover:bg-amber-500/30 text-amber-400" },
                        ] : []),
                        ...(role === "BAT" || role === "AR" ? [
                          { label: "50", value: 50, color: "bg-[hsl(var(--gold)/0.15)] hover:bg-[hsl(var(--gold)/0.3)] text-[hsl(var(--gold))]" },
                          { label: "100", value: 100, color: "bg-[hsl(var(--neon-green)/0.15)] hover:bg-[hsl(var(--neon-green)/0.3)] text-[hsl(var(--neon-green))]" },
                        ] : []),
                        ...(role === "WK" ? [
                          { label: "Stumping", value: 12, color: "bg-amber-500/15 hover:bg-amber-500/30 text-amber-400" },
                        ] : []),
                      ];

                      const addPoints = (val: number) => {
                        setPoints(prev => ({
                          ...prev,
                          [mp.id]: String(parseFloat(prev[mp.id] || "0") + val),
                        }));
                      };

                      return (
                        <div key={mp.id} className="px-4 py-3 hover:bg-secondary/20 transition-colors space-y-2">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-secondary/50 flex items-center justify-center overflow-hidden shrink-0">
                              {mp.players?.photo_url ? (
                                <img src={mp.players.photo_url} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <span className="text-xs font-bold text-muted-foreground">
                                  {mp.players?.name?.charAt(0) || "?"}
                                </span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold truncate">{mp.players?.name}</p>
                              <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0", roleColors[mp.players?.role] || "")}>
                                {mp.players?.role}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => setPoints(prev => ({ ...prev, [mp.id]: "0" }))}
                                className="h-7 w-7 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive text-xs font-bold flex items-center justify-center transition-colors"
                                title="Reset"
                              >
                                ↺
                              </button>
                              <Input
                                type="number"
                                value={points[mp.id] || "0"}
                                onChange={(e) => setPoints(prev => ({ ...prev, [mp.id]: e.target.value }))}
                                className="w-20 h-8 text-center font-display font-bold text-sm"
                                step="0.5"
                              />
                              <span className="text-[10px] text-muted-foreground w-6">pts</span>
                            </div>
                          </div>
                          {/* Quick preset buttons */}
                          <div className="flex flex-wrap gap-1.5 pl-12">
                            {presets.map((p) => (
                              <button
                                key={p.label}
                                onClick={() => addPoints(p.value)}
                                className={cn(
                                  "px-2 py-1 rounded-lg text-[10px] font-bold border border-border/20 transition-all active:scale-95",
                                  p.color
                                )}
                              >
                                +{p.value} {p.label}
                              </button>
                            ))}
                            <button
                              onClick={() => addPoints(-1)}
                              className="px-2 py-1 rounded-lg text-[10px] font-bold border border-border/20 bg-destructive/10 hover:bg-destructive/20 text-destructive transition-all active:scale-95"
                            >
                              −1
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </motion.div>
            ))
          )}

          {/* Floating save button for mobile */}
          {matchPlayers.length > 0 && (
            <div className="fixed bottom-6 right-6 z-50">
              <Button
                onClick={() => savePoints.mutate()}
                disabled={savePoints.isPending}
                size="lg"
                className="rounded-2xl shadow-2xl gap-2 gradient-primary"
              >
                {savePoints.isPending ? (
                  <><RefreshCw className="h-4 w-4 animate-spin" /> Saving...</>
                ) : (
                  <><Save className="h-4 w-4" /> Save & Recalculate</>
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminLiveScoring;
