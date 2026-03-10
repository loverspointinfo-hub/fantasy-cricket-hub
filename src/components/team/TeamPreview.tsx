import { Crown, Star, Shield, TrendingUp, Sparkles, Users } from "lucide-react";
import { MatchPlayer } from "@/hooks/useMatchPlayers";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { staggerContainer, item } from "@/lib/animations";

const ROLE_LABELS: Record<string, string> = {
  WK: "Wicket-Keeper",
  BAT: "Batsman",
  AR: "All-Rounder",
  BOWL: "Bowler",
};
const ROLE_ICONS: Record<string, string> = {
  WK: "🧤",
  BAT: "🏏",
  AR: "⚡",
  BOWL: "🎯",
};
const ROLE_ORDER = ["WK", "BAT", "AR", "BOWL"];

interface TeamPreviewProps {
  players: MatchPlayer[];
  captainId: string;
  viceCaptainId: string;
  totalCredits: number;
  team1Short?: string;
  team2Short?: string;
}

const TeamPreview = ({
  players,
  captainId,
  viceCaptainId,
  totalCredits,
  team1Short,
  team2Short,
}: TeamPreviewProps) => {
  const grouped = ROLE_ORDER.map((role) => ({
    role,
    label: ROLE_LABELS[role],
    icon: ROLE_ICONS[role],
    players: players.filter((mp) => mp.player.role === role),
  }));

  const team1Count = players.filter((p) => p.player.team === team1Short).length;
  const team2Count = players.filter((p) => p.player.team === team2Short).length;
  const captainPlayer = players.find((p) => p.player_id === captainId);
  const vcPlayer = players.find((p) => p.player_id === viceCaptainId);
  const creditPercent = (totalCredits / 100) * 100;

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="space-y-3"
    >
      {/* Captain & VC Highlight Strip */}
      <motion.div variants={item} className="flex gap-2">
        {captainPlayer && (
          <div className="flex-1 glass-card-premium p-3 relative overflow-hidden">
            <div className="shimmer absolute inset-0 opacity-30" />
            <div className="relative z-10 flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-xl gradient-premium flex items-center justify-center shadow-lg">
                <Crown className="h-4 w-4 text-primary-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[9px] uppercase tracking-widest text-[hsl(var(--gold))] font-bold">Captain • 2x</p>
                <p className="text-sm font-bold truncate">{captainPlayer.player.name}</p>
                <p className="text-[10px] text-muted-foreground">{captainPlayer.player.team}</p>
              </div>
            </div>
          </div>
        )}
        {vcPlayer && (
          <div className="flex-1 glass-card p-3 border-primary/20 relative overflow-hidden">
            <div className="relative z-10 flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center shadow-lg">
                <Star className="h-4 w-4 text-primary-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[9px] uppercase tracking-widest text-primary font-bold">Vice-Captain • 1.5x</p>
                <p className="text-sm font-bold truncate">{vcPlayer.player.name}</p>
                <p className="text-[10px] text-muted-foreground">{vcPlayer.player.team}</p>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={item} className="grid grid-cols-3 gap-2">
        <div className="glass-card p-3 text-center">
          <Users className="h-4 w-4 mx-auto mb-1 text-primary" />
          <p className="font-display font-bold text-lg">{players.length}</p>
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Players</p>
        </div>
        <div className="glass-card p-3 text-center">
          <TrendingUp className="h-4 w-4 mx-auto mb-1 text-accent" />
          <p className="font-display font-bold text-lg">{totalCredits.toFixed(1)}</p>
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Credits</p>
        </div>
        <div className="glass-card p-3 text-center">
          <Sparkles className="h-4 w-4 mx-auto mb-1 text-[hsl(var(--gold))]" />
          <p className="font-display font-bold text-lg">{(100 - totalCredits).toFixed(1)}</p>
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Remaining</p>
        </div>
      </motion.div>

      {/* Team Distribution */}
      {team1Short && team2Short && (
        <motion.div variants={item} className="glass-card p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Team Composition</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-primary min-w-[40px]">{team1Short}</span>
            <div className="flex-1 h-3 rounded-full bg-secondary overflow-hidden flex">
              <motion.div
                className="h-full bg-primary/80 rounded-l-full"
                initial={{ width: 0 }}
                animate={{ width: `${(team1Count / 11) * 100}%` }}
                transition={{ duration: 0.6, delay: 0.2 }}
              />
              <motion.div
                className="h-full bg-accent/80 rounded-r-full"
                initial={{ width: 0 }}
                animate={{ width: `${(team2Count / 11) * 100}%` }}
                transition={{ duration: 0.6, delay: 0.3 }}
              />
            </div>
            <span className="text-xs font-bold text-accent min-w-[40px] text-right">{team2Short}</span>
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-[10px] text-primary font-semibold">{team1Count} players</span>
            <span className="text-[10px] text-accent font-semibold">{team2Count} players</span>
          </div>
        </motion.div>
      )}

      {/* Credit Usage Bar */}
      <motion.div variants={item} className="glass-card p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Credit Usage</span>
          <span className="text-xs font-bold">
            <span className={cn(creditPercent > 95 ? "text-destructive" : "text-primary")}>{creditPercent.toFixed(0)}%</span>
          </span>
        </div>
        <div className="h-2 rounded-full bg-secondary overflow-hidden">
          <motion.div
            className={cn(
              "h-full rounded-full",
              creditPercent > 95 ? "bg-destructive" : "gradient-primary"
            )}
            initial={{ width: 0 }}
            animate={{ width: `${creditPercent}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
      </motion.div>

      {/* Grouped Players */}
      {grouped.map(({ role, label, icon, players: rolePlayers }) =>
        rolePlayers.length > 0 ? (
          <motion.div key={role} variants={item} className="space-y-1.5">
            <div className="flex items-center gap-2 px-1 mb-2">
              <span className="text-sm">{icon}</span>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                {label}
              </p>
              <div className="h-px flex-1 bg-border/30" />
              <span className="text-[10px] text-muted-foreground font-medium">{rolePlayers.length}</span>
            </div>
            {rolePlayers.map((mp) => {
              const isCaptain = captainId === mp.player_id;
              const isVC = viceCaptainId === mp.player_id;
              return (
                <motion.div
                  key={mp.player_id}
                  variants={item}
                  className={cn(
                    "glass-card p-3 flex items-center gap-3 transition-all",
                    isCaptain && "border-[hsl(var(--gold)/0.3)] bg-[hsl(var(--gold)/0.03)]",
                    isVC && "border-primary/30 bg-primary/5"
                  )}
                >
                  {/* Avatar */}
                  <div
                    className={cn(
                      "h-10 w-10 rounded-xl flex items-center justify-center font-display font-bold text-xs relative",
                      isCaptain
                        ? "gradient-premium text-primary-foreground"
                        : isVC
                        ? "gradient-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground"
                    )}
                  >
                    {mp.player.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)}
                    {(isCaptain || isVC) && (
                      <div className={cn(
                        "absolute -top-1 -right-1 h-4 w-4 rounded-full flex items-center justify-center",
                        isCaptain ? "bg-[hsl(var(--gold))]" : "bg-primary"
                      )}>
                        {isCaptain ? (
                          <Crown className="h-2.5 w-2.5 text-primary-foreground" />
                        ) : (
                          <Star className="h-2.5 w-2.5 text-primary-foreground" />
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold truncate">
                        {mp.player.name}
                      </p>
                      {isCaptain && (
                        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-md bg-[hsl(var(--gold)/0.15)] text-[hsl(var(--gold))]">
                          2x
                        </span>
                      )}
                      {isVC && (
                        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-md bg-primary/15 text-primary">
                          1.5x
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {mp.player.team} • {mp.player.credit_value} Cr
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs font-bold font-display">{mp.player.credit_value}</p>
                    <p className="text-[9px] text-muted-foreground">Cr</p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        ) : null
      )}
    </motion.div>
  );
};

export default TeamPreview;
