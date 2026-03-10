import { Crown, Star, Trash2, Eye, ChevronDown, ChevronUp } from "lucide-react";
import { UserTeam } from "@/hooks/useUserTeams";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

const ROLE_LABELS: Record<string, string> = {
  WK: "WK", BAT: "BAT", AR: "AR", BOWL: "BOWL",
};

interface SavedTeamCardProps {
  team: UserTeam;
  onDelete: (teamId: string) => void;
  deleting: boolean;
}

const SavedTeamCard = ({ team, onDelete, deleting }: SavedTeamCardProps) => {
  const [expanded, setExpanded] = useState(false);

  const roleGroups = team.team_players.reduce<Record<string, typeof team.team_players>>((acc, tp) => {
    const role = tp.player.role;
    if (!acc[role]) acc[role] = [];
    acc[role].push(tp);
    return acc;
  }, {});

  return (
    <div className="glass-card overflow-hidden">
      {/* Header */}
      <div
        className="p-3.5 flex items-center gap-3 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center">
          <span className="font-display font-bold text-xs text-primary-foreground">T</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">{team.name || "Team"}</p>
          <div className="flex items-center gap-2 mt-0.5">
            {team.captain && (
              <span className="flex items-center gap-0.5 text-[9px] font-bold text-[hsl(var(--gold))]">
                <Crown className="h-3 w-3" /> {team.captain.name.split(" ").pop()}
              </span>
            )}
            {team.vice_captain && (
              <span className="flex items-center gap-0.5 text-[9px] font-bold text-primary">
                <Star className="h-3 w-3" /> {team.vice_captain.name.split(" ").pop()}
              </span>
            )}
            <span className="text-[10px] text-muted-foreground">
              • {team.total_credits?.toFixed(1)} Cr
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => { e.stopPropagation(); onDelete(team.id); }}
            disabled={deleting}
            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Expanded player list */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border/20 px-3.5 py-3 space-y-2">
              {["WK", "BAT", "AR", "BOWL"].map(role =>
                roleGroups[role]?.length ? (
                  <div key={role}>
                    <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold mb-1">
                      {ROLE_LABELS[role]}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {roleGroups[role].map(tp => {
                        const isCaptain = team.captain_id === tp.player_id;
                        const isVC = team.vice_captain_id === tp.player_id;
                        return (
                          <span
                            key={tp.player_id}
                            className={cn(
                              "text-[11px] px-2 py-1 rounded-lg font-medium",
                              isCaptain
                                ? "bg-[hsl(var(--gold)/0.15)] text-[hsl(var(--gold))]"
                                : isVC
                                ? "bg-primary/15 text-primary"
                                : "bg-secondary text-foreground/70"
                            )}
                          >
                            {tp.player.name.split(" ").pop()}
                            {isCaptain && " (C)"}
                            {isVC && " (VC)"}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ) : null
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SavedTeamCard;
