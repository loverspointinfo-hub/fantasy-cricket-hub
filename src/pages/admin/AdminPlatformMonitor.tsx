import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Users, Trophy, Wallet, Clock, ArrowUpDown } from "lucide-react";

const AdminPlatformMonitor = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["platform-monitor"],
    queryFn: async () => {
      const [
        { count: totalUsers },
        { count: liveMatches },
        { count: openContests },
        { count: pendingDeposits },
        { count: pendingWithdrawals },
        { data: recentSignups },
        { data: activeContests },
      ] = await Promise.all([
        (supabase.from("profiles") as any).select("*", { count: "exact", head: true }),
        (supabase.from("matches") as any).select("*", { count: "exact", head: true }).eq("status", "live"),
        (supabase.from("contests") as any).select("*", { count: "exact", head: true }).eq("status", "open"),
        (supabase.from("deposit_requests") as any).select("*", { count: "exact", head: true }).eq("status", "pending"),
        (supabase.from("withdrawal_requests") as any).select("*", { count: "exact", head: true }).eq("status", "pending"),
        (supabase.from("profiles") as any).select("id, username, created_at").order("created_at", { ascending: false }).limit(5),
        (supabase.from("contests") as any).select("id, name, current_entries, max_entries, entry_fee, prize_pool, type").eq("status", "open").order("current_entries", { ascending: false }).limit(10),
      ]);
      return {
        totalUsers: totalUsers || 0,
        liveMatches: liveMatches || 0,
        openContests: openContests || 0,
        pendingDeposits: pendingDeposits || 0,
        pendingWithdrawals: pendingWithdrawals || 0,
        recentSignups: recentSignups || [],
        activeContests: activeContests || [],
      };
    },
    refetchInterval: 15000, // Auto-refresh every 15s
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading monitor...</p>;

  const statCards = [
    { label: "Total Users", value: stats?.totalUsers, icon: Users, color: "text-blue-400" },
    { label: "Live Matches", value: stats?.liveMatches, icon: Activity, color: "text-emerald-400" },
    { label: "Open Contests", value: stats?.openContests, icon: Trophy, color: "text-amber-400" },
    { label: "Pending Deposits", value: stats?.pendingDeposits, icon: Wallet, color: "text-primary" },
    { label: "Pending Withdrawals", value: stats?.pendingWithdrawals, icon: ArrowUpDown, color: "text-rose-400" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Activity className="h-5 w-5 text-primary" />
        <h1 className="font-display text-2xl font-bold">Platform Monitor</h1>
        <Badge variant="outline" className="text-[10px] animate-pulse border-emerald-500 text-emerald-400">
          LIVE
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground">Auto-refreshes every 15 seconds</p>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {statCards.map((s) => (
          <Card key={s.label} className="glass-card p-4 text-center">
            <s.icon className={`h-5 w-5 mx-auto mb-2 ${s.color}`} />
            <p className="font-display text-2xl font-bold">{s.value}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Active Contests */}
      <Card className="glass-card p-5">
        <h3 className="font-display text-sm font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-400" />
          Active Contests
        </h3>
        <div className="space-y-2">
          {stats?.activeContests?.length === 0 && (
            <p className="text-xs text-muted-foreground">No active contests</p>
          )}
          {(stats?.activeContests as any[])?.map((c: any) => {
            const fillPct = c.max_entries > 0 ? Math.round((c.current_entries / c.max_entries) * 100) : 0;
            return (
              <div key={c.id} className="flex items-center justify-between py-2 border-b border-border/10 last:border-0">
                <div>
                  <p className="text-sm font-medium">{c.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    ₹{c.entry_fee} entry • ₹{c.prize_pool} pool • {c.type}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">{c.current_entries}/{c.max_entries}</p>
                  <div className="w-16 h-1.5 bg-muted rounded-full mt-1">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.min(fillPct, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Recent Signups */}
      <Card className="glass-card p-5">
        <h3 className="font-display text-sm font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
          <Clock className="h-4 w-4 text-blue-400" />
          Recent Signups
        </h3>
        <div className="space-y-2">
          {(stats?.recentSignups as any[])?.map((u: any) => (
            <div key={u.id} className="flex items-center justify-between py-1.5 border-b border-border/10 last:border-0">
              <p className="text-sm">{u.username || "—"}</p>
              <p className="text-[10px] text-muted-foreground">
                {new Date(u.created_at).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default AdminPlatformMonitor;
