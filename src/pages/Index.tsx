import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Trophy, ChevronRight, Zap, Clock, Users, Star, Flame, Crown,
  Bell, TrendingUp, Timer, Sparkles, ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { staggerContainer, item } from "@/lib/animations";

type MatchStatus = "upcoming" | "live" | "completed";

interface Match {
  id: string;
  team1: string;
  team2: string;
  team1Short: string;
  team2Short: string;
  team1Color: string;
  team2Color: string;
  league: string;
  time: string;
  status: MatchStatus;
  contestCount: number;
  prizePool: string;
  totalPlayers: number;
  megaPrize: string;
}

const DEMO_MATCHES: Match[] = [
  { id: "1", team1: "India", team2: "Australia", team1Short: "IND", team2Short: "AUS", team1Color: "from-blue-500 to-blue-600", team2Color: "from-amber-500 to-amber-600", league: "ICC T20 World Cup", time: "7:30 PM", status: "upcoming", contestCount: 24, prizePool: "₹25L", totalPlayers: 12847, megaPrize: "₹10L" },
  { id: "2", team1: "England", team2: "Pakistan", team1Short: "ENG", team2Short: "PAK", team1Color: "from-red-500 to-red-600", team2Color: "from-emerald-500 to-emerald-600", league: "ICC ODI Series", time: "Live", status: "live", contestCount: 18, prizePool: "₹10L", totalPlayers: 8432, megaPrize: "₹5L" },
  { id: "3", team1: "South Africa", team2: "New Zealand", team1Short: "SA", team2Short: "NZ", team1Color: "from-green-500 to-green-600", team2Color: "from-zinc-500 to-zinc-600", league: "Test Championship", time: "2:00 PM", status: "upcoming", contestCount: 12, prizePool: "₹5L", totalPlayers: 5621, megaPrize: "₹2L" },
  { id: "4", team1: "Sri Lanka", team2: "Bangladesh", team1Short: "SL", team2Short: "BAN", team1Color: "from-indigo-500 to-indigo-600", team2Color: "from-teal-500 to-teal-600", league: "Asia Cup", time: "Completed", status: "completed", contestCount: 15, prizePool: "₹8L", totalPlayers: 9103, megaPrize: "₹3L" },
];

const BANNERS = [
  { title: "MEGA CONTEST", subtitle: "₹25 Lakhs", desc: "Join the biggest contest of the season", gradient: "gradient-primary", icon: Crown, accent: "neon-green" },
  { title: "100% BONUS", subtitle: "First Deposit", desc: "Use code WELCOME100", gradient: "gradient-premium", icon: Star, accent: "neon-orange" },
  { title: "WIN BIG", subtitle: "₹1 Lakh Direct", desc: "Head-to-head showdown", gradient: "gradient-hot", icon: Flame, accent: "neon-pink" },
];

const TICKER_ITEMS = [
  "🏆 Rohit_Sharma_Fan won ₹5,00,000",
  "🔥 12,847 players joined IND vs AUS",
  "⚡ Mega Contest filling fast — 78% full",
  "💰 Total winnings distributed: ₹25 Crores",
];

// Animated counter component
const AnimatedNumber = ({ value, prefix = "" }: { value: string; prefix?: string }) => (
  <motion.span
    key={value}
    initial={{ y: 10, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    className="inline-block"
  >
    {prefix}{value}
  </motion.span>
);

const Index = () => {
  const [activeTab, setActiveTab] = useState<MatchStatus>("upcoming");
  const [currentBanner, setCurrentBanner] = useState(0);
  const tabs: { key: MatchStatus; label: string }[] = [
    { key: "upcoming", label: "Upcoming" },
    { key: "live", label: "Live" },
    { key: "completed", label: "Completed" },
  ];

  const filteredMatches = DEMO_MATCHES.filter((m) => m.status === activeTab);
  const liveCount = DEMO_MATCHES.filter((m) => m.status === "live").length;

  // Auto-rotate banners
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % BANNERS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 grid-pattern opacity-30 pointer-events-none" />
      <div className="floating-orb w-[500px] h-[500px] bg-neon-green -top-40 -left-40" />
      <div className="floating-orb w-[400px] h-[400px] bg-neon-cyan top-1/3 -right-40" style={{ animationDelay: "3s" }} />
      <div className="floating-orb w-[300px] h-[300px] bg-neon-purple bottom-20 left-10" style={{ animationDelay: "6s" }} />
      <div className="floating-orb w-[200px] h-[200px] bg-neon-pink top-2/3 right-20" style={{ animationDelay: "9s" }} />

      {/* Scan line effect */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-50 opacity-[0.02]">
        <div className="w-full h-px bg-primary" style={{ animation: "scan-line 8s linear infinite" }} />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40" style={{
        background: "linear-gradient(180deg, hsl(230 20% 4% / 0.98), hsl(230 20% 4% / 0.85))",
        backdropFilter: "blur(30px) saturate(2)",
        borderBottom: "1px solid hsl(230 12% 12% / 0.6)",
      }}>
        <div className="mx-auto max-w-lg px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <motion.div
                className="relative"
                whileHover={{ rotate: [0, -5, 5, 0] }}
                transition={{ duration: 0.4 }}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl gradient-primary shadow-lg relative overflow-hidden">
                  <Trophy className="h-5 w-5 text-primary-foreground relative z-10" />
                  <div className="shimmer-fast absolute inset-0" />
                </div>
                <div className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full gradient-live animate-pulse-neon ring-2 ring-background" />
                <div className="absolute inset-0 rounded-2xl gradient-primary opacity-25 blur-lg" />
              </motion.div>
              <div>
                <h1 className="font-display text-xl font-bold leading-none tracking-wide">
                  FANTASY<span className="text-gradient">11</span>
                </h1>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="h-1 w-1 rounded-full bg-neon-green animate-pulse-neon" />
                  <p className="text-[8px] text-muted-foreground tracking-[0.3em] uppercase font-medium">
                    Play • Predict • Win
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {liveCount > 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="relative"
                >
                  <Badge className="bg-neon-red/15 text-neon-red border-neon-red/25 text-[10px] font-bold pr-2.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-neon-red animate-pulse-neon mr-1.5" />
                    {liveCount} LIVE
                  </Badge>
                </motion.div>
              )}
              <motion.button
                whileTap={{ scale: 0.9 }}
                className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/80 border border-border/50"
              >
                <Bell className="h-4 w-4 text-muted-foreground" />
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full gradient-primary ring-2 ring-background" />
              </motion.button>
            </div>
          </div>
        </div>

        {/* Live ticker */}
        <div className="border-t border-border/30 overflow-hidden">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-neon-red/10 px-2 py-1 border-r border-border/30">
              <Zap className="h-3 w-3 text-neon-red" />
            </div>
            <div className="overflow-hidden flex-1">
              <div className="animate-ticker whitespace-nowrap py-1 px-3">
                {TICKER_ITEMS.map((text, i) => (
                  <span key={i} className="text-[10px] text-muted-foreground mx-8 font-medium">
                    {text}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 pt-5 pb-8 space-y-6 relative z-10">
        {/* Hero Stats Row */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-3 gap-2"
        >
          {[
            { label: "Prize Pool", value: "₹25L", icon: Trophy, color: "text-neon-green" },
            { label: "Players", value: "12.8K", icon: Users, color: "text-neon-cyan" },
            { label: "Matches", value: "4", icon: Sparkles, color: "text-neon-purple" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className="glass-card p-3 text-center group relative overflow-hidden"
            >
              <div className="shimmer absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              <stat.icon className={cn("h-4 w-4 mx-auto mb-1", stat.color)} />
              <p className="font-display text-lg font-bold leading-none">{stat.value}</p>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider mt-1 font-medium">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Featured Banner with auto-rotation */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="relative"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={currentBanner}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.4 }}
              className={cn(
                "relative rounded-3xl p-6 overflow-hidden",
                BANNERS[currentBanner].gradient
              )}
            >
              <div className="shimmer absolute inset-0" />
              {/* Decorative elements */}
              <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-primary-foreground/5 blur-2xl" />
              <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-primary-foreground/10 to-transparent" />
              
              {(() => {
                const BannerIcon = BANNERS[currentBanner].icon;
                return <BannerIcon className="absolute top-5 right-5 h-20 w-20 opacity-[0.08] text-primary-foreground" />;
              })()}

              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-primary-foreground/20 text-primary-foreground border-0 text-[9px] font-bold tracking-wider">
                    {BANNERS[currentBanner].title}
                  </Badge>
                </div>
                <p className="font-display text-3xl font-bold text-primary-foreground leading-tight">
                  {BANNERS[currentBanner].subtitle}
                </p>
                <p className="text-sm text-primary-foreground/60 mt-1">{BANNERS[currentBanner].desc}</p>
                <motion.div whileTap={{ scale: 0.95 }} className="mt-4">
                  <Button
                    size="sm"
                    className="rounded-xl font-bold text-xs bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground border border-primary-foreground/10 backdrop-blur-sm"
                  >
                    Join Now <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Dots indicator */}
          <div className="flex justify-center gap-1.5 mt-3">
            {BANNERS.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentBanner(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === currentBanner ? "w-6 gradient-primary" : "w-1.5 bg-muted-foreground/30"
                )}
              />
            ))}
          </div>
        </motion.div>

        {/* Match Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <div className="flex gap-1 rounded-2xl bg-secondary/40 p-1.5 border border-border/20 relative overflow-hidden">
            <div className="shimmer absolute inset-0 opacity-30" />
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "relative flex-1 flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all z-10",
                  activeTab !== tab.key && "text-muted-foreground hover:text-foreground"
                )}
              >
                {activeTab === tab.key && (
                  <motion.div
                    layoutId="tab-active-bg"
                    className="absolute inset-0 rounded-xl glass-card-premium"
                    transition={{ type: "spring" as const, stiffness: 400, damping: 30 }}
                  />
                )}
                {tab.key === "live" && (
                  <span className={cn(
                    "inline-block h-2 w-2 rounded-full relative z-10",
                    activeTab === "live" ? "bg-neon-red animate-pulse-neon" : "bg-neon-red/40"
                  )} />
                )}
                <span className={cn("relative z-10", activeTab === tab.key && "text-primary neon-glow")}>
                  {tab.label}
                </span>
                {tab.key === "upcoming" && (
                  <span className={cn(
                    "relative z-10 text-[9px] font-bold rounded-full px-1.5 py-0.5",
                    activeTab === "upcoming" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                  )}>
                    {DEMO_MATCHES.filter(m => m.status === "upcoming").length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Matches */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="space-y-3"
          >
            {filteredMatches.length === 0 && (
              <motion.div variants={item} className="glass-card flex flex-col items-center py-20 text-muted-foreground relative overflow-hidden">
                <div className="grid-pattern absolute inset-0 opacity-20" />
                <div className="relative mb-5">
                  <Trophy className="h-14 w-14 opacity-15 relative z-10" />
                  <div className="absolute inset-0 blur-2xl bg-primary/15 rounded-full scale-150" />
                </div>
                <p className="text-sm font-semibold relative z-10">No {activeTab} matches</p>
                <p className="text-xs text-muted-foreground/50 mt-1 relative z-10">Check back soon!</p>
              </motion.div>
            )}
            {filteredMatches.map((match) => (
              <motion.div
                key={match.id}
                variants={item}
                className="glass-card-hover p-0 overflow-hidden group relative"
              >
                {/* Top accent line */}
                <div className={cn(
                  "absolute top-0 left-0 right-0 h-[2px]",
                  match.status === "live" ? "gradient-live" : "gradient-primary"
                )} />
                
                {/* Hover glow */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                  <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-40 h-40 rounded-full bg-primary/5 blur-3xl" />
                </div>

                {/* League header */}
                <div className="flex items-center justify-between px-4 pt-4 pb-2 relative z-10">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary/40" />
                    <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-[0.15em]">
                      {match.league}
                    </span>
                  </div>
                  {match.status === "live" && (
                    <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
                      <Badge className="bg-neon-red/10 text-neon-red border-neon-red/20 text-[9px] font-bold uppercase gap-1 ring-1 ring-neon-red/10">
                        <span className="h-1.5 w-1.5 rounded-full bg-neon-red animate-pulse-neon" />
                        LIVE
                      </Badge>
                    </motion.div>
                  )}
                  {match.status === "upcoming" && (
                    <Badge variant="outline" className="border-primary/15 bg-primary/5 text-primary/80 text-[9px] gap-1 font-semibold">
                      <Timer className="h-3 w-3" /> {match.time}
                    </Badge>
                  )}
                </div>

                {/* Teams */}
                <div className="flex items-center justify-between px-4 py-4 relative z-10">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="relative">
                      <div className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-[11px] font-bold font-display text-white shadow-lg ring-1 ring-white/10",
                        match.team1Color
                      )}>
                        {match.team1Short}
                      </div>
                      <div className={cn("absolute inset-0 rounded-2xl bg-gradient-to-br opacity-30 blur-lg", match.team1Color)} />
                    </div>
                    <div>
                      <span className="text-sm font-bold block">{match.team1}</span>
                      <span className="text-[9px] text-muted-foreground/50 uppercase tracking-wider">{match.team1Short}</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-center mx-4 relative">
                    <div className="relative">
                      <div className="glass-ultra px-3 py-1.5">
                        <span className="text-[10px] font-bold text-muted-foreground tracking-[0.2em] font-display">VS</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-1 justify-end">
                    <div className="text-right">
                      <span className="text-sm font-bold block">{match.team2}</span>
                      <span className="text-[9px] text-muted-foreground/50 uppercase tracking-wider">{match.team2Short}</span>
                    </div>
                    <div className="relative">
                      <div className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-[11px] font-bold font-display text-white shadow-lg ring-1 ring-white/10",
                        match.team2Color
                      )}>
                        {match.team2Short}
                      </div>
                      <div className={cn("absolute inset-0 rounded-2xl bg-gradient-to-br opacity-30 blur-lg", match.team2Color)} />
                    </div>
                  </div>
                </div>

                {/* Mega prize highlight */}
                <div className="mx-4 mb-3 rounded-xl bg-secondary/40 border border-border/20 p-2.5 flex items-center justify-between relative overflow-hidden">
                  <div className="shimmer absolute inset-0" />
                  <div className="flex items-center gap-2 relative z-10">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg gradient-primary">
                      <Crown className="h-3.5 w-3.5 text-primary-foreground" />
                    </div>
                    <div>
                      <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-medium">Mega Prize</p>
                      <p className="text-sm font-bold font-display text-gradient leading-none">{match.megaPrize}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 relative z-10">
                    <TrendingUp className="h-3 w-3 text-neon-green" />
                    <span className="text-[10px] text-neon-green font-semibold">{match.totalPlayers.toLocaleString()} joined</span>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-border/15 px-4 py-2.5 bg-secondary/15 relative z-10">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
                      <Users className="h-3 w-3" /> {match.contestCount} Contests
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-neon-green font-bold">
                      <Trophy className="h-3 w-3" /> {match.prizePool}
                    </span>
                  </div>
                  <motion.div
                    className="flex items-center gap-1 text-primary text-[11px] font-bold"
                    whileHover={{ x: 3 }}
                  >
                    Enter <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </motion.div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-2 gap-3"
        >
          <motion.div whileTap={{ scale: 0.97 }} className="glass-card-hover p-4 gradient-border">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary">
                <Sparkles className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm font-bold">Quick Play</p>
                <p className="text-[10px] text-muted-foreground">Auto-pick team</p>
              </div>
            </div>
          </motion.div>
          <motion.div whileTap={{ scale: 0.97 }} className="glass-card-hover p-4 gradient-border">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-premium">
                <Star className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm font-bold">Expert Tips</p>
                <p className="text-[10px] text-muted-foreground">Guru picks</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default Index;
