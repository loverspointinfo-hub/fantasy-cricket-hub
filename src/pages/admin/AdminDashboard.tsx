import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Swords, Users, Trophy, Wallet, TrendingUp, Activity,
  ArrowUpRight, ArrowDownRight, Clock, Zap, ChevronRight,
  BarChart3, PieChart as PieChartIcon
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const CHART_COLORS = [
  "hsl(152, 100%, 50%)",
  "hsl(195, 100%, 55%)",
  "hsl(270, 100%, 65%)",
  "hsl(42, 100%, 55%)",
  "hsl(0, 100%, 60%)",
];

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 },
};

const StatCard = ({
  icon: Icon,
  label,
  value,
  gradient,
  trend,
  trendLabel,
}: {
  icon: any;
  label: string;
  value: string | number;
  gradient: string;
  trend?: "up" | "down" | "neutral";
  trendLabel?: string;
}) => (
  <motion.div {...fadeUp}>
    <Card className="glass-card-hover border-0 overflow-hidden group relative">
      <div className={`absolute inset-0 opacity-[0.04] ${gradient}`} />
      <CardContent className="p-5 relative">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {label}
            </p>
            <p className="text-3xl font-display font-bold tracking-tight">{value}</p>
            {trendLabel && (
              <div className="flex items-center gap-1">
                {trend === "up" ? (
                  <ArrowUpRight className="h-3 w-3 text-primary" />
                ) : trend === "down" ? (
                  <ArrowDownRight className="h-3 w-3 text-destructive" />
                ) : null}
                <span
                  className={`text-[11px] font-medium ${
                    trend === "up"
                      ? "text-primary"
                      : trend === "down"
                      ? "text-destructive"
                      : "text-muted-foreground"
                  }`}
                >
                  {trendLabel}
                </span>
              </div>
            )}
          </div>
          <div
            className={`h-11 w-11 rounded-xl flex items-center justify-center ${gradient} shadow-lg`}
          >
            <Icon className="h-5 w-5 text-primary-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

const AdminDashboard = () => {
  const navigate = useNavigate();

  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [matches, players, contests, profiles, transactions, recentMatches] =
        await Promise.all([
          (supabase.from("matches") as any).select("id", {
            count: "exact",
            head: true,
          }),
          (supabase.from("players") as any).select("id", {
            count: "exact",
            head: true,
          }),
          (supabase.from("contests") as any).select("id", {
            count: "exact",
            head: true,
          }),
          (supabase.from("profiles") as any).select("id", {
            count: "exact",
            head: true,
          }),
          (supabase.from("transactions") as any)
            .select("amount, status, type, created_at")
            .eq("status", "completed"),
          (supabase.from("matches") as any)
            .select("status")
            .eq("status", "live"),
        ]);
      const totalVolume = (transactions.data ?? []).reduce(
        (s: number, t: any) => s + Number(t.amount || 0),
        0
      );
      const liveCount = recentMatches.data?.length ?? 0;
      return {
        matches: matches.count ?? 0,
        players: players.count ?? 0,
        contests: contests.count ?? 0,
        users: profiles.count ?? 0,
        volume: totalVolume,
        liveMatches: liveCount,
      };
    },
  });

  const { data: recentTransactions = [] } = useQuery({
    queryKey: ["admin-recent-txns"],
    queryFn: async () => {
      const { data } = await (supabase.from("transactions") as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(8);
      return data ?? [];
    },
  });

  const { data: recentUsers = [] } = useQuery({
    queryKey: ["admin-recent-users"],
    queryFn: async () => {
      const { data } = await (supabase.from("profiles") as any)
        .select("id, username, full_name, created_at")
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  const { data: matchStatusData = [] } = useQuery({
    queryKey: ["admin-match-status-chart"],
    queryFn: async () => {
      const { data } = await (supabase.from("matches") as any).select("status");
      const counts: Record<string, number> = {};
      (data ?? []).forEach((m: any) => {
        counts[m.status || "upcoming"] = (counts[m.status || "upcoming"] || 0) + 1;
      });
      return Object.entries(counts).map(([name, value]) => ({ name, value }));
    },
  });

  const { data: txnChartData = [] } = useQuery({
    queryKey: ["admin-txn-chart"],
    queryFn: async () => {
      const { data } = await (supabase.from("transactions") as any)
        .select("amount, created_at, status")
        .eq("status", "completed")
        .order("created_at", { ascending: true })
        .limit(100);
      const grouped: Record<string, number> = {};
      (data ?? []).forEach((t: any) => {
        const day = format(new Date(t.created_at), "dd MMM");
        grouped[day] = (grouped[day] || 0) + Number(t.amount || 0);
      });
      return Object.entries(grouped)
        .slice(-7)
        .map(([date, amount]) => ({ date, amount }));
    },
  });

  const quickActions = [
    { label: "Create Match", icon: Swords, path: "/admin/matches", color: "gradient-primary" },
    { label: "Add Player", icon: Users, path: "/admin/players", color: "gradient-purple" },
    { label: "New Contest", icon: Trophy, path: "/admin/contests", color: "gradient-premium" },
    { label: "Send Notification", icon: Zap, path: "/admin/notifications", color: "gradient-live" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div {...fadeUp} className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Welcome back. Here's what's happening today.
          </p>
        </div>
        {(stats?.liveMatches ?? 0) > 0 && (
          <Badge className="gradient-live text-primary-foreground gap-1.5 px-3 py-1.5 text-xs font-semibold animate-pulse">
            <Activity className="h-3 w-3" />
            {stats?.liveMatches} Live
          </Badge>
        )}
      </motion.div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <StatCard
          icon={Swords}
          label="Total Matches"
          value={stats?.matches ?? 0}
          gradient="gradient-primary"
          trend="up"
          trendLabel="All time"
        />
        <StatCard
          icon={Users}
          label="Players"
          value={stats?.players ?? 0}
          gradient="gradient-purple"
          trend="neutral"
          trendLabel="Database"
        />
        <StatCard
          icon={Trophy}
          label="Contests"
          value={stats?.contests ?? 0}
          gradient="gradient-premium"
          trend="up"
          trendLabel="Active & completed"
        />
        <StatCard
          icon={Activity}
          label="Registered Users"
          value={stats?.users ?? 0}
          gradient="gradient-live"
          trend="up"
          trendLabel="Growing"
        />
        <StatCard
          icon={Wallet}
          label="Transaction Volume"
          value={`₹${((stats?.volume ?? 0) / 1000).toFixed(1)}K`}
          gradient="gradient-primary"
          trendLabel="Completed txns"
        />
        <StatCard
          icon={TrendingUp}
          label="Live Matches"
          value={stats?.liveMatches ?? 0}
          gradient="gradient-live"
          trendLabel="Right now"
        />
      </div>

      {/* Quick Actions */}
      <motion.div {...fadeUp}>
        <Card className="glass-card border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-display tracking-wide flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {quickActions.map((action) => (
                <Button
                  key={action.label}
                  variant="ghost"
                  className="glass-card h-auto py-4 flex flex-col items-center gap-2 hover:border-primary/20 transition-all"
                  onClick={() => navigate(action.path)}
                >
                  <div
                    className={`h-10 w-10 rounded-xl flex items-center justify-center ${action.color}`}
                  >
                    <action.icon className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <span className="text-xs font-medium">{action.label}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Transaction Area Chart */}
        <motion.div {...fadeUp} className="lg:col-span-3">
          <Card className="glass-card border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-display tracking-wide flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Transaction Volume (Last 7 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {txnChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={txnChartData}>
                    <defs>
                      <linearGradient id="colorAmt" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(152, 100%, 50%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(152, 100%, 50%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "hsl(220, 10%, 48%)", fontSize: 11 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "hsl(220, 10%, 48%)", fontSize: 11 }}
                      tickFormatter={(v) => `₹${v}`}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(228, 16%, 10%)",
                        border: "1px solid hsl(228, 12%, 18%)",
                        borderRadius: "12px",
                        fontSize: 12,
                        color: "hsl(210, 40%, 96%)",
                      }}
                      formatter={(value: number) => [`₹${value}`, "Volume"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="amount"
                      stroke="hsl(152, 100%, 50%)"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorAmt)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
                  No transaction data yet
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Match Status Pie Chart */}
        <motion.div {...fadeUp} className="lg:col-span-2">
          <Card className="glass-card border-0 h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-display tracking-wide flex items-center gap-2">
                <PieChartIcon className="h-4 w-4 text-accent" />
                Match Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {matchStatusData.length > 0 ? (
                <div className="flex items-center justify-center gap-6">
                  <ResponsiveContainer width={140} height={140}>
                    <PieChart>
                      <Pie
                        data={matchStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={65}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {matchStatusData.map((_: any, idx: number) => (
                          <Cell
                            key={idx}
                            fill={CHART_COLORS[idx % CHART_COLORS.length]}
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2">
                    {matchStatusData.map((entry: any, idx: number) => (
                      <div key={entry.name} className="flex items-center gap-2">
                        <div
                          className="h-2.5 w-2.5 rounded-full"
                          style={{
                            backgroundColor:
                              CHART_COLORS[idx % CHART_COLORS.length],
                          }}
                        />
                        <span className="text-xs text-muted-foreground capitalize">
                          {entry.name}
                        </span>
                        <span className="text-xs font-bold ml-auto">
                          {entry.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-[140px] flex items-center justify-center text-muted-foreground text-sm">
                  No matches yet
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Bottom Section: Recent Activity & Users */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Transactions */}
        <motion.div {...fadeUp}>
          <Card className="glass-card border-0">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-display tracking-wide flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-primary" />
                  Recent Transactions
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground h-7"
                  onClick={() => navigate("/admin/wallet")}
                >
                  View All <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              {recentTransactions.length === 0 && (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  No transactions yet
                </p>
              )}
              {recentTransactions.map((t: any) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                        t.type === "deposit" || t.type === "admin_credit"
                          ? "bg-primary/10"
                          : "bg-destructive/10"
                      }`}
                    >
                      {t.type === "deposit" || t.type === "admin_credit" ? (
                        <ArrowUpRight className="h-3.5 w-3.5 text-primary" />
                      ) : (
                        <ArrowDownRight className="h-3.5 w-3.5 text-destructive" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-semibold capitalize">
                        {t.type.replace("_", " ")}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {t.created_at
                          ? format(new Date(t.created_at), "dd MMM, h:mm a")
                          : ""}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold">₹{t.amount}</p>
                    <Badge
                      variant={
                        t.status === "completed"
                          ? "default"
                          : t.status === "pending"
                          ? "secondary"
                          : "destructive"
                      }
                      className="text-[9px] h-4"
                    >
                      {t.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Users */}
        <motion.div {...fadeUp}>
          <Card className="glass-card border-0">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-display tracking-wide flex items-center gap-2">
                  <Users className="h-4 w-4 text-accent" />
                  New Users
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground h-7"
                  onClick={() => navigate("/admin/users")}
                >
                  View All <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              {recentUsers.length === 0 && (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  No users yet
                </p>
              )}
              {recentUsers.map((u: any) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full gradient-purple flex items-center justify-center text-xs font-bold text-primary-foreground">
                      {(u.username || u.full_name || "U")
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-semibold">
                        {u.username || "No username"}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {u.full_name || "—"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span className="text-[10px]">
                      {u.created_at
                        ? format(new Date(u.created_at), "dd MMM")
                        : "—"}
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminDashboard;
