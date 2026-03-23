import { Trophy, Users, ChevronRight, Crown, Swords, Shield, CheckCircle2, Flame, Award, BarChart3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { item } from "@/lib/animations";
import { Contest } from "@/hooks/useContests";

const typeConfig: Record<string, { label: string; sectionLabel: string; color: string; bg: string; icon: typeof Trophy }> = {
  mega: { label: "Mega", sectionLabel: "GRAND LEAGUE", color: "text-[hsl(var(--neon-green))]", bg: "bg-[hsl(var(--neon-green)/0.1)]", icon: Crown },
  h2h: { label: "H2H", sectionLabel: "HEAD TO HEAD", color: "text-[hsl(var(--neon-cyan))]", bg: "bg-[hsl(var(--neon-cyan)/0.1)]", icon: Swords },
  practice: { label: "Practice", sectionLabel: "PRACTICE", color: "text-muted-foreground", bg: "bg-secondary", icon: Shield },
  winner_takes_all: { label: "Winner Takes All", sectionLabel: "WINNER TAKES ALL", color: "text-[hsl(var(--neon-orange))]", bg: "bg-[hsl(var(--neon-orange)/0.1)]", icon: Trophy },
  private: { label: "Private", sectionLabel: "PRIVATE", color: "text-[hsl(var(--neon-purple))]", bg: "bg-[hsl(var(--neon-purple)/0.1)]", icon: Users },
};

interface ContestCardProps {
  contest: Contest;
  onJoin: () => void;
  isJoined: boolean;
  disabled?: boolean;
  onViewLeaderboard?: () => void;
}

const formatPrize = (amount: number) => {
  if (amount >= 100000) return `WIN ${(amount / 100000).toFixed(amount % 100000 === 0 ? 0 : 2)} Lakh`;
  if (amount >= 1000) return `WIN ${(amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 1)}K`;
  return `WIN ₹${amount}`;
};

const ContestCard = ({ contest, onJoin, isJoined, disabled, onViewLeaderboard }: ContestCardProps) => {
  const config = typeConfig[contest.type] || typeConfig.mega;
  const fillPercent = Math.round((contest.current_entries / contest.max_entries) * 100);
  const spotsLeft = contest.max_entries - contest.current_entries;
  const isAlmostFull = fillPercent >= 75;
  const winnersCount = contest.prize_breakdown?.length || 1;
  const winPercent = Math.round((winnersCount / contest.max_entries) * 100);

  // Get first prize from breakdown
  const firstPrize = contest.prize_breakdown && contest.prize_breakdown.length > 0
    ? (contest.prize_breakdown as any[])[0]?.amount || (contest.prize_breakdown as any[])[0]?.prize
    : null;

  return (
    <motion.div
      variants={item}
      className={cn(
        "group relative rounded-2xl overflow-hidden transition-all duration-300",
        disabled && !isJoined ? "opacity-60 cursor-default" : "cursor-pointer"
      )}
      onClick={disabled && !isJoined ? undefined : onJoin}
      style={{
        background: "hsl(0 0% 100% / 0.97)",
        border: "1px solid hsl(0 0% 0% / 0.06)",
        boxShadow: "0 2px 12px hsl(0 0% 0% / 0.05)",
      }}
    >
      {/* Prize pool label */}
      <div className="px-4 pt-4 pb-1 flex items-start justify-between">
        <div>
          <p className="text-[10px] text-muted-foreground font-medium mb-0.5">
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
      <div className="px-4 pt-2 pb-1">
        <div className="relative h-[6px] rounded-full overflow-hidden" style={{ background: "hsl(0 0% 0% / 0.06)" }}>
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${fillPercent}%` }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
            style={{
              background: isAlmostFull
                ? "linear-gradient(90deg, hsl(0 85% 55%), hsl(0 85% 45%))"
                : "hsl(0 85% 55%)",
            }}
          />
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-[10px] text-muted-foreground">
            {spotsLeft} seats left
          </span>
          <span className="text-[10px] text-muted-foreground">
            {contest.max_entries} spots
          </span>
        </div>
      </div>

      {/* Entry fee button */}
      <div className="px-4 pb-2 flex justify-end">
        <button
          className={cn(
            "rounded-lg px-4 py-1.5 text-sm font-bold text-white transition-all",
            disabled && !isJoined
              ? "bg-muted text-muted-foreground"
              : "hover:opacity-90 active:scale-95"
          )}
          style={
            disabled && !isJoined
              ? undefined
              : {
                  background: "hsl(0 85% 50%)",
                  boxShadow: "0 2px 8px hsl(0 85% 50% / 0.3)",
                }
          }
          onClick={(e) => {
            e.stopPropagation();
            if (!disabled || isJoined) onJoin();
          }}
        >
          {contest.entry_fee === 0 ? (
            "FREE"
          ) : (
            <span className="flex items-center gap-1">
              <span className="text-[10px]">🪙</span> {contest.entry_fee}
            </span>
          )}
        </button>
      </div>

      {/* Footer stats */}
      <div
        className="flex items-center justify-between px-4 py-2.5 border-t"
        style={{ borderColor: "hsl(0 0% 0% / 0.05)", background: "hsl(0 0% 0% / 0.01)" }}
      >
        <div className="flex items-center gap-4">
          {firstPrize && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <span className="font-bold italic text-foreground">1st</span>{" "}
              {typeof firstPrize === "number" ? `₹${firstPrize.toLocaleString()}` : firstPrize}
              <span className="text-primary">💎</span>
            </span>
          )}
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Award className="h-3 w-3" /> {winPercent}%
          </span>
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Users className="h-3 w-3" /> Upto {winnersCount > 1 ? winnersCount : contest.max_entries}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {contest.is_guaranteed ? (
            <span className="text-[10px] font-bold text-primary flex items-center gap-0.5">
              ✅ Guaranteed
            </span>
          ) : (
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              📈 Flexible
            </span>
          )}
        </div>
      </div>

      {/* Leaderboard link for joined contests */}
      {isJoined && onViewLeaderboard && (
        <div
          className="px-4 py-2 border-t flex justify-center"
          style={{ borderColor: "hsl(0 0% 0% / 0.05)" }}
        >
          <button
            onClick={(e) => { e.stopPropagation(); onViewLeaderboard(); }}
            className="flex items-center gap-1 text-[hsl(0,85%,50%)] text-[11px] font-bold hover:underline"
          >
            <BarChart3 className="h-3.5 w-3.5" />
            View Leaderboard
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      )}
    </motion.div>
  );
};

export default ContestCard;
