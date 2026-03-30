import { useState } from "react";
import { Copy, Check, ArrowRight } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { UserTeam } from "@/hooks/useUserTeams";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

interface CloneTeamSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team: UserTeam | null;
  matchId: string;
  existingTeamCount: number;
}

const CloneTeamSheet = ({ open, onOpenChange, team, matchId, existingTeamCount }: CloneTeamSheetProps) => {
  const [cloning, setCloning] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const handleClone = async () => {
    if (!team) return;
    setCloning(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Please login first"); return; }

      const teamNumber = existingTeamCount + 1;
      const suffix = teamNumber === 1 ? "st" : teamNumber === 2 ? "nd" : teamNumber === 3 ? "rd" : "th";
      const autoName = `${teamNumber}${suffix} Team`;

      const { data: newTeam, error: teamError } = await (supabase
        .from("user_teams" as any)
        .insert({
          user_id: user.id,
          match_id: matchId,
          name: autoName,
          captain_id: team.captain_id,
          vice_captain_id: team.vice_captain_id,
          total_credits: team.total_credits,
        }) as any)
        .select()
        .single();

      if (teamError) throw teamError;

      const teamPlayers = team.team_players.map(tp => ({
        team_id: newTeam.id,
        player_id: tp.player_id,
      }));
      const { error: tpError } = await (supabase.from("team_players" as any) as any).insert(teamPlayers);
      if (tpError) throw tpError;

      toast.success(`Team cloned as "${autoName}"!`);
      queryClient.invalidateQueries({ queryKey: ["user-teams"] });
      onOpenChange(false);

      // Navigate to edit the cloned team so user can swap players
      navigate(`/match/${matchId}/edit-team/${newTeam.id}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to clone team");
    } finally {
      setCloning(false);
    }
  };

  if (!team) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl border-t border-border/20 bg-background px-5 pb-8 max-h-[50vh]">
        <div className="flex justify-center pt-2 pb-1">
          <div className="h-1 w-10 rounded-full bg-border/40" />
        </div>
        <SheetHeader className="pb-4">
          <SheetTitle className="font-display text-lg text-left flex items-center gap-2">
            <Copy className="h-4 w-4 text-primary" />
            Clone Team
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          <div className="rounded-xl p-4 border border-border/20" style={{ background: "hsl(228 16% 10%)" }}>
            <p className="text-sm font-semibold">{team.name || "Team"}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {team.team_players.length} players • {team.total_credits?.toFixed(1)} Cr
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Check className="h-3.5 w-3.5 text-primary" />
            <span>Clone will copy all players, Captain & Vice-Captain</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ArrowRight className="h-3.5 w-3.5 text-primary" />
            <span>You can swap 1-2 players after cloning</span>
          </div>

          <Button
            onClick={handleClone}
            disabled={cloning}
            className="w-full font-bold rounded-2xl h-12 text-sm relative overflow-hidden border-0"
            style={{
              background: "linear-gradient(135deg, hsl(152 100% 50%), hsl(195 100% 55%))",
              boxShadow: "0 4px 24px hsl(152 100% 50% / 0.25)",
            }}
          >
            <span className="relative z-10 flex items-center gap-2 text-primary-foreground">
              <Copy className="h-4 w-4" />
              {cloning ? "Cloning..." : "Clone & Edit Team"}
            </span>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default CloneTeamSheet;
