import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, ChevronRight, Zap, Clock, Users, Star, Flame, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { staggerContainer, item } from "@/lib/animations";
import { useMatches, Match } from "@/hooks/useMatches";
import { format, isToday, isTomorrow } from "date-fns";

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
  return (
    <motion.div
      variants={item}
      className="glass-card-hover p-0 cursor-pointer overflow-hidden group"
      onClick={() => navigate(`/match/${match.id}`)}
    >
      <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
        <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">{match.league}</span>
        {match.status === "live" && (
          <Badge className="bg-neon-red/15 text-neon-red border-neon-red/25 text-[10px] font-bold uppercase gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-neon-red animate-pulse-neon" /> Live
          </Badge>
        )}
        {match.status === "upcoming" && (
          <Badge variant="outline" className="border-primary/20 text-primary/80 text-[10px] gap-1">
            <Clock className="h-3 w-3" /> {formatMatchTime(match.match_time)}
          </Badge>
        )}
      </div>
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3 flex-1">
          <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br text-[11px] font-bold font-display text-white shadow-lg", match.team1_color)}>
            {match.team1_short}
          </div>
          <span className="text-sm font-bold">{match.team1_name}</span>
        </div>
        <div className="flex flex-col items-center mx-3">
          <span className="text-[10px] font-bold text-muted-foreground/60 tracking-wider">VS</span>
        </div>
        <div className="flex items-center gap-3 flex-1 justify-end">
          <span className="text-sm font-bold">{match.team2_name}</span>
          <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br text-[11px] font-bold font-display text-white shadow-lg", match.team2_color)}>
            {match.team2_short}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-border/20 px-4 py-2.5 bg-secondary/20">
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Users className="h-3 w-3" /> {match.venue || "TBD"}
        </span>
        <div className="flex items-center gap-1 text-primary text-xs font-semibold group-hover:gap-2 transition-all">
          View <ChevronRight className="h-3.5 w-3.5" />
        </div>
      </div>
    </motion.div>
  );
};

type TabKey = "upcoming" | "live" | "completed";

const Index = () => {
  const [activeTab, setActiveTab] = useState<TabKey>("upcoming");
  const { data: matches = [], isLoading } = useMatches(activeTab);
  const { data: liveMatches = [] } = useMatches("live");

  const tabs: { key: TabKey; label: string }[] = [
    { key: "upcoming", label: "Upcoming" },
    { key: "live", label: "Live" },
    { key: "completed", label: "Completed" },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="floating-orb w-72 h-72 bg-neon-green -top-20 -left-20" />
      <div className="floating-orb w-96 h-96 bg-neon-cyan top-1/3 -right-32" style={{ animationDelay: "3s" }} />
      <div className="floating-orb w-64 h-64 bg-neon-purple bottom-20 left-10" style={{ animationDelay: "5s" }} />

      <header className="sticky top-0 z-40 border-b border-border/30" style={{
        background: "linear-gradient(180deg, hsl(228 18% 5% / 0.95), hsl(228 18% 5% / 0.8))",
        backdropFilter: "blur(20px) saturate(1.5)",
      }}>
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary">
                <Trophy className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-neon-green animate-pulse-neon" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold leading-none">
                FANTASY<span className="text-gradient">11</span>
              </h1>
              <p className="text-[9px] text-muted-foreground tracking-widest uppercase">Play • Predict • Win</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-secondary border-border/50 text-foreground text-[10px] font-medium">🏏 Cricket</Badge>
            {liveMatches.length > 0 && (
              <Badge className="bg-neon-red/20 text-neon-red border-neon-red/30 text-[10px] animate-pulse-neon">
                {liveMatches.length} Live
              </Badge>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 py-5 space-y-6 relative z-10">
        {/* Banners */}
        <motion.div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
          {BANNERS.map((b, i) => (
            <motion.div key={i} className={cn("relative min-w-[280px] rounded-2xl p-5 flex-shrink-0 overflow-hidden", b.gradient)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <div className="shimmer absolute inset-0 rounded-2xl" />
              <b.icon className="absolute top-4 right-4 h-16 w-16 opacity-10 text-primary-foreground" />
              <p className="font-display text-xs font-bold uppercase tracking-[0.2em] text-primary-foreground/70 relative z-10">{b.title}</p>
              <p className="mt-1.5 font-display text-xl font-bold text-primary-foreground relative z-10">{b.subtitle}</p>
              <p className="mt-0.5 text-xs text-primary-foreground/60 relative z-10">{b.desc}</p>
              <Button size="sm" variant="secondary" className="mt-3 text-xs font-bold rounded-xl relative z-10 bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground border-0">
                Join Now <ChevronRight className="h-3 w-3" />
              </Button>
            </motion.div>
          ))}
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-2xl bg-secondary/50 p-1.5 border border-border/30">
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={cn("relative flex-1 flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all", activeTab !== tab.key && "text-muted-foreground hover:text-foreground")}>
              {activeTab === tab.key && (
                <>
                  <motion.div layoutId="tab-active" className="absolute inset-0 rounded-xl gradient-primary" transition={{ type: "spring", stiffness: 400, damping: 30 }} style={{ opacity: 0.15 }} />
                  <motion.div layoutId="tab-border" className="absolute inset-0 rounded-xl border border-primary/40" transition={{ type: "spring", stiffness: 400, damping: 30 }} />
                </>
              )}
              {tab.key === "live" && <span className={cn("inline-block h-2 w-2 rounded-full", activeTab === "live" ? "bg-neon-red animate-pulse-neon" : "bg-neon-red/50")} />}
              <span className={cn("relative z-10", activeTab === tab.key && "text-primary")}>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Matches */}
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} variants={staggerContainer} initial="hidden" animate="show" className="space-y-3">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              </div>
            ) : matches.length === 0 ? (
              <motion.div variants={item} className="glass-card flex flex-col items-center py-16 text-muted-foreground">
                <Trophy className="h-12 w-12 opacity-20 mb-4" />
                <p className="text-sm font-medium">No {activeTab} matches</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Check back soon!</p>
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
