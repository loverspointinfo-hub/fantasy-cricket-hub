import { Trophy, Users, ChevronRight, Crown, Swords, Shield, CheckCircle2, Flame, Award, BarChart3, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { item } from "@/lib/animations";
import { Contest } from "@/hooks/useContests";

const typeConfig: Record<string, { label: string; icon: typeof Trophy }> = {
  mega: { label: "Grand League", icon: Crown },
  h2h: { label: "H2H Battle", icon: Swords },
  practice: { label: "Practice", icon: Shield },
  winner_takes_all: { label: "Winner Takes All", icon: Trophy },
  private: { label: "Private Contest", icon: Users },
};

interface ContestCardProps {
  contest: Contest;
  onJoin: () => void;
  isJoined: boolean;
  disabled?: boolean;
  onViewLeaderboard?: () => void;
}

const formatPrize = (amount: number) => {
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(amount % 100000 === 0 ? 0 : 2)} Lakh`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 1)}K`;
  return `₹${amount}`;
};

const ContestCard = ({ contest, onJoin, isJoined, disabled, onViewLeaderboard }: ContestCardProps) => {
  const config = typeConfig[contest.type] || typeConfig.mega;
  const fillPercent = Math.round((contest.current_entries / contest.max_entries) * 100);
  const spotsLeft = contest.max_entries - contest.current_entries;
  const isAlmostFull = fillPercent >= 75;
  const winnersCount = contest.prize_breakdown?.length || 1;
  const winPercent = Math.min(Math.round((winnersCount / contest.max_entries) * 100), 100);

  const firstPrize = contest.prize_breakdown && contest.prize_breakdown.length > 0
    ? (contest.prize_breakdown as any[])[0]?.amount || (contest.prize_breakdown as any[])[0]?.prize
    : null;

  const maxEntryLabel = contest.type === "h2h" ? "1" : contest.max_entries <= 10 ? `${contest.max_entries}` : "30";

  return (
    <motion.div
      variants={item}
      className={cn(
        "group relative rounded-2xl overflow-hidden transition-all duration-300",
        disabled && !isJoined ? "opacity-50 cursor-default" : "cursor-pointer"
      )}
      style={{
        background: "hsl(270 18% 10%)",
        border: "1px solid hsl(270 14% 16%)",
      }}
    >
      {/* Contest name header */}
      <div className="px-4 pt-3 pb-2 flex items-center gap-2"
        style={{ borderBottom: "1px solid hsl(270 14% 14%)" }}>
        <div className="h-8 w-8 rounded-full flex items-center justify-center"
          style={{ background: "hsl(0 85% 50% / 0.12)" }}>
          <config.icon className="h-4 w-4 text-[hsl(var(--neon-red))]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground truncate">{contest.name || config.label}</p>
          <p className="text-[10px] text-muted-foreground">{config.label}</p>
        </div>
        {isJoined && (
          <Badge className="bg-primary/10 text-primary border-primary/20 text-[9px] font-bold gap-1 px-2 py-0.5">
            <CheckCircle2 className="h-2.5 w-2.5" /> Joined
          </Badge>
        )}
      </div>

      {/* Prize pool + Entry fee row */}
      <div className="px-4 pt-3 pb-2 flex items-end justify-between">
        <div>
          <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider mb-0.5">
            {contest.is_guaranteed ? "Prize Pool" : "Current Prize Pool"}
          </p>
          <p className="font-display text-2xl font-black text-foreground leading-none">
            {contest.prize_pool}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider mb-1">Entry Fee</p>
          <button
            className={cn(
              "rounded-lg px-5 py-2 text-[13px] font-bold transition-all",
              disabled && !isJoined
                ? "bg-muted text-muted-foreground"
                : "text-white hover:opacity-90 active:scale-95"
            )}
            style={disabled && !isJoined ? undefined : {
              background: "hsl(48 100% 45%)",
              boxShadow: "0 2px 8px hsl(48 100% 45% / 0.3)",
              color: "hsl(270 20% 4%)",
            }}
            onClick={(e) => { e.stopPropagation(); if (!disabled || isJoined) onJoin(); }}
          >
            {contest.entry_fee === 0 ? "FREE" : `₹${contest.entry_fee}`}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-4 pt-1 pb-2">
        <div className="relative h-[5px] rounded-full overflow-hidden bg-secondary/60">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${fillPercent}%` }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
            style={{
              background: isAlmostFull
                ? "linear-gradient(90deg, hsl(var(--neon-orange)), hsl(var(--neon-red)))"
                : "linear-gradient(90deg, hsl(var(--neon-red)), hsl(var(--neon-orange)))",
            }}
          />
        </div>
        <div className="flex justify-between mt-1.5">
          <span className={cn("text-[11px] font-semibold", isAlmostFull ? "text-[hsl(var(--neon-orange))]" : "text-[hsl(var(--neon-red))]")}>
            {isAlmostFull && <Flame className="h-3 w-3 inline mr-0.5 -mt-0.5" />}
            {spotsLeft} Spots Left
          </span>
          <span className="text-[11px] text-muted-foreground/60">{contest.max_entries} Spots</span>
        </div>
      </div>

      {/* Footer stats row */}
      <div className="flex items-center gap-4 px-4 py-2.5 border-t border-border/10"
        style={{ background: "hsl(228 16% 7%)" }}>
        {firstPrize && (
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Info className="h-3 w-3 text-[hsl(var(--neon-red))]" />
            <span className="font-semibold">₹{typeof firstPrize === "number" ? firstPrize : firstPrize}</span>
          </span>
        )}
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Users className="h-3 w-3" /> Upto {maxEntryLabel}
        </span>
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Trophy className="h-3 w-3" /> {winnersCount} Winner{winnersCount > 1 ? "s" : ""}
        </span>
        <span className="ml-auto flex items-center gap-1 text-[11px] font-semibold">
          {contest.is_guaranteed ? (
            <span className="text-primary">✅ Guaranteed</span>
          ) : (
            <span className="text-muted-foreground/60">📈 Flexible</span>
          )}
        </span>
      </div>

      {/* Leaderboard link */}
      {isJoined && onViewLeaderboard && (
        <div className="px-4 py-2 border-t border-border/10 flex justify-center" style={{ background: "hsl(228 16% 6% / 0.3)" }}>
          <button onClick={(e) => { e.stopPropagation(); onViewLeaderboard(); }}
            className="flex items-center gap-1 text-primary text-[11px] font-bold hover:underline">
            <BarChart3 className="h-3.5 w-3.5" /> View Leaderboard <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      )}
    </motion.div>
  );
};

export default ContestCard;
