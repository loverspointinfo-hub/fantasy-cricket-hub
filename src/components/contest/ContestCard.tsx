import { Trophy, Users, ChevronRight, Crown, Swords, Shield, CheckCircle2, Flame } from "lucide-react";
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

const ContestCard = ({ contest, onJoin, isJoined, disabled }: ContestCardProps) => {
  const config = typeConfig[contest.type] || typeConfig.mega;
  const fillPercent = Math.round((contest.current_entries / contest.max_entries) * 100);
  const spotsLeft = contest.max_entries - contest.current_entries;
  const isAlmostFull = fillPercent >= 75;

  return (
    <motion.div
      variants={item}
      onClick={disabled && !isJoined ? undefined : onJoin}
      className={cn(
        "group relative rounded-2xl overflow-hidden transition-all duration-500",
        disabled && !isJoined ? "opacity-60 cursor-default" : "cursor-pointer hover:-translate-y-1"
      )}
      style={{
        background: "linear-gradient(145deg, hsl(228 16% 10% / 0.9), hsl(228 20% 6% / 0.8))",
        border: "1px solid hsl(228 12% 18% / 0.5)",
        boxShadow: "0 8px 32px hsl(228 18% 3% / 0.4), 0 0 0 0.5px hsl(0 0% 100% / 0.03) inset",
      }}
      whileHover={{
        boxShadow: "0 16px 48px hsl(152 100% 50% / 0.08), 0 0 0 1px hsl(152 100% 50% / 0.15)",
      }}
    >
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] opacity-60 group-hover:opacity-100 transition-opacity"
        style={{ background: `linear-gradient(90deg, transparent, hsl(var(--primary)), hsl(var(--accent)), transparent)` }}
      />

      {/* Header row */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center", config.bg)}>
            <config.icon className={cn("h-3.5 w-3.5", config.color)} />
          </div>
          <span className={cn("text-[10px] font-bold uppercase tracking-[0.15em]", config.color)}>
            {config.label}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {isJoined && (
            <Badge className="bg-primary/10 text-primary border-primary/20 text-[9px] font-bold gap-1 px-2 py-0.5">
              <CheckCircle2 className="h-2.5 w-2.5" /> Joined
            </Badge>
          )}
          {contest.is_guaranteed && (
            <Badge className="bg-[hsl(var(--neon-green)/0.1)] text-[hsl(var(--neon-green))] border-[hsl(var(--neon-green)/0.2)] text-[9px] font-bold px-2 py-0.5">
              Guaranteed
            </Badge>
          )}
        </div>
      </div>

      {/* Prize & Entry */}
      <div className="px-4 pb-3">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[9px] text-muted-foreground uppercase tracking-[0.2em] mb-0.5">Prize Pool</p>
            <p className="font-display text-2xl font-bold text-gradient leading-none">
              ₹{contest.prize_pool.toLocaleString()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[9px] text-muted-foreground uppercase tracking-[0.2em] mb-0.5">Entry</p>
            <div className="font-display text-xl font-bold leading-none">
              {contest.entry_fee === 0 ? (
                <span className="text-[hsl(var(--neon-green))]">FREE</span>
              ) : (
                <span>₹{contest.entry_fee}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="px-4 pb-3">
        <div className="relative h-2 rounded-full bg-secondary/80 overflow-hidden">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${fillPercent}%` }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
            style={{
              background: isAlmostFull
                ? "linear-gradient(90deg, hsl(var(--neon-orange)), hsl(var(--neon-red)))"
                : "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)))",
            }}
          />
          {/* Glow effect on bar tip */}
          <motion.div
            className="absolute inset-y-0 w-8 rounded-full blur-sm"
            initial={{ left: 0 }}
            animate={{ left: `calc(${fillPercent}% - 16px)` }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
            style={{
              background: isAlmostFull
                ? "hsl(var(--neon-orange) / 0.5)"
                : "hsl(var(--primary) / 0.5)",
            }}
          />
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-[10px] text-muted-foreground">
            {contest.current_entries}/{contest.max_entries} joined
          </span>
          <span className={cn(
            "text-[10px] font-medium flex items-center gap-0.5",
            isAlmostFull ? "text-[hsl(var(--neon-orange))]" : "text-muted-foreground"
          )}>
            {isAlmostFull && <Flame className="h-3 w-3" />}
            {spotsLeft} spots left
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-border/10"
        style={{ background: "hsl(228 16% 6% / 0.5)" }}
      >
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground/70">
            <Users className="h-3 w-3" /> {contest.max_entries}
          </span>
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground/70">
            <Trophy className="h-3 w-3" /> {contest.prize_breakdown?.length || 1} winners
          </span>
        </div>
        <div className="flex items-center gap-1 text-primary text-[11px] font-bold group-hover:gap-2 transition-all">
          {isJoined ? "View" : disabled ? "Closed" : "Join Now"} <ChevronRight className="h-3.5 w-3.5" />
        </div>
      </div>
    </motion.div>
  );
};

export default ContestCard;