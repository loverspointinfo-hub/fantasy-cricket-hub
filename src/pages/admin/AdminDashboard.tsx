import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Swords, Users, Trophy, Wallet, TrendingUp, Activity } from "lucide-react";
import { Card } from "@/components/ui/card";

const StatCard = ({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) => (
  <Card className="glass-card p-5 flex items-center gap-4">
    <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${color}`}>
      <Icon className="h-6 w-6 text-primary-foreground" />
    </div>
    <div>
      <p className="text-2xl font-display font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  </Card>
);

const AdminDashboard = () => {
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [matches, players, contests, profiles, transactions] = await Promise.all([
        (supabase.from("matches") as any).select("id", { count: "exact", head: true }),
        (supabase.from("players") as any).select("id", { count: "exact", head: true }),
        (supabase.from("contests") as any).select("id", { count: "exact", head: true }),
        (supabase.from("profiles") as any).select("id", { count: "exact", head: true }),
        (supabase.from("transactions") as any).select("amount").eq("status", "completed"),
      ]);
      const totalVolume = (transactions.data ?? []).reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
      return {
        matches: matches.count ?? 0,
        players: players.count ?? 0,
        contests: contests.count ?? 0,
        users: profiles.count ?? 0,
        volume: totalVolume,
      };
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Overview</h1>
        <p className="text-sm text-muted-foreground">Key metrics at a glance</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={Swords} label="Total Matches" value={stats?.matches ?? 0} color="gradient-primary" />
        <StatCard icon={Users} label="Total Players" value={stats?.players ?? 0} color="gradient-purple" />
        <StatCard icon={Trophy} label="Total Contests" value={stats?.contests ?? 0} color="gradient-premium" />
        <StatCard icon={Activity} label="Registered Users" value={stats?.users ?? 0} color="gradient-live" />
        <StatCard icon={Wallet} label="Transaction Volume" value={`₹${(stats?.volume ?? 0).toLocaleString()}`} color="gradient-primary" />
        <StatCard icon={TrendingUp} label="Active Contests" value="-" color="gradient-purple" />
      </div>
    </div>
  );
};

export default AdminDashboard;
