import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff, Clock, Activity, Server } from "lucide-react";
import { motion } from "framer-motion";

interface HealthEntry {
  id: string;
  match_id: string;
  provider: string;
  status: string;
  response_time_ms: number;
  error_message: string | null;
  created_at: string;
}

interface MatchInfo {
  id: string;
  team1_short: string;
  team2_short: string;
  status: string;
}

const PROVIDERS = ["CricketData", "CricAPI-Backup", "SportMonks"];

const ApiHealthWidget = () => {
  // Get live matches
  const { data: liveMatches = [] } = useQuery({
    queryKey: ["admin-live-matches-health"],
    queryFn: async () => {
      const { data } = await (supabase.from("matches") as any)
        .select("id, team1_short, team2_short, status")
        .eq("status", "live");
      return (data ?? []) as MatchInfo[];
    },
    refetchInterval: 15000,
  });

  // Get recent API health logs
  const { data: healthLogs = [] } = useQuery({
    queryKey: ["admin-api-health-logs"],
    queryFn: async () => {
      const { data } = await (supabase.from("api_health_log") as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      return (data ?? []) as HealthEntry[];
    },
    refetchInterval: 15000,
  });

  // Compute per-match latest provider info
  const matchHealth = liveMatches.map((match) => {
    const logs = healthLogs.filter((l) => l.match_id === match.id);
    const latest = logs[0];
    const successRate = logs.length > 0
      ? Math.round((logs.filter((l) => l.status === "success").length / logs.length) * 100)
      : 0;
    const avgResponseTime = logs.length > 0
      ? Math.round(logs.reduce((s, l) => s + (l.response_time_ms || 0), 0) / logs.length)
      : 0;
    return { match, latest, successRate, avgResponseTime, logCount: logs.length };
  });

  // Overall provider stats
  const providerStats = PROVIDERS.map((name) => {
    const logs = healthLogs.filter((l) => l.provider === name);
    const successes = logs.filter((l) => l.status === "success").length;
    const total = logs.length;
    return {
      name,
      total,
      successes,
      rate: total > 0 ? Math.round((successes / total) * 100) : null,
      avgMs: total > 0 ? Math.round(logs.reduce((s, l) => s + (l.response_time_ms || 0), 0) / total) : null,
    };
  });

  const getStatusColor = (status?: string) => {
    if (status === "success") return "text-emerald-400";
    if (status === "failed") return "text-destructive";
    return "text-muted-foreground";
  };

  const getStatusBg = (rate: number | null) => {
    if (rate === null) return "bg-muted/30";
    if (rate >= 90) return "bg-emerald-500/10 border-emerald-500/20";
    if (rate >= 50) return "bg-amber-500/10 border-amber-500/20";
    return "bg-destructive/10 border-destructive/20";
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <Card className="glass-card border-0">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-display tracking-wide flex items-center gap-2">
            <Server className="h-4 w-4 text-primary" />
            API Provider Health
            <Badge variant="outline" className="text-[9px] ml-auto animate-pulse border-emerald-500/50 text-emerald-400">
              LIVE
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Provider Overview */}
          <div className="grid grid-cols-3 gap-2">
            {providerStats.map((p) => (
              <div key={p.name} className={`rounded-lg border p-3 text-center ${getStatusBg(p.rate)}`}>
                <div className="flex items-center justify-center gap-1 mb-1">
                  {p.rate !== null && p.rate >= 50 ? (
                    <Wifi className="h-3 w-3 text-emerald-400" />
                  ) : p.rate !== null ? (
                    <WifiOff className="h-3 w-3 text-destructive" />
                  ) : (
                    <Wifi className="h-3 w-3 text-muted-foreground" />
                  )}
                </div>
                <p className="text-[10px] font-bold uppercase tracking-wider truncate">{p.name}</p>
                {p.rate !== null ? (
                  <>
                    <p className="text-lg font-display font-bold mt-1">{p.rate}%</p>
                    <p className="text-[9px] text-muted-foreground">{p.avgMs}ms avg</p>
                  </>
                ) : (
                  <p className="text-[10px] text-muted-foreground mt-2">No data</p>
                )}
              </div>
            ))}
          </div>

          {/* Per-Match Status */}
          {matchHealth.length > 0 ? (
            <div className="space-y-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                Live Match Providers
              </p>
              {matchHealth.map(({ match, latest, successRate, avgResponseTime, logCount }) => (
                <div
                  key={match.id}
                  className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg gradient-live flex items-center justify-center">
                      <Activity className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold">
                        {match.team1_short} vs {match.team2_short}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {latest ? (
                          <>
                            <Badge
                              variant="outline"
                              className={`text-[9px] h-4 ${getStatusColor(latest.status)}`}
                            >
                              {latest.provider}
                            </Badge>
                            <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                              <Clock className="h-2.5 w-2.5" />
                              {latest.response_time_ms}ms
                            </span>
                          </>
                        ) : (
                          <span className="text-[9px] text-muted-foreground">Awaiting first poll...</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${successRate >= 80 ? "text-emerald-400" : successRate >= 50 ? "text-amber-400" : "text-destructive"}`}>
                      {successRate}%
                    </p>
                    <p className="text-[9px] text-muted-foreground">{logCount} polls</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-xs text-muted-foreground">No live matches — health data appears during live scoring</p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ApiHealthWidget;
