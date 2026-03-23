import { Crown, Star, Trash2, Edit3, ChevronDown, ChevronUp, Eye, Pencil } from "lucide-react";
import { UserTeam } from "@/hooks/useUserTeams";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import TeamPreview from "@/components/team/TeamPreview";
import { MatchPlayer } from "@/hooks/useMatchPlayers";

const ROLE_LABELS: Record<string, string> = {
  WK: "WK", BAT: "BAT", AR: "AR", BOWL: "BOWL",
};

interface SavedTeamCardProps {
  team: UserTeam;
  onDelete?: (teamId: string) => void;
  onEdit?: (teamId: string) => void;
  deleting?: boolean;
  team1Short?: string;
  team2Short?: string;
}

const SavedTeamCard = ({ team, onDelete, onEdit, deleting, team1Short, team2Short }: SavedTeamCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editNameOpen, setEditNameOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const queryClient = useQueryClient();

  const nameEditsLeft = 2 - ((team as any).name_edit_count || 0);

  const handleTeamNameEdit = async () => {
    if (!newTeamName.trim()) return;
    if (nameEditsLeft <= 0) {
      toast.error("You can only rename a team 2 times");
      return;
    }
    setSavingName(true);
    try {
      const { error } = await (supabase.from("user_teams" as any) as any)
        .update({ name: newTeamName.trim(), name_edit_count: ((team as any).name_edit_count || 0) + 1 })
        .eq("id", team.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["user-teams"] });
      toast.success(`Team renamed! (${nameEditsLeft - 1} change${nameEditsLeft - 1 !== 1 ? 's' : ''} left)`);
      setEditNameOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to rename team");
    } finally {
      setSavingName(false);
    }
  };

  const roleGroups = team.team_players.reduce<Record<string, typeof team.team_players>>((acc, tp) => {
    const role = tp.player.role;
    if (!acc[role]) acc[role] = [];
    acc[role].push(tp);
    return acc;
  }, {});

  // Convert UserTeam players to MatchPlayer format for TeamPreview
  const previewPlayers: MatchPlayer[] = team.team_players.map((tp) => ({
    id: tp.player_id,
    match_id: team.match_id,
    player_id: tp.player_id,
    is_playing: true,
    fantasy_points: 0,
    selected_by_percent: 0,
    player: {
      id: tp.player.id,
      name: tp.player.name,
      role: tp.player.role,
      team: tp.player.team,
      credit_value: tp.player.credit_value,
      photo_url: (tp.player as any).photo_url ?? null,
    },
  }));

  return (
    <>
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
            <div className="flex items-center gap-1">
              <p className="text-sm font-semibold">{team.name || "Team"}</p>
              {nameEditsLeft > 0 && (
                <button
                  onClick={(e) => { e.stopPropagation(); setNewTeamName(team.name || ""); setEditNameOpen(true); }}
                  className="p-0.5 rounded hover:bg-secondary/50 transition-colors"
                >
                  <Pencil className="h-3 w-3 text-muted-foreground hover:text-primary" />
                </button>
              )}
            </div>
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

          <div className="flex items-center gap-1">
            {/* Preview button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => { e.stopPropagation(); setPreviewOpen(true); }}
              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10"
              title="Preview team"
            >
              <Eye className="h-4 w-4" />
            </Button>
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => { e.stopPropagation(); onEdit(team.id); }}
                className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10"
              >
                <Edit3 className="h-4 w-4" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => { e.stopPropagation(); onDelete(team.id); }}
                disabled={deleting}
                className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
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

      {/* Full Team Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-md p-0 gap-0 bg-transparent border-0 shadow-none [&>button]:hidden overflow-y-auto max-h-[90vh]">
          <TeamPreview
            players={previewPlayers}
            captainId={team.captain_id || ""}
            viceCaptainId={team.vice_captain_id || ""}
            totalCredits={team.total_credits || 0}
            team1Short={team1Short}
            team2Short={team2Short}
            teamName={team.name || undefined}
            onClose={() => setPreviewOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SavedTeamCard;
