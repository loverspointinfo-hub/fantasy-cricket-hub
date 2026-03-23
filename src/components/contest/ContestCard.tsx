import { Trophy, Users, ChevronRight, Crown, Swords, Shield, CheckCircle2, Flame, Award, BarChart3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { item } from "@/lib/animations";
import { Contest } from "@/hooks/useContests";

const typeConfig: Record<string, { label: string; color: string; bg: string; icon: typeof Trophy }> = {
  mega: { label: "Mega", color: "text-[hsl(var(--neon-green))]", bg: "bg-[hsl(var(--neon-green)/0.1)]", icon: Crown },
  h2h: { label: "H2H", color: "text-[hsl(var(--neon-cyan))]", bg: "bg-[hsl(var(--neon-cyan)/0.1)]", icon: Swords },
  practice: { label: "Practice", color: "text-muted-foreground", bg: "bg-secondary", icon: Shield },
  winner_takes_all: { label: "Winner Takes All", color: "text-[hsl(var(--neon-orange))]", bg: "bg-[hsl(var(--neon-orange)/0.1)]", icon: Trophy },
  private: { label: "Private", color: "text-[hsl(var(--neon-purple))]", bg: "bg-[hsl(var(--neon-purple)/0.1)]", icon: Users },
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

  return (
    <motion.div
      variants={item}
      className={cn(
        "group relative rounded-2xl overflow-hidden transition-all duration-300",
        disabled && !isJoined ? "opacity-50 cursor-default" : "cursor-pointer hover:-translate-y-0.5"
      )}
      onClick={disabled && !isJoined ? undefined : onJoin}
      style={{
        background: "linear-gradient(145deg, hsl(228 16% 12%), hsl(228 18% 8%))",
        border: "1px solid hsl(228 12% 18% / 0.5)",
        boxShadow: "0 4px 20px hsl(228 18% 3% / 0.4)",
      }}
    >
      {/* Prize & Entry row */}
      <div className="px-4 pt-4 pb-2 flex items-start justify-between">
        <div>
          <p className="text-[9px] text-muted-foreground/60 uppercase tracking-[0.2em] mb-0.5">
            {contest.is_guaranteed ? "Prize Pool" : "Max Prize Pool"}
          </p>
          <p className="font-display text-2xl font-black text-foreground leading-none">
            {formatPrize(contest.prize_pool)}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {isJoined && (
            <Badge className="bg-primary/10 text-primary border-primary/20 text-[9px] font-bold gap-1 px-2 py-0.5">
              <CheckCircle2 className="h-2.5 w-2.5" /> Joined
            </Badge>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-4 pt-1 pb-1.5">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative h-[5px] rounded-full overflow-hidden bg-secondary/60">
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
          {/* Entry fee button */}
          <button
            className={cn(
              "rounded-lg px-4 py-1.5 text-[12px] font-bold transition-all flex-shrink-0",
              disabled && !isJoined
                ? "bg-muted text-muted-foreground"
                : "text-white hover:opacity-90 active:scale-95"
            )}
            style={disabled && !isJoined ? undefined : {
              background: "linear-gradient(135deg, hsl(var(--neon-red)), hsl(0 85% 45%))",
              boxShadow: "0 2px 8px hsl(0 85% 50% / 0.3)",
            }}
            onClick={(e) => { e.stopPropagation(); if (!disabled || isJoined) onJoin(); }}
          >
            {contest.entry_fee === 0 ? "FREE" : (
              <span className="flex items-center gap-1">🪙 {contest.entry_fee}</span>
            )}
          </button>
        </div>
        <div className="flex justify-between mt-1.5">
          <span className={cn("text-[10px]", isAlmostFull ? "text-[hsl(var(--neon-orange))]" : "text-muted-foreground/60")}>
            {isAlmostFull && <Flame className="h-3 w-3 inline mr-0.5 -mt-0.5" />}
            {spotsLeft} seats left
          </span>
          <span className="text-[10px] text-muted-foreground/50">{contest.max_entries} spots</span>
        </div>
      </div>

      {/* Footer stats */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-border/10"
        style={{ background: "hsl(228 16% 6% / 0.5)" }}>
        <div className="flex items-center gap-3">
          {firstPrize && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
              <span className="font-bold italic text-[hsl(var(--gold))]">1st</span>{" "}
              {typeof firstPrize === "number" ? formatPrize(firstPrize) : firstPrize}
            </span>
          )}
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground/50">
            <Award className="h-3 w-3" /> {winPercent}%
          </span>
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground/50">
            <Users className="h-3 w-3" /> {winnersCount}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {contest.is_guaranteed ? (
            <span className="text-[10px] font-bold text-primary flex items-center gap-0.5">✅ Guaranteed</span>
          ) : (
            <span className="text-[10px] text-muted-foreground/50 flex items-center gap-0.5">📈 Flexible</span>
          )}
        </div>
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
