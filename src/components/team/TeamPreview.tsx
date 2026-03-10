import { Crown, Star, Shield } from "lucide-react";
import { MatchPlayer } from "@/hooks/useMatchPlayers";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { item } from "@/lib/animations";

const ROLE_LABELS: Record<string, string> = {
  WK: "Wicket-Keeper",
  BAT: "Batsman",
  AR: "All-Rounder",
  BOWL: "Bowler",
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
    players: players.filter((mp) => mp.player.role === role),
  }));

  const team1Count = players.filter((p) => p.player.team === team1Short).length;
  const team2Count = players.filter((p) => p.player.team === team2Short).length;

  return (
    <div className="space-y-4">
      {/* Summary card */}
      <motion.div
        variants={item}
        initial="hidden"
        animate="show"
        className="glass-card p-4 space-y-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <span className="font-display font-bold text-sm">Team Summary</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {totalCredits.toFixed(1)} / 100 Credits
          </span>
        </div>

        {team1Short && team2Short && (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden flex">
              <div
                className="h-full bg-primary/80 rounded-l-full"
                style={{ width: `${(team1Count / 11) * 100}%` }}
              />
              <div
                className="h-full bg-accent/80 rounded-r-full"
                style={{ width: `${(team2Count / 11) * 100}%` }}
              />
            </div>
            <div className="flex gap-3 text-[10px] font-semibold">
              <span className="text-primary">
                {team1Short} ({team1Count})
              </span>
              <span className="text-accent">
                {team2Short} ({team2Count})
              </span>
            </div>
          </div>
        )}
      </motion.div>

      {/* Grouped players */}
      {grouped.map(({ role, label, players: rolePlayers }) =>
        rolePlayers.length > 0 ? (
          <div key={role} className="space-y-2">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold px-1">
              {label} ({rolePlayers.length})
            </p>
            {rolePlayers.map((mp) => {
              const isCaptain = captainId === mp.player_id;
              const isVC = viceCaptainId === mp.player_id;
              return (
                <motion.div
                  key={mp.player_id}
                  variants={item}
                  initial="hidden"
                  animate="show"
                  className={cn(
                    "glass-card p-3 flex items-center gap-3",
                    (isCaptain || isVC) && "border-primary/40 bg-primary/5"
                  )}
                >
                  {/* Avatar */}
                  <div
                    className={cn(
                      "h-10 w-10 rounded-xl flex items-center justify-center font-display font-bold text-xs",
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
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold truncate">
                        {mp.player.name}
                      </p>
                      {isCaptain && (
                        <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-[hsl(var(--gold)/0.15)] text-[hsl(var(--gold))]">
                          <Crown className="h-3 w-3" /> C
                        </span>
                      )}
                      {isVC && (
                        <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-primary/15 text-primary">
                          <Star className="h-3 w-3" /> VC
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {mp.player.team} • {mp.player.credit_value} Cr
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground">
                      Sel {mp.selected_by_percent}%
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : null
      )}
    </div>
  );
};

export default TeamPreview;
