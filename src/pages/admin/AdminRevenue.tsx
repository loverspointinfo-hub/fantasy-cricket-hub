import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Users, TrendingUp, Wallet, BarChart3, ArrowUpRight } from "lucide-react";
import { formatIST } from "@/lib/date-utils";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { motion } from "framer-motion";

const fadeUp = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4 } };

const AdminRevenue = () => {
  const { data: stats } = useQuery({
    queryKey: ["admin-revenue-stats"],
    queryFn: async () => {
      const [txns, profiles, deposits, contestEntries] = await Promise.all([
        (supabase.from("transactions") as any).select("amount, type, status, created_at").eq("status", "completed"),
        (supabase.from("profiles") as any).select("id, created_at"),
        (supabase.from("deposit_requests") as any).select("amount, status, created_at"),
        (supabase.from("contest_entries") as any).select("id, contest_id, created_at"),
      ]);

      const allTxns = txns.data || [];
      const allProfiles = profiles.data || [];
      const allDeposits = deposits.data || [];
      const allEntries = contestEntries.data || [];

      // Platform fees = total entry fees collected - total prize pool distributed
      const entryFees = allTxns.filter((t: any) => t.type === "contest_entry").reduce((s: number, t: any) => s + Number(t.amount), 0);
      const winnings = allTxns.filter((t: any) => t.type === "contest_winning").reduce((s: number, t: any) => s + Number(t.amount), 0);
      const platformFees = entryFees - winnings;

      const totalDeposits = allDeposits.filter((d: any) => d.status === "approved").reduce((s: number, d: any) => s + Number(d.amount), 0);
      const pendingDeposits = allDeposits.filter((d: any) => d.status === "pending").reduce((s: number, d: any) => s + Number(d.amount), 0);

      // Monthly deposit trends
      const depositTrend: Record<string, number> = {};
      allDeposits.filter((d: any) => d.status === "approved").forEach((d: any) => {
        if (d.created_at) {
          const key = formatIST(d.created_at, "dd MMM");
          depositTrend[key] = (depositTrend[key] || 0) + Number(d.amount);
        }
      });
      const depositChart = Object.entries(depositTrend).slice(-14).map(([date, amount]) => ({ date, amount }));

      // User growth by day
      const userGrowth: Record<string, number> = {};
      allProfiles.forEach((p: any) => {
        if (p.created_at) {
          const key = formatIST(p.created_at, "dd MMM");
          userGrowth[key] = (userGrowth[key] || 0) + 1;
        }
      });
      const userChart = Object.entries(userGrowth).slice(-14).map(([date, count]) => ({ date, count }));

      // Active users (joined at least 1 contest)
      const activeUserIds = new Set(allEntries.map((e: any) => e.user_id));

      return {
        platformFees, totalDeposits, pendingDeposits,
        totalUsers: allProfiles.length,
        activeUsers: activeUserIds.size,
        totalContestEntries: allEntries.length,
        entryFees, winnings,
        depositChart, userChart,
      };
    },
  });

  const statCards = [
    { label: "Platform Revenue", value: `₹${((stats?.platformFees ?? 0) / 1000).toFixed(1)}K`, icon: DollarSign, gradient: "gradient-primary", desc: "Entry fees - Prizes" },
    { label: "Total Deposits", value: `₹${((stats?.totalDeposits ?? 0) / 1000).toFixed(1)}K`, icon: Wallet, gradient: "gradient-premium", desc: "Approved deposits" },
    { label: "Total Users", value: stats?.totalUsers ?? 0, icon: Users, gradient: "gradient-purple", desc: `${stats?.activeUsers ?? 0} active` },
    { label: "Contest Entries", value: stats?.totalContestEntries ?? 0, icon: TrendingUp, gradient: "gradient-live", desc: "All time" },
  ];

  return (
    <div className="space-y-6">
      <motion.div {...fadeUp}>
        <h1 className="font-display text-3xl font-bold tracking-tight">Revenue Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Platform earnings, deposits, and user analytics</p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(s => (
          <motion.div key={s.label} {...fadeUp}>
            <Card className="glass-card-hover border-0 overflow-hidden relative">
              <div className={`absolute inset-0 opacity-[0.04] ${s.gradient}`} />
              <CardContent className="p-5 relative">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{s.label}</p>
                    <p className="text-3xl font-display font-bold tracking-tight">{s.value}</p>
                    <p className="text-[11px] text-muted-foreground">{s.desc}</p>
                  </div>
                  <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${s.gradient} shadow-lg`}>
                    <s.icon className="h-5 w-5 text-primary-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Revenue breakdown */}
      <motion.div {...fadeUp}>
        <Card className="glass-card border-0">
          <CardContent className="p-5">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Entry Fees Collected</p>
                <p className="font-display text-xl font-bold text-primary">₹{stats?.entryFees ?? 0}</p>
              </div>
              <div className="border-x border-border/10">
                <p className="text-[10px] text-muted-foreground uppercase">Prizes Distributed</p>
                <p className="font-display text-xl font-bold text-[hsl(var(--neon-orange))]">₹{stats?.winnings ?? 0}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Pending Deposits</p>
                <p className="font-display text-xl font-bold text-[hsl(var(--gold))]">₹{stats?.pendingDeposits ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Deposit Trend */}
        <motion.div {...fadeUp}>
          <Card className="glass-card border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-display flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" /> Deposit Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(stats?.depositChart?.length ?? 0) > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={stats?.depositChart}>
                    <defs>
                      <linearGradient id="colorDeposit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(152, 100%, 50%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(152, 100%, 50%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "hsl(220, 10%, 48%)", fontSize: 10 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(220, 10%, 48%)", fontSize: 10 }} tickFormatter={(v) => `₹${v}`} />
                    <Tooltip contentStyle={{ background: "hsl(228, 16%, 10%)", border: "1px solid hsl(228, 12%, 18%)", borderRadius: "12px", fontSize: 11, color: "hsl(210, 40%, 96%)" }} />
                    <Area type="monotone" dataKey="amount" stroke="hsl(152, 100%, 50%)" strokeWidth={2} fillOpacity={1} fill="url(#colorDeposit)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">No deposit data</div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* User Growth */}
        <motion.div {...fadeUp}>
          <Card className="glass-card border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-display flex items-center gap-2">
                <Users className="h-4 w-4 text-accent" /> User Signups
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(stats?.userChart?.length ?? 0) > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={stats?.userChart}>
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "hsl(220, 10%, 48%)", fontSize: 10 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(220, 10%, 48%)", fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: "hsl(228, 16%, 10%)", border: "1px solid hsl(228, 12%, 18%)", borderRadius: "12px", fontSize: 11, color: "hsl(210, 40%, 96%)" }} />
                    <Bar dataKey="count" fill="hsl(270, 100%, 65%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">No user data</div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminRevenue;
