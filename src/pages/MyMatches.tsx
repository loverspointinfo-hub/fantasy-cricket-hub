import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trophy, Gamepad2, Clock, Users, Timer, Crown, Star, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { staggerContainer, item } from "@/lib/animations";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatIST } from "@/lib/date-utils";
import { useCountdown } from "@/hooks/useCountdown";
import { Skeleton } from "@/components/ui/skeleton";

interface JoinedMatch {
  id: string;
  team1_name: string;
  team2_name: string;
  team1_short: string;
  team2_short: string;
  team1_color: string;
  team2_color: string;
  league: string;
  match_time: string;
  entry_deadline: string;
  status: string;
  venue: string | null;
  teams_count: number;
  contests_count: number;
}

const useMyJoinedMatches = () => {
  return useQuery({
    queryKey: ["my-joined-matches"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Get user's teams grouped by match
      const { data: teams, error: tErr } = await (supabase
        .from("user_teams" as any) as any)
        .select("match_id")
        .eq("user_id", user.id);
      if (tErr) throw tErr;
      if (!teams?.length) return [];

      const matchIds = [...new Set(teams.map((t: any) => t.match_id))];

      // Get match details
      const { data: matches, error: mErr } = await (supabase
        .from("matches" as any) as any)
        .select("*")
        .in("id", matchIds)
        .order("match_time", { ascending: false });
      if (mErr) throw mErr;

      // Get contest entries count per match
      const { data: entries } = await (supabase
        .from("contest_entries" as any) as any)
        .select("contest_id, contests!contest_entries_contest_id_fkey(match_id)")
        .eq("user_id", user.id);

      // Count teams and contests per match
      const teamsPerMatch: Record<string, number> = {};
      const contestsPerMatch: Record<string, Set<string>> = {};

      teams.forEach((t: any) => {
        teamsPerMatch[t.match_id] = (teamsPerMatch[t.match_id] || 0) + 1;
      });

      entries?.forEach((e: any) => {
        const mid = e.contests?.match_id;
        if (mid) {
          if (!contestsPerMatch[mid]) contestsPerMatch[mid] = new Set();
          contestsPerMatch[mid].add(e.contest_id);
        }
      });

      return (matches || []).map((m: any) => ({
        ...m,
        teams_count: teamsPerMatch[m.id] || 0,
        contests_count: contestsPerMatch[m.id]?.size || 0,
      })) as JoinedMatch[];
    },
    refetchInterval: 30_000,
  });
};

type TabKey = "upcoming" | "live" | "completed";

const MatchEntryCard = ({ match }: { match: JoinedMatch }) => {
  const navigate = useNavigate();
  const countdown = useCountdown(match.entry_deadline);
  const isLive = match.status === "live";

  return (
    <motion.div
      variants={item}
      className="group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-500 hover:-translate-y-0.5"
      onClick={() => navigate(`/match/${match.id}`)}
      style={{
        background: "linear-gradient(145deg, hsl(228 16% 10% / 0.9), hsl(228 20% 6% / 0.8))",
        border: `1px solid ${isLive ? "hsl(var(--neon-red) / 0.2)" : "hsl(228 12% 18% / 0.5)"}`,
        boxShadow: isLive
          ? "0 8px 32px hsl(var(--neon-red) / 0.06)"
          : "0 8px 32px hsl(228 18% 3% / 0.4)",
      }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <span className="text-[10px] text-muted-foreground/70 font-semibold uppercase tracking-[0.15em]">{match.league}</span>
        {isLive && (
          <Badge className="bg-[hsl(var(--neon-red)/0.12)] text-[hsl(var(--neon-red))] border-[hsl(var(--neon-red)/0.2)] text-[9px] font-bold uppercase gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--neon-red))] animate-pulse" /> Live
          </Badge>
        )}
        {match.status === "completed" && (
          <Badge className="bg-muted/50 text-muted-foreground border-border/30 text-[9px] font-bold uppercase">Completed</Badge>
        )}
        {match.status === "upcoming" && !countdown.isExpired && (
          <div className="flex items-center gap-1 rounded-lg px-2 py-1 text-[9px] font-bold text-primary bg-primary/5"
            style={{ border: "1px solid hsl(var(--primary) / 0.12)" }}>
            <Timer className="h-2.5 w-2.5" />
            <span className="font-display tracking-wide">{countdown.label}</span>
          </div>
        )}
      </div>

      {/* Teams */}
      <div className="flex items-center justify-between px-4 py-2.5">
        <div className="flex items-center gap-2.5 flex-1">
          <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br text-[9px] font-bold font-display text-white shadow-lg", match.team1_color)}>
            {match.team1_short}
          </div>
          <span className="text-sm font-bold truncate">{match.team1_name}</span>
        </div>
        <div className="mx-2 text-[8px] font-bold text-muted-foreground/40">VS</div>
        <div className="flex items-center gap-2.5 flex-1 justify-end">
          <span className="text-sm font-bold truncate">{match.team2_name}</span>
          <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br text-[9px] font-bold font-display text-white shadow-lg", match.team2_color)}>
            {match.team2_short}
          </div>
        </div>
      </div>

      {/* Stats footer */}
      <div className="flex items-center justify-between border-t border-border/10 px-4 py-2.5"
        style={{ background: "hsl(228 16% 6% / 0.4)" }}>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-bold text-primary bg-primary/10 border border-primary/15">
            <Users className="h-3 w-3" /> {match.teams_count} Team{match.teams_count !== 1 ? "s" : ""}
          </span>
          {match.contests_count > 0 && (
            <span className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-bold text-[hsl(var(--gold))] bg-[hsl(var(--gold)/0.1)] border border-[hsl(var(--gold)/0.15)]">
              <Trophy className="h-3 w-3" /> {match.contests_count} Contest{match.contests_count !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-primary text-[11px] font-bold group-hover:gap-2 transition-all">
          View <ChevronRight className="h-3.5 w-3.5" />
        </div>
      </div>
    </motion.div>
  );
};

const MyMatches = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>("upcoming");
  const { data: matches = [], isLoading } = useMyJoinedMatches();

  const filtered = matches.filter(m => {
    if (activeTab === "live") return m.status === "live";
    if (activeTab === "completed") return m.status === "completed";
    return m.status === "upcoming";
  });

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "upcoming", label: "Upcoming", count: matches.filter(m => m.status === "upcoming").length },
    { key: "live", label: "Live", count: matches.filter(m => m.status === "live").length },
    { key: "completed", label: "Completed", count: matches.filter(m => m.status === "completed").length },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none gradient-mesh opacity-50" />
      <div className="floating-orb w-64 h-64 bg-[hsl(var(--neon-green))] -top-10 -left-10" />
      <div className="floating-orb w-48 h-48 bg-[hsl(var(--neon-cyan))] bottom-40 right-0" style={{ animationDelay: "3s" }} />

      <header className="sticky top-0 z-40 border-b border-border/30" style={{
        background: "linear-gradient(180deg, hsl(228 18% 5% / 0.95), hsl(228 18% 5% / 0.8))",
        backdropFilter: "blur(20px)",
      }}>
        <div className="mx-auto max-w-lg px-4 py-3">
          <h1 className="font-display text-xl font-bold">My Matches</h1>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 py-5 space-y-4 relative z-10">
        {/* Tabs */}
        <div className="flex gap-1 rounded-2xl p-1"
          style={{
            background: "hsl(228 16% 8% / 0.8)",
            border: "1px solid hsl(228 12% 16% / 0.5)",
          }}>
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "relative flex-1 flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all",
                activeTab !== tab.key && "text-muted-foreground/50 hover:text-muted-foreground"
              )}
            >
              {activeTab === tab.key && (
                <motion.div
                  layoutId="my-tab-active"
                  className="absolute inset-0 rounded-xl"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  style={{
                    background: "linear-gradient(135deg, hsl(152 100% 50% / 0.1), hsl(195 100% 55% / 0.06))",
                    border: "1px solid hsl(152 100% 50% / 0.2)",
                  }}
                />
              )}
              {tab.key === "live" && tab.count > 0 && (
                <span className="inline-block h-2 w-2 rounded-full bg-[hsl(var(--neon-red))] animate-pulse" />
              )}
              <span className={cn("relative z-10 transition-colors", activeTab === tab.key && "text-primary")}>
                {tab.label}
              </span>
              {tab.count > 0 && (
                <span className={cn(
                  "relative z-10 text-[9px] font-bold rounded-full h-4 min-w-[16px] flex items-center justify-center px-1",
                  activeTab === tab.key ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"
                )}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Match List */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="space-y-3"
          >
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="rounded-2xl overflow-hidden" style={{
                    background: "linear-gradient(145deg, hsl(228 16% 10% / 0.9), hsl(228 20% 6% / 0.8))",
                    border: "1px solid hsl(228 12% 18% / 0.4)",
                  }}>
                    <div className="px-4 pt-3 pb-2 flex justify-between">
                      <Skeleton className="h-3 w-16 rounded" />
                      <Skeleton className="h-5 w-20 rounded-full" />
                    </div>
                    <div className="flex items-center justify-between px-4 py-3">
                      <Skeleton className="h-11 w-11 rounded-xl" />
                      <Skeleton className="h-4 w-20 rounded" />
                      <Skeleton className="h-11 w-11 rounded-xl" />
                    </div>
                    <div className="border-t border-border/10 px-4 py-2.5 flex justify-between">
                      <Skeleton className="h-3 w-24 rounded" />
                      <Skeleton className="h-3 w-12 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <motion.div variants={item} className="glass-card flex flex-col items-center py-16 text-muted-foreground">
                <div className="h-16 w-16 rounded-2xl bg-secondary/60 flex items-center justify-center mb-4">
                  <Gamepad2 className="h-7 w-7 opacity-30" />
                </div>
                <p className="text-sm font-semibold text-foreground/70">No {activeTab} matches</p>
                <p className="text-xs text-muted-foreground/50 mt-1 text-center max-w-[200px]">
                  {activeTab === "upcoming"
                    ? "Join a contest to see your matches here"
                    : "Your matches will appear here"}
                </p>
                {activeTab === "upcoming" && (
                  <Button
                    onClick={() => navigate("/")}
                    className="gradient-primary font-bold rounded-xl px-8 h-11 mt-5"
                  >
                    <Trophy className="h-4 w-4 mr-2" /> Browse Matches
                  </Button>
                )}
              </motion.div>
            ) : (
              filtered.map(match => <MatchEntryCard key={match.id} match={match} />)
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default MyMatches;
