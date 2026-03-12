import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, Plus, X, Crown, Star, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface AdminTeamEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team: any;
}

const ROLE_LABELS: Record<string, string> = { BAT: "Batsman", BOWL: "Bowler", AR: "All-Rounder", WK: "Wicket-Keeper" };
const ROLE_ORDER = ["WK", "BAT", "AR", "BOWL"];
const ROLE_CONSTRAINTS: Record<string, { min: number; max: number }> = {
  WK: { min: 1, max: 4 },
  BAT: { min: 3, max: 6 },
  AR: { min: 1, max: 4 },
  BOWL: { min: 3, max: 6 },
};
const MAX_CREDITS = 100;

const AdminTeamEditor = ({ open, onOpenChange, team }: AdminTeamEditorProps) => {
  const qc = useQueryClient();
  const matchId = team?.match_id;

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [captainId, setCaptainId] = useState<string | null>(null);
  const [viceCaptainId, setViceCaptainId] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [activeRole, setActiveRole] = useState("WK");

  // Fetch all match players for the match
  const { data: matchPlayers = [] } = useQuery({
    queryKey: ["admin-match-players", matchId],
    queryFn: async () => {
      const { data } = await supabase
        .from("match_players")
        .select("*, player:players(*)")
        .eq("match_id", matchId!)
        .eq("is_playing", true);
      return data ?? [];
    },
    enabled: !!matchId && open,
  });

  // Initialize state from team data
  if (team && !initialized && matchPlayers.length > 0) {
    const playerIds = new Set<string>((team.team_players ?? []).map((tp: any) => tp.player_id as string));
    setSelected(playerIds);
    setCaptainId(team.captain_id);
    setViceCaptainId(team.vice_captain_id);
    setInitialized(true);
  }

  // Reset when dialog closes
  const handleOpenChange = (o: boolean) => {
    if (!o) {
      setInitialized(false);
      setSelected(new Set());
      setCaptainId(null);
      setViceCaptainId(null);
      setActiveRole("WK");
    }
    onOpenChange(o);
  };

  const selectedPlayers = useMemo(() =>
    matchPlayers.filter((mp: any) => selected.has(mp.player_id)),
    [matchPlayers, selected]
  );

  const usedCredits = useMemo(() =>
    selectedPlayers.reduce((sum: number, mp: any) => sum + (mp.player?.credit_value ?? 0), 0),
    [selectedPlayers]
  );

  const roleCount = useMemo(() => {
    const counts: Record<string, number> = { WK: 0, BAT: 0, AR: 0, BOWL: 0 };
    selectedPlayers.forEach((mp: any) => { counts[mp.player?.role] = (counts[mp.player?.role] || 0) + 1; });
    return counts;
  }, [selectedPlayers]);

  const canSelectPlayer = (mp: any) => {
    if (selected.has(mp.player_id)) return true;
    if (selected.size >= 11) return false;
    if ((mp.player?.credit_value ?? 0) > (MAX_CREDITS - usedCredits)) return false;
    const rc = ROLE_CONSTRAINTS[mp.player?.role];
    if (rc && roleCount[mp.player?.role] >= rc.max) return false;
    return true;
  };

  const togglePlayer = (playerId: string) => {
    const next = new Set(selected);
    if (next.has(playerId)) {
      next.delete(playerId);
      if (captainId === playerId) setCaptainId(null);
      if (viceCaptainId === playerId) setViceCaptainId(null);
    } else {
      next.add(playerId);
    }
    setSelected(next);
  };

  const isValidTeam = () => {
    if (selected.size !== 11) return false;
    for (const role of ROLE_ORDER) {
      const rc = ROLE_CONSTRAINTS[role];
      if (roleCount[role] < rc.min || roleCount[role] > rc.max) return false;
    }
    return !!captainId && !!viceCaptainId;
  };

  const saveTeam = useMutation({
    mutationFn: async () => {
      if (!team?.id) throw new Error("No team");
      if (!isValidTeam()) throw new Error("Invalid team composition");

      // Update captain/VC and credits
      const { error: updateErr } = await (supabase.from("user_teams") as any)
        .update({
          captain_id: captainId,
          vice_captain_id: viceCaptainId,
          total_credits: usedCredits,
        })
        .eq("id", team.id);
      if (updateErr) throw updateErr;

      // Replace team_players
      const { error: delErr } = await (supabase.from("team_players") as any).delete().eq("team_id", team.id);
      if (delErr) throw delErr;

      const rows = Array.from(selected).map(pid => ({ team_id: team.id, player_id: pid }));
      const { error: insErr } = await (supabase.from("team_players") as any).insert(rows);
      if (insErr) throw insErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-user-teams"] });
      toast.success("Team updated successfully");
      handleOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const playersForRole = matchPlayers.filter((mp: any) => mp.player?.role === activeRole);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 pb-2 border-b border-border/30">
          <DialogTitle className="text-base">
            Edit Team: {team?.name}
            {team?.match && (
              <Badge className="ml-2 text-[9px]">{team.match.team1_short} vs {team.match.team2_short}</Badge>
            )}
            {team?.match?.status === "live" && (
              <Badge variant="destructive" className="ml-1 text-[9px]">LIVE</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Credits & Role counters */}
        <div className="px-4 py-3 border-b border-border/20 bg-secondary/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">Players: <span className="font-bold text-foreground">{selected.size}/11</span></span>
            <span className="text-xs text-muted-foreground">Credits: <span className={cn("font-bold", (MAX_CREDITS - usedCredits) < 10 ? "text-destructive" : "text-primary")}>{(MAX_CREDITS - usedCredits).toFixed(1)}</span> / {MAX_CREDITS}</span>
          </div>
          <div className="flex gap-1.5">
            {ROLE_ORDER.map(role => {
              const rc = ROLE_CONSTRAINTS[role];
              const count = roleCount[role];
              return (
                <div key={role} className={cn(
                  "flex-1 text-center py-1 rounded-md text-[9px] font-semibold border",
                  count >= rc.max ? "bg-primary/15 text-primary border-primary/20" :
                  count >= rc.min ? "bg-green-500/10 text-green-400 border-green-500/20" :
                  "bg-secondary text-muted-foreground border-border/30"
                )}>
                  {role} {count}/{rc.max}
                </div>
              );
            })}
          </div>
        </div>

        {/* Captain / VC Selection */}
        <div className="px-4 py-3 border-b border-border/20 grid grid-cols-2 gap-3">
          <div>
            <Label className="text-[10px] text-muted-foreground flex items-center gap-1 mb-1"><Crown className="h-3 w-3 text-amber-400" /> Captain (2x)</Label>
            <Select value={captainId || ""} onValueChange={v => { setCaptainId(v); if (viceCaptainId === v) setViceCaptainId(null); }}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {selectedPlayers.map((mp: any) => (
                  <SelectItem key={mp.player_id} value={mp.player_id} disabled={mp.player_id === viceCaptainId}>
                    {mp.player?.name} ({mp.player?.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground flex items-center gap-1 mb-1"><Star className="h-3 w-3 text-blue-400" /> Vice Captain (1.5x)</Label>
            <Select value={viceCaptainId || ""} onValueChange={v => { setViceCaptainId(v); if (captainId === v) setCaptainId(null); }}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {selectedPlayers.map((mp: any) => (
                  <SelectItem key={mp.player_id} value={mp.player_id} disabled={mp.player_id === captainId}>
                    {mp.player?.name} ({mp.player?.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Role tabs */}
        <div className="px-4 pt-3">
          <div className="flex gap-1 rounded-lg bg-secondary/50 p-0.5 border border-border/30">
            {ROLE_ORDER.map(role => (
              <button
                key={role}
                onClick={() => setActiveRole(role)}
                className={cn(
                  "flex-1 py-1.5 rounded-md text-[10px] font-semibold transition-all",
                  activeRole === role ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {ROLE_LABELS[role]}
              </button>
            ))}
          </div>
        </div>

        {/* Player list */}
        <ScrollArea className="flex-1 min-h-0 px-4 py-2">
          <div className="space-y-1.5 pb-2">
            {playersForRole.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-8">No {ROLE_LABELS[activeRole]}s available</p>
            ) : (
              playersForRole.map((mp: any) => {
                const isSelected = selected.has(mp.player_id);
                const canAdd = canSelectPlayer(mp);
                const isCaptain = mp.player_id === captainId;
                const isVC = mp.player_id === viceCaptainId;
                return (
                  <div
                    key={mp.player_id}
                    onClick={() => canAdd && togglePlayer(mp.player_id)}
                    className={cn(
                      "flex items-center gap-2.5 p-2.5 rounded-lg border transition-all cursor-pointer",
                      isSelected ? "border-primary/40 bg-primary/5" : "border-border/30 bg-secondary/20",
                      !canAdd && !isSelected && "opacity-35 cursor-not-allowed"
                    )}
                  >
                    <div className={cn(
                      "h-9 w-9 rounded-lg flex items-center justify-center font-bold text-[10px] shrink-0",
                      isSelected ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                    )}>
                      {mp.player?.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">
                        {mp.player?.name}
                        {isCaptain && <span className="ml-1 text-amber-400 text-[9px]">(C)</span>}
                        {isVC && <span className="ml-1 text-blue-400 text-[9px]">(VC)</span>}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{mp.player?.team} • {mp.player?.credit_value} cr</p>
                    </div>
                    <div className={cn(
                      "h-6 w-6 rounded-md flex items-center justify-center shrink-0",
                      isSelected ? "bg-primary" : "bg-secondary border border-border/50"
                    )}>
                      {isSelected ? <Check className="h-3.5 w-3.5 text-primary-foreground" /> : <Plus className="h-3.5 w-3.5 text-muted-foreground" />}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        {/* Save button */}
        <div className="p-4 border-t border-border/30">
          {!isValidTeam() && selected.size > 0 && (
            <p className="text-[10px] text-center text-destructive mb-2">
              {selected.size !== 11 ? `Select ${11 - selected.size} more player${11 - selected.size !== 1 ? "s" : ""}` :
               !captainId || !viceCaptainId ? "Select Captain & Vice Captain" :
               "Fix role requirements"}
            </p>
          )}
          <Button
            onClick={() => saveTeam.mutate()}
            disabled={!isValidTeam() || saveTeam.isPending}
            className="w-full h-10 font-bold"
          >
            {saveTeam.isPending ? "Saving..." : "Save Team Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdminTeamEditor;
