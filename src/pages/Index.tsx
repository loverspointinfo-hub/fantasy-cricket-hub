import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, ChevronRight, Clock, Users, Star, Flame, Crown, Bell, Wallet, Timer } from "lucide-react";
import { useCountdown } from "@/hooks/useCountdown";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { staggerContainer, item } from "@/lib/animations";
import { useMatches, Match } from "@/hooks/useMatches";
import { useWallet } from "@/hooks/useWallet";
import { useUnreadCount } from "@/hooks/useNotifications";
import { format, isToday, isTomorrow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

const BANNERS = [
  { title: "MEGA CONTEST", subtitle: "₹25 Lakhs Prize Pool", desc: "Join the biggest contest of the season", gradient: "gradient-primary", icon: Crown },
  { title: "100% BONUS", subtitle: "On First Deposit", desc: "Use code WELCOME100", gradient: "gradient-premium", icon: Star },
  { title: "WINNER TAKES ALL", subtitle: "₹1 Lakh Direct Win", desc: "Head-to-head showdown", gradient: "gradient-purple", icon: Flame },
];

const formatMatchTime = (dateStr: string) => {
  const d = new Date(dateStr);
  if (isToday(d)) return `Today, ${format(d, "h:mm a")}`;
  if (isTomorrow(d)) return `Tomorrow, ${format(d, "h:mm a")}`;
  return format(d, "dd MMM, h:mm a");
};

const MatchCard = ({ match }: { match: Match }) => {
  const navigate = useNavigate();
  const countdown = useCountdown(match.match_time);
  const isUrgent = !countdown.isExpired && countdown.days === 0 && countdown.hours === 0;
  return (
    <motion.div
      variants={item}
      className="group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-500 hover:-translate-y-0.5"
      onClick={() => navigate(`/match/${match.id}`)}
      style={{
        background: "linear-gradient(145deg, hsl(228 16% 10% / 0.9), hsl(228 20% 6% / 0.8))",
        border: "1px solid hsl(228 12% 18% / 0.5)",
        boxShadow: "0 8px 32px hsl(228 18% 3% / 0.4), 0 0 0 0.5px hsl(0 0% 100% / 0.03) inset",
      }}
      whileHover={{
        boxShadow: "0 12px 40px hsl(152 100% 50% / 0.06), 0 0 0 1px hsl(152 100% 50% / 0.12)",
      }}
    >
      {/* Top accent */}
      <div className="absolute top-0 left-0 right-0 h-[1px] opacity-40 group-hover:opacity-80 transition-opacity"
        style={{ background: "linear-gradient(90deg, transparent, hsl(var(--primary)), hsl(var(--accent)), transparent)" }}
      />

      <div className="flex items-center justify-between px-4 pt-3.5 pb-1.5">
        <span className="text-[10px] text-muted-foreground/70 font-semibold uppercase tracking-[0.15em]">{match.league}</span>
        {match.status === "live" && (
          <Badge className="bg-[hsl(var(--neon-red)/0.12)] text-[hsl(var(--neon-red))] border-[hsl(var(--neon-red)/0.2)] text-[9px] font-bold uppercase gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--neon-red))] animate-pulse" /> Live
          </Badge>
        )}
        {match.status === "upcoming" && !countdown.isExpired && (
          <div className={cn(
            "flex items-center gap-1 rounded-lg px-2 py-1 text-[9px] font-bold",
            isUrgent ? "text-[hsl(var(--neon-red))] bg-[hsl(var(--neon-red)/0.08)]" : "text-primary bg-primary/5"
          )}
            style={{ border: `1px solid ${isUrgent ? "hsl(var(--neon-red) / 0.15)" : "hsl(var(--primary) / 0.12)"}` }}
          >
            <Timer className={cn("h-2.5 w-2.5", isUrgent && "animate-pulse")} />
            <span className="font-display tracking-wide">{countdown.label}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3 flex-1">
          <div className={cn(
            "flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br text-[10px] font-bold font-display text-white shadow-lg",
            match.team1_color
          )}>
            {match.team1_short}
          </div>
          <span className="text-sm font-bold">{match.team1_name}</span>
        </div>
        <div className="flex flex-col items-center mx-2">
          <div className="h-8 w-8 rounded-full flex items-center justify-center"
            style={{ background: "hsl(228 16% 12%)", border: "1px solid hsl(228 12% 18%)" }}
          >
            <span className="text-[8px] font-bold text-muted-foreground/60 tracking-wider">VS</span>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-1 justify-end">
          <span className="text-sm font-bold">{match.team2_name}</span>
          <div className={cn(
            "flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br text-[10px] font-bold font-display text-white shadow-lg",
            match.team2_color
          )}>
            {match.team2_short}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-border/10 px-4 py-2.5"
        style={{ background: "hsl(228 16% 6% / 0.4)" }}
      >
        <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60">
          <Users className="h-3 w-3" /> {match.venue || "TBD"}
        </span>
        <div className="flex items-center gap-1 text-primary text-[11px] font-bold group-hover:gap-2 transition-all">
          View <ChevronRight className="h-3.5 w-3.5" />
        </div>
      </div>
    </motion.div>
  );
};

const MatchCardSkeleton = () => (
  <div className="rounded-2xl overflow-hidden"
    style={{
      background: "linear-gradient(145deg, hsl(228 16% 10% / 0.9), hsl(228 20% 6% / 0.8))",
      border: "1px solid hsl(228 12% 18% / 0.4)",
    }}
  >
    <div className="px-4 pt-3.5 pb-1.5 flex justify-between">
      <Skeleton className="h-3 w-16 rounded" />
      <Skeleton className="h-5 w-24 rounded-full" />
    </div>
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-3 flex-1">
        <Skeleton className="h-12 w-12 rounded-xl" />
        <Skeleton className="h-4 w-20 rounded" />
      </div>
      <Skeleton className="h-8 w-8 rounded-full mx-2" />
      <div className="flex items-center gap-3 flex-1 justify-end">
        <Skeleton className="h-4 w-20 rounded" />
        <Skeleton className="h-12 w-12 rounded-xl" />
      </div>
    </div>
    <div className="border-t border-border/10 px-4 py-2.5 flex justify-between">
      <Skeleton className="h-3 w-24 rounded" />
      <Skeleton className="h-3 w-12 rounded" />
    </div>
  </div>
);

type TabKey = "upcoming" | "live" | "completed";

const Index = () => {
  const [activeTab, setActiveTab] = useState<TabKey>("upcoming");
  const { data: matches = [], isLoading } = useMatches(activeTab);
  const { data: liveMatches = [] } = useMatches("live");
  const { data: wallet } = useWallet();
  const navigate = useNavigate();

  const totalBalance = (wallet?.deposit_balance ?? 0) + (wallet?.winning_balance ?? 0) + (wallet?.bonus_balance ?? 0);
  const unreadCount = useUnreadCount();

  const tabs: { key: TabKey; label: string }[] = [
    { key: "upcoming", label: "Upcoming" },
    { key: "live", label: "Live" },
    { key: "completed", label: "Completed" },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden bg-background">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none gradient-mesh opacity-50" />
      <div className="floating-orb w-72 h-72 bg-[hsl(var(--neon-green))] -top-20 -left-20" />
      <div className="floating-orb w-96 h-96 bg-[hsl(var(--neon-cyan))] top-1/3 -right-32" style={{ animationDelay: "3s" }} />
      <div className="floating-orb w-64 h-64 bg-[hsl(var(--neon-purple))] bottom-20 left-10" style={{ animationDelay: "5s" }} />

      {/* ─── Header ─── */}
      <header className="sticky top-0 z-40 relative"
        style={{
          background: "linear-gradient(180deg, hsl(228 18% 5% / 0.97), hsl(228 18% 5% / 0.88))",
          backdropFilter: "blur(24px) saturate(1.8)",
        }}
      >
        {/* Bottom border with gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-[1px]"
          style={{ background: "linear-gradient(90deg, transparent, hsl(228 12% 18% / 0.6), hsl(152 100% 50% / 0.15), hsl(228 12% 18% / 0.6), transparent)" }}
        />

        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl relative overflow-hidden"
                style={{
                  background: "linear-gradient(135deg, hsl(152 100% 50%), hsl(195 100% 55%))",
                  boxShadow: "0 2px 12px hsl(152 100% 50% / 0.3)",
                }}
              >
                <span className="shimmer absolute inset-0" />
                <Trophy className="h-5 w-5 text-primary-foreground relative z-10" />
              </div>
              {liveMatches.length > 0 && (
                <div className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-[hsl(var(--neon-red))] border-2 border-background animate-pulse" />
              )}
            </div>
            <div>
              <h1 className="font-display text-xl font-bold leading-none tracking-tight">
                FANTASY<span className="text-gradient">11</span>
              </h1>
              <p className="text-[8px] text-muted-foreground/50 tracking-[0.25em] uppercase font-medium mt-0.5">
                Play • Predict • Win
              </p>
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            {/* Wallet chip */}
            <button
              onClick={() => navigate("/wallet")}
              className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 transition-all hover:scale-105 active:scale-95"
              style={{
                background: "linear-gradient(135deg, hsl(228 16% 12%), hsl(228 16% 9%))",
                border: "1px solid hsl(228 12% 18% / 0.6)",
              }}
            >
              <Wallet className="h-3.5 w-3.5 text-primary" />
              <span className="text-[11px] font-bold text-foreground">₹{totalBalance.toFixed(0)}</span>
            </button>

            {/* Notification bell */}
            <button
              onClick={() => navigate("/notifications")}
              className="relative h-9 w-9 rounded-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95"
              style={{
                background: "hsl(228 16% 11%)",
                border: "1px solid hsl(228 12% 18% / 0.5)",
              }}
            >
              <Bell className="h-4 w-4 text-muted-foreground" />
              {unreadCount > 0 && (
                <div className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] rounded-full flex items-center justify-center px-1"
                  style={{
                    background: "linear-gradient(135deg, hsl(var(--neon-red)), hsl(var(--neon-orange)))",
                    boxShadow: "0 0 8px hsl(var(--neon-red) / 0.5)",
                    fontSize: "9px",
                    fontWeight: 700,
                    color: "white",
                  }}
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </div>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ─── Content ─── */}
      <div className="mx-auto max-w-lg px-4 py-5 space-y-5 relative z-10">
        {/* Banners */}
        <motion.div
          className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide snap-x snap-mandatory"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          {BANNERS.map((b, i) => (
            <motion.div
              key={i}
              className={cn(
                "relative min-w-[280px] rounded-2xl p-5 flex-shrink-0 overflow-hidden snap-start",
                b.gradient
              )}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="shimmer absolute inset-0 rounded-2xl" />
              <b.icon className="absolute top-4 right-4 h-16 w-16 opacity-10 text-primary-foreground" />
              <p className="font-display text-[10px] font-bold uppercase tracking-[0.2em] text-primary-foreground/60 relative z-10">{b.title}</p>
              <p className="mt-1.5 font-display text-xl font-bold text-primary-foreground relative z-10">{b.subtitle}</p>
              <p className="mt-0.5 text-[11px] text-primary-foreground/50 relative z-10">{b.desc}</p>
              <Button
                size="sm"
                className="mt-3 text-[11px] font-bold rounded-xl relative z-10 border-0 h-8 px-4"
                style={{
                  background: "hsl(0 0% 100% / 0.15)",
                  backdropFilter: "blur(8px)",
                  color: "white",
                }}
              >
                Join Now <ChevronRight className="h-3 w-3 ml-0.5" />
              </Button>
            </motion.div>
          ))}
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-2xl p-1 relative"
          style={{
            background: "hsl(228 16% 8% / 0.8)",
            border: "1px solid hsl(228 12% 16% / 0.5)",
          }}
        >
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
                  layoutId="tab-active"
                  className="absolute inset-0 rounded-xl"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  style={{
                    background: "linear-gradient(135deg, hsl(152 100% 50% / 0.1), hsl(195 100% 55% / 0.06))",
                    border: "1px solid hsl(152 100% 50% / 0.2)",
                    boxShadow: "0 0 16px hsl(152 100% 50% / 0.06)",
                  }}
                />
              )}
              {tab.key === "live" && (
                <span className={cn(
                  "inline-block h-2 w-2 rounded-full transition-all",
                  activeTab === "live"
                    ? "bg-[hsl(var(--neon-red))] shadow-[0_0_6px_hsl(var(--neon-red)/0.5)] animate-pulse"
                    : "bg-[hsl(var(--neon-red)/0.4)]"
                )} />
              )}
              <span className={cn(
                "relative z-10 transition-colors",
                activeTab === tab.key && "text-primary"
              )}>
                {tab.label}
              </span>
            </button>
          ))}
        </div>

        {/* Matches */}
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
                <MatchCardSkeleton />
                <MatchCardSkeleton />
                <MatchCardSkeleton />
              </div>
            ) : matches.length === 0 ? (
              <motion.div variants={item} className="glass-card flex flex-col items-center py-16 text-muted-foreground">
                <div className="h-16 w-16 rounded-2xl bg-secondary/60 flex items-center justify-center mb-4">
                  <Trophy className="h-7 w-7 opacity-30" />
                </div>
                <p className="text-sm font-semibold text-foreground/70">No {activeTab} matches</p>
                <p className="text-xs text-muted-foreground/50 mt-1">Check back soon!</p>
              </motion.div>
            ) : (
              matches.map(match => <MatchCard key={match.id} match={match} />)
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Index;