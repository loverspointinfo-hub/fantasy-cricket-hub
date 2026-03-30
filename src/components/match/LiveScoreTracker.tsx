import { useEffect, useState } from "react";
import { Radio, TrendingUp, Award } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

interface LiveScoreTrackerProps {
  matchId: string;
  team1Short: string;
  team2Short: string;
}

interface PlayerPointUpdate {
  player_id: string;
  player_name: string;
  player_team: string;
  fantasy_points: number;
}

const LiveScoreTracker = ({ matchId, team1Short, team2Short }: LiveScoreTrackerProps) => {
  const [topPlayers, setTopPlayers] = useState<PlayerPointUpdate[]>([]);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  const fetchTopPlayers = async () => {
    const { data, error } = await (supabase
      .from("match_players" as any) as any)
      .select("player_id, fantasy_points, player:players(name, team)")
      .eq("match_id", matchId)
      .order("fantasy_points", { ascending: false })
      .limit(5);

    if (!error && data) {
      setTopPlayers(data.map((d: any) => ({
        player_id: d.player_id,
        player_name: d.player?.name || "Unknown",
        player_team: d.player?.team || "",
        fantasy_points: d.fantasy_points || 0,
      })));
      setLastUpdate(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }));
    }
  };

  useEffect(() => {
    fetchTopPlayers();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`live-scores-${matchId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "match_players", filter: `match_id=eq.${matchId}` },
        () => { fetchTopPlayers(); }
      )
      .subscribe();

    // Also poll every 30 seconds
    const interval = setInterval(fetchTopPlayers, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [matchId]);

  if (topPlayers.length === 0 || topPlayers.every(p => p.fantasy_points === 0)) return null;

  return (
    <div className="rounded-2xl overflow-hidden border border-border/20" style={{ background: "hsl(228 16% 9%)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/10" style={{ background: "hsl(228 16% 7%)" }}>
        <div className="flex items-center gap-2">
          <Radio className="h-3.5 w-3.5 text-[hsl(var(--neon-red))] animate-pulse" />
          <span className="text-xs font-bold text-foreground">Live Fantasy Points</span>
        </div>
        {lastUpdate && (
          <span className="text-[9px] text-muted-foreground">Updated {lastUpdate}</span>
        )}
      </div>

      {/* Top scorers */}
      <div className="px-4 py-2 space-y-1">
        <AnimatePresence>
          {topPlayers.map((player, i) => (
            <motion.div
              key={player.player_id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 py-1.5"
            >
              <span className={cn(
                "h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0",
                i === 0 ? "bg-[hsl(var(--gold)/0.2)] text-[hsl(var(--gold))]"
                  : i === 1 ? "bg-primary/10 text-primary"
                  : "bg-secondary text-muted-foreground"
              )}>
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate">{player.player_name}</p>
                <p className="text-[9px] text-muted-foreground">{player.player_team}</p>
              </div>
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-primary" />
                <span className={cn(
                  "text-sm font-display font-bold tabular-nums",
                  player.fantasy_points > 0 ? "text-primary" : "text-muted-foreground"
                )}>
                  {player.fantasy_points}
                </span>
                <span className="text-[9px] text-muted-foreground">pts</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default LiveScoreTracker;
