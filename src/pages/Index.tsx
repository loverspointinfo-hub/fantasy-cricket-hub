import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, ChevronRight, Users, Star, Flame, Crown, Bell, Wallet, Timer } from "lucide-react";
import { useCountdown } from "@/hooks/useCountdown";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { staggerContainer, item } from "@/lib/animations";
import { useMatches, Match } from "@/hooks/useMatches";
import { useMatchPlayerCounts } from "@/hooks/useMatchPlayerCounts";
import { useWallet } from "@/hooks/useWallet";
import { useUnreadCount } from "@/hooks/useNotifications";
import { formatMatchTime } from "@/lib/date-utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import WelcomePopup from "@/components/WelcomePopup";

const BANNERS = [
  { title: "MEGA CONTEST", subtitle: "₹25 Lakhs Prize Pool", desc: "Join the biggest contest of the season", gradient: "gradient-primary", icon: Crown },
  { title: "100% BONUS", subtitle: "On First Deposit", desc: "Use code WELCOME100", gradient: "gradient-premium", icon: Star },
  { title: "WINNER TAKES ALL", subtitle: "₹1 Lakh Direct Win", desc: "Head-to-head showdown", gradient: "gradient-purple", icon: Flame },
];

const MatchCard = ({ match, playerCount }: { match: Match; playerCount?: number }) => {
  const navigate = useNavigate();
  const countdown = useCountdown(match.entry_deadline);
  const isUrgent = !countdown.isExpired && countdown.days === 0 && countdown.hours === 0;
  const isLive = match.status === "live";

  return (
    <motion.div
      variants={item}
      className="group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-300"
      onClick={() => navigate(`/match/${match.id}`)}
      style={{
        background: "linear-gradient(145deg, hsl(228 16% 12%), hsl(228 18% 8%))",
        border: `1px solid ${isLive ? "hsl(var(--neon-red) / 0.2)" : "hsl(228 12% 18% / 0.5)"}`,
        boxShadow: "0 4px 20px hsl(228 18% 3% / 0.4)",
      }}
      whileHover={{ y: -2, boxShadow: "0 8px 32px hsl(152 100% 50% / 0.06)" }}
    >
      {/* League header with gradient accent */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-primary/60" />
          <span className="text-[11px] text-muted-foreground/80 font-medium">{match.league}</span>
          <ChevronRight className="h-3 w-3 text-muted-foreground/30" />
        </div>
        {isLive && (
          <Badge className="bg-[hsl(var(--neon-red)/0.12)] text-[hsl(var(--neon-red))] border-[hsl(var(--neon-red)/0.2)] text-[9px] font-bold uppercase gap-1 px-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--neon-red))] animate-pulse" /> Live
          </Badge>
        )}
        {match.status === "completed" && (
          <Badge className="bg-muted/30 text-muted-foreground/70 border-border/20 text-[9px] font-bold uppercase">
            Completed
          </Badge>
        )}
      </div>

      {/* Teams row */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-3">
          {/* Teams stacked on left */}
          <div className="flex-1 space-y-3">
            {/* Team 1 */}
            <div className="flex items-center gap-3">
              <div className={cn(
                "h-10 w-10 rounded-xl flex items-center justify-center text-[9px] font-bold font-display text-white shadow-lg bg-gradient-to-br flex-shrink-0",
                match.team1_color || "from-blue-500 to-blue-700"
              )}>
                {match.team1_short}
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-foreground leading-tight">{match.team1_short}</p>
                <p className="text-[10px] text-muted-foreground/60 truncate">{match.team1_name}</p>
              </div>
            </div>
            {/* Team 2 */}
            <div className="flex items-center gap-3">
              <div className={cn(
                "h-10 w-10 rounded-xl flex items-center justify-center text-[9px] font-bold font-display text-white shadow-lg bg-gradient-to-br flex-shrink-0",
                match.team2_color || "from-red-500 to-red-700"
              )}>
                {match.team2_short}
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-foreground leading-tight">{match.team2_short}</p>
                <p className="text-[10px] text-muted-foreground/60 truncate">{match.team2_name}</p>
              </div>
            </div>
          </div>

          {/* Countdown on right */}
          <div className="flex-shrink-0 text-right">
            {match.status === "upcoming" && !countdown.isExpired ? (
              <div className="flex flex-col items-end gap-1">
                <span className={cn(
                  "text-sm font-bold font-display tracking-wide",
                  isUrgent ? "text-[hsl(var(--neon-red))]" : "text-[hsl(var(--neon-red))]"
                )}>
                  {countdown.label}
                </span>
                <span className="text-[10px] text-muted-foreground/50">
                  {formatMatchTime(match.match_time)}
                </span>
              </div>
            ) : isLive ? (
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[hsl(var(--neon-red))] animate-pulse" />
                <span className="text-sm font-bold text-[hsl(var(--neon-red))]">LIVE</span>
              </div>
            ) : (
              <span className="text-[11px] text-muted-foreground/60 font-medium">
                {formatMatchTime(match.match_time)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-border/10"
        style={{ background: "hsl(228 16% 6% / 0.5)" }}>
        <span className="text-[10px] text-muted-foreground/50">
          {match.venue || "Venue TBD"}
        </span>
        <div className="flex items-center gap-2">
          {playerCount != null && playerCount > 0 && (
            <span className="text-[9px] font-semibold text-primary bg-primary/10 rounded-md px-1.5 py-0.5 border border-primary/15">
              {playerCount} players
            </span>
          )}
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-primary/60 transition-colors" />
        </div>
      </div>
    </motion.div>
  );
};

const MatchCardSkeleton = () => (
  <div className="rounded-2xl overflow-hidden" style={{
    background: "linear-gradient(145deg, hsl(228 16% 12%), hsl(228 18% 8%))",
    border: "1px solid hsl(228 12% 18% / 0.4)",
  }}>
    <div className="px-4 pt-3 pb-2 flex justify-between">
      <Skeleton className="h-3 w-20 rounded" />
      <Skeleton className="h-5 w-16 rounded-full" />
    </div>
    <div className="px-4 py-3 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <div className="space-y-1"><Skeleton className="h-3 w-10 rounded" /><Skeleton className="h-2.5 w-20 rounded" /></div>
      </div>
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <div className="space-y-1"><Skeleton className="h-3 w-10 rounded" /><Skeleton className="h-2.5 w-20 rounded" /></div>
      </div>
    </div>
    <div className="border-t border-border/10 px-4 py-2 flex justify-between">
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
  const { data: playerCounts = {} } = useMatchPlayerCounts();
  const { data: siteSettings } = useSiteSettings();
  const navigate = useNavigate();

  const totalBalance = (wallet?.deposit_balance ?? 0) + (wallet?.winning_balance ?? 0) + (wallet?.bonus_balance ?? 0);
  const unreadCount = useUnreadCount();

  // Group matches by league
  const groupedMatches = matches.reduce((acc, match) => {
    if (!acc[match.league]) acc[match.league] = [];
    acc[match.league].push(match);
    return acc;
  }, {} as Record<string, Match[]>);

  const tabs: { key: TabKey; label: string }[] = [
    { key: "upcoming", label: "Upcoming" },
    { key: "live", label: "Live" },
    { key: "completed", label: "Completed" },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden bg-background">
      <div className="fixed inset-0 pointer-events-none gradient-mesh opacity-40" />
      <div className="floating-orb w-72 h-72 bg-[hsl(var(--neon-green))] -top-20 -left-20" />
      <div className="floating-orb w-96 h-96 bg-[hsl(var(--neon-cyan))] top-1/3 -right-32" style={{ animationDelay: "3s" }} />

      {/* Header */}
      <header className="sticky top-0 z-40 relative" style={{
        background: "linear-gradient(180deg, hsl(228 18% 5% / 0.97), hsl(228 18% 5% / 0.88))",
        backdropFilter: "blur(24px) saturate(1.8)",
      }}>
        <div className="absolute bottom-0 left-0 right-0 h-[1px]"
          style={{ background: "linear-gradient(90deg, transparent, hsl(228 12% 18% / 0.6), hsl(152 100% 50% / 0.15), hsl(228 12% 18% / 0.6), transparent)" }}
        />
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl relative overflow-hidden"
                style={{ background: "linear-gradient(135deg, hsl(152 100% 50%), hsl(195 100% 55%))", boxShadow: "0 2px 12px hsl(152 100% 50% / 0.3)" }}>
                <span className="shimmer absolute inset-0" />
                <Trophy className="h-5 w-5 text-primary-foreground relative z-10" />
              </div>
            </div>
            <div>
              <h1 className="font-display text-xl font-bold leading-none tracking-tight">
                {siteSettings?.site_name || "FANTASY11"}
              </h1>
              <p className="text-[8px] text-muted-foreground/50 tracking-[0.25em] uppercase font-medium mt-0.5">
                {siteSettings?.site_slogan || "Play • Predict • Win"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate("/wallet")}
              className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 transition-all hover:scale-105 active:scale-95"
              style={{ background: "linear-gradient(135deg, hsl(228 16% 12%), hsl(228 16% 9%))", border: "1px solid hsl(228 12% 18% / 0.6)" }}>
              <Wallet className="h-3.5 w-3.5 text-primary" />
              <span className="text-[11px] font-bold text-foreground">₹{totalBalance.toFixed(0)}</span>
            </button>
            <button onClick={() => navigate("/notifications")}
              className="relative h-9 w-9 rounded-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95"
              style={{ background: "hsl(228 16% 11%)", border: "1px solid hsl(228 12% 18% / 0.5)" }}>
              <Bell className="h-4 w-4 text-muted-foreground" />
              {unreadCount > 0 && (
                <div className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] rounded-full flex items-center justify-center px-1"
                  style={{ background: "linear-gradient(135deg, hsl(var(--neon-red)), hsl(var(--neon-orange)))", boxShadow: "0 0 8px hsl(var(--neon-red) / 0.5)", fontSize: "9px", fontWeight: 700, color: "white" }}>
                  {unreadCount > 9 ? "9+" : unreadCount}
                </div>
              )}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 py-5 space-y-5 relative z-10">
        {/* Custom Admin Banner */}
        {siteSettings?.banner_url && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl overflow-hidden border border-border/20">
            <img src={siteSettings.banner_url} alt="Banner" className="w-full h-36 object-cover" />
          </motion.div>
        )}

        {/* Promo Banners */}
        <motion.div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide snap-x snap-mandatory"
          initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
          {BANNERS.map((b, i) => (
            <motion.div key={i} className={cn("relative min-w-[280px] rounded-2xl p-5 flex-shrink-0 overflow-hidden snap-start", b.gradient)}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <div className="shimmer absolute inset-0 rounded-2xl" />
              <b.icon className="absolute top-4 right-4 h-16 w-16 opacity-10 text-primary-foreground" />
              <p className="font-display text-[10px] font-bold uppercase tracking-[0.2em] text-primary-foreground/60 relative z-10">{b.title}</p>
              <p className="mt-1.5 font-display text-xl font-bold text-primary-foreground relative z-10">{b.subtitle}</p>
              <p className="mt-0.5 text-[11px] text-primary-foreground/50 relative z-10">{b.desc}</p>
              <Button size="sm" className="mt-3 text-[11px] font-bold rounded-xl relative z-10 border-0 h-8 px-4"
                style={{ background: "hsl(0 0% 100% / 0.15)", backdropFilter: "blur(8px)", color: "white" }}>
                Join Now <ChevronRight className="h-3 w-3 ml-0.5" />
              </Button>
            </motion.div>
          ))}
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-2xl p-1 relative" style={{
          background: "hsl(228 16% 8% / 0.8)", border: "1px solid hsl(228 12% 16% / 0.5)",
        }}>
          {tabs.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={cn("relative flex-1 flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all",
                activeTab !== tab.key && "text-muted-foreground/50 hover:text-muted-foreground")}>
              {activeTab === tab.key && (
                <motion.div layoutId="tab-active" className="absolute inset-0 rounded-xl"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  style={{ background: "linear-gradient(135deg, hsl(152 100% 50% / 0.1), hsl(195 100% 55% / 0.06))", border: "1px solid hsl(152 100% 50% / 0.2)", boxShadow: "0 0 16px hsl(152 100% 50% / 0.06)" }}
                />
              )}
              {tab.key === "live" && (
                <span className={cn("inline-block h-2 w-2 rounded-full transition-all",
                  activeTab === "live" ? "bg-[hsl(var(--neon-red))] shadow-[0_0_6px_hsl(var(--neon-red)/0.5)] animate-pulse" : "bg-[hsl(var(--neon-red)/0.4)]"
                )} />
              )}
              <span className={cn("relative z-10 transition-colors", activeTab === tab.key && "text-primary")}>
                {tab.label}
              </span>
            </button>
          ))}
        </div>

        {/* Matches grouped by league */}
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} variants={staggerContainer} initial="hidden" animate="show" className="space-y-5">
            {isLoading ? (
              <div className="space-y-3"><MatchCardSkeleton /><MatchCardSkeleton /><MatchCardSkeleton /></div>
            ) : matches.length === 0 ? (
              <motion.div variants={item} className="glass-card flex flex-col items-center py-16 text-muted-foreground">
                <div className="h-16 w-16 rounded-2xl bg-secondary/60 flex items-center justify-center mb-4">
                  <Trophy className="h-7 w-7 opacity-30" />
                </div>
                <p className="text-sm font-semibold text-foreground/70">No {activeTab} matches</p>
                <p className="text-xs text-muted-foreground/50 mt-1">Check back soon!</p>
              </motion.div>
            ) : (
              Object.entries(groupedMatches).map(([league, leagueMatches]) => (
                <motion.div key={league} variants={item} className="space-y-2.5">
                  <div className="flex items-center gap-2 px-1">
                    <h3 className="text-[11px] font-semibold text-muted-foreground/50 uppercase tracking-[0.15em]">{league}</h3>
                    <ChevronRight className="h-3 w-3 text-muted-foreground/20" />
                  </div>
                  {leagueMatches.map((match) => (
                    <MatchCard key={match.id} match={match} playerCount={playerCounts[match.id]} />
                  ))}
                </motion.div>
              ))
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Index;
