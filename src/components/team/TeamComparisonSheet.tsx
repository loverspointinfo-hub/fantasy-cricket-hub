import { useState, useMemo } from "react";
import { ArrowLeftRight, Crown, Star, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { UserTeam } from "@/hooks/useUserTeams";
import { motion, AnimatePresence } from "framer-motion";

interface TeamComparisonSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userTeams: UserTeam[];
  allTeams: UserTeam[];
}

const ROLE_ORDER = ["WK", "BAT", "AR", "BOWL"];
const ROLE_LABELS: Record<string, string> = { WK: "Wicket-Keeper", BAT: "Batsman", AR: "All-Rounder", BOWL: "Bowler" };

const TeamComparisonSheet = ({ open, onOpenChange, userTeams, allTeams }: TeamComparisonSheetProps) => {
  const [myTeamId, setMyTeamId] = useState<string>("");
  const [oppTeamId, setOppTeamId] = useState<string>("");
  const [step, setStep] = useState<"select" | "compare">("select");

  const myTeam = allTeams.find(t => t.id === myTeamId);
  const oppTeam = allTeams.find(t => t.id === oppTeamId);

  const otherTeams = allTeams.filter(t => t.id !== myTeamId);

  const handleCompare = () => {
    if (!myTeamId || !oppTeamId) return;
    setStep("compare");
  };

  const handleReset = () => {
    setMyTeamId("");
    setOppTeamId("");
    setStep("select");
  };

  // Build comparison data
  const comparison = useMemo(() => {
    if (!myTeam || !oppTeam) return null;

    const myPlayerIds = new Set(myTeam.team_players.map(tp => tp.player_id));
    const oppPlayerIds = new Set(oppTeam.team_players.map(tp => tp.player_id));

    const commonIds = [...myPlayerIds].filter(id => oppPlayerIds.has(id));
    const onlyMyIds = [...myPlayerIds].filter(id => !oppPlayerIds.has(id));
    const onlyOppIds = [...oppPlayerIds].filter(id => !myPlayerIds.has(id));

    const myPoints = myTeam.total_points || 0;
    const oppPoints = oppTeam.total_points || 0;
    const diff = myPoints - oppPoints;

    // Get player details with points
    const getPlayerInfo = (team: UserTeam, playerId: string) => {
      const tp = team.team_players.find(p => p.player_id === playerId);
      if (!tp) return null;
      const isCaptain = team.captain_id === playerId;
      const isVC = team.vice_captain_id === playerId;
      return {
        ...tp.player,
        player_id: playerId,
        isCaptain,
        isVC,
        multiplier: isCaptain ? 2 : isVC ? 1.5 : 1,
      };
    };

    // Group by role for side-by-side
    const allRoles = ROLE_ORDER;
    const roleComparison = allRoles.map(role => {
      const myRolePlayers = myTeam.team_players
        .filter(tp => tp.player.role === role)
        .map(tp => getPlayerInfo(myTeam, tp.player_id)!);
      const oppRolePlayers = oppTeam.team_players
        .filter(tp => tp.player.role === role)
        .map(tp => getPlayerInfo(oppTeam, tp.player_id)!);
      return { role, myPlayers: myRolePlayers, oppPlayers: oppRolePlayers };
    });

    return {
      myPoints,
      oppPoints,
      diff,
      commonCount: commonIds.length,
      uniqueMyCount: onlyMyIds.length,
      uniqueOppCount: onlyOppIds.length,
      commonIds: new Set(commonIds),
      roleComparison,
    };
  }, [myTeam, oppTeam]);

  return (
    <Sheet open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) handleReset(); }}>
      <SheetContent side="bottom" className="rounded-t-3xl border-t border-border/20 bg-background px-0 pb-0 max-h-[90vh]">
        <div className="flex justify-center pt-2 pb-1">
          <div className="h-1 w-10 rounded-full bg-border/40" />
        </div>
        <SheetHeader className="px-5 pb-3">
          <SheetTitle className="font-display text-lg text-left flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4 text-primary" />
            Compare Teams
          </SheetTitle>
        </SheetHeader>

        {step === "select" ? (
          <div className="px-5 overflow-y-auto pb-4" style={{ maxHeight: "calc(90vh - 220px)" }}>
            {/* Select My Team */}
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Your Team</p>
            <div className="space-y-1.5 mb-5">
              {userTeams.map(team => (
                <div
                  key={team.id}
                  onClick={() => { setMyTeamId(team.id); if (oppTeamId === team.id) setOppTeamId(""); }}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border",
                    myTeamId === team.id
                      ? "border-primary/30 bg-primary/5"
                      : "border-border/15 bg-secondary/20 hover:border-border/30"
                  )}
                >
                  <div className={cn(
                    "h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                    myTeamId === team.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                  )}>
                    T
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{team.name || "Team"}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {team.team_players.length} players • {team.total_credits?.toFixed(1)} Cr
                      {team.total_points ? ` • ${team.total_points} pts` : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Select Opponent Team */}
            {myTeamId && (
              <>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Compare With</p>
                <div className="space-y-1.5">
                  {otherTeams.length === 0 ? (
                    <p className="text-xs text-muted-foreground/50 text-center py-6">No other teams available to compare</p>
                  ) : otherTeams.map(team => (
                    <div
                      key={team.id}
                      onClick={() => setOppTeamId(team.id)}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border",
                        oppTeamId === team.id
                          ? "border-[hsl(var(--gold))/0.3] bg-[hsl(var(--gold))/0.05]"
                          : "border-border/15 bg-secondary/20 hover:border-border/30"
                      )}
                    >
                      <div className={cn(
                        "h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                        oppTeamId === team.id ? "bg-[hsl(var(--gold))] text-black" : "bg-secondary text-muted-foreground"
                      )}>
                        T
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{team.name || "Team"}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {team.team_players.length} players • {team.total_credits?.toFixed(1)} Cr
                          {team.total_points ? ` • ${team.total_points} pts` : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : comparison && myTeam && oppTeam ? (
          <div className="overflow-y-auto pb-4" style={{ maxHeight: "calc(90vh - 180px)" }}>
            {/* Points Summary Header */}
            <div className="px-5 mb-4">
              <div className="flex items-stretch gap-2">
                {/* My Team Score */}
                <div className="flex-1 text-center rounded-xl p-3 border border-primary/20 bg-primary/5">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Your Team</p>
                  <p className="text-xs font-bold truncate mb-1">{myTeam.name || "Team"}</p>
                  <p className="font-display text-2xl font-bold text-primary">{comparison.myPoints}</p>
                  <p className="text-[9px] text-muted-foreground">Fantasy Pts</p>
                </div>

                {/* Diff Badge */}
                <div className="flex flex-col items-center justify-center gap-1">
                  <div className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center",
                    comparison.diff > 0 ? "bg-primary/15" : comparison.diff < 0 ? "bg-destructive/15" : "bg-secondary"
                  )}>
                    {comparison.diff > 0 ? (
                      <TrendingUp className="h-5 w-5 text-primary" />
                    ) : comparison.diff < 0 ? (
                      <TrendingDown className="h-5 w-5 text-destructive" />
                    ) : (
                      <Minus className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <span className={cn(
                    "text-xs font-bold",
                    comparison.diff > 0 ? "text-primary" : comparison.diff < 0 ? "text-destructive" : "text-muted-foreground"
                  )}>
                    {comparison.diff > 0 ? "+" : ""}{comparison.diff}
                  </span>
                </div>

                {/* Opponent Score */}
                <div className="flex-1 text-center rounded-xl p-3 border border-[hsl(var(--gold))/0.2] bg-[hsl(var(--gold))/0.05]">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Opponent</p>
                  <p className="text-xs font-bold truncate mb-1">{oppTeam.name || "Team"}</p>
                  <p className="font-display text-2xl font-bold text-[hsl(var(--gold))]">{comparison.oppPoints}</p>
                  <p className="text-[9px] text-muted-foreground">Fantasy Pts</p>
                </div>
              </div>

              {/* Overlap Stats */}
              <div className="flex gap-2 mt-3">
                <div className="flex-1 text-center p-2 rounded-lg bg-secondary/30">
                  <p className="text-lg font-bold text-foreground">{comparison.commonCount}</p>
                  <p className="text-[9px] text-muted-foreground">Common</p>
                </div>
                <div className="flex-1 text-center p-2 rounded-lg bg-primary/5">
                  <p className="text-lg font-bold text-primary">{comparison.uniqueMyCount}</p>
                  <p className="text-[9px] text-muted-foreground">Only Yours</p>
                </div>
                <div className="flex-1 text-center p-2 rounded-lg bg-[hsl(var(--gold))/0.05]">
                  <p className="text-lg font-bold text-[hsl(var(--gold))]">{comparison.uniqueOppCount}</p>
                  <p className="text-[9px] text-muted-foreground">Only Opp</p>
                </div>
              </div>
            </div>

            {/* Role-by-role comparison */}
            <div className="px-5 space-y-3">
              {comparison.roleComparison.map(({ role, myPlayers, oppPlayers }) => {
                if (myPlayers.length === 0 && oppPlayers.length === 0) return null;
                const maxLen = Math.max(myPlayers.length, oppPlayers.length);
                return (
                  <div key={role}>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-2 px-1">
                      {ROLE_LABELS[role] || role}
                    </p>
                    <div className="space-y-1">
                      {/* Column headers */}
                      <div className="flex items-center text-[9px] text-muted-foreground/50 uppercase tracking-wider px-1">
                        <span className="flex-1">Your Pick</span>
                        <span className="w-8" />
                        <span className="flex-1 text-right">Opp Pick</span>
                      </div>
                      {Array.from({ length: maxLen }).map((_, i) => {
                        const my = myPlayers[i];
                        const opp = oppPlayers[i];
                        const isCommon = my && opp && comparison.commonIds.has(my.player_id) && my.player_id === opp.player_id;

                        return (
                          <div key={i} className={cn(
                            "flex items-center gap-1 p-2 rounded-lg",
                            isCommon ? "bg-secondary/40 border border-border/10" : "bg-secondary/20"
                          )}>
                            {/* My Player */}
                            <div className="flex-1 min-w-0">
                              {my ? (
                                <div className="flex items-center gap-1.5">
                                  {my.isCaptain && <Crown className="h-3 w-3 text-[hsl(var(--gold))] shrink-0" />}
                                  {my.isVC && <Star className="h-3 w-3 text-primary shrink-0" />}
                                  <span className={cn(
                                    "text-[11px] font-semibold truncate",
                                    isCommon ? "text-foreground/60" : "text-foreground"
                                  )}>
                                    {my.name.split(" ").pop()}
                                  </span>
                                  {my.isCaptain && <span className="text-[8px] text-[hsl(var(--gold))]">2x</span>}
                                  {my.isVC && <span className="text-[8px] text-primary">1.5x</span>}
                                </div>
                              ) : (
                                <span className="text-[10px] text-muted-foreground/30">—</span>
                              )}
                            </div>

                            {/* Middle indicator */}
                            <div className="w-8 flex justify-center">
                              {isCommon ? (
                                <span className="text-[8px] bg-secondary px-1.5 py-0.5 rounded text-muted-foreground font-bold">SAME</span>
                              ) : (
                                <span className="text-[8px] text-muted-foreground/20">vs</span>
                              )}
                            </div>

                            {/* Opp Player */}
                            <div className="flex-1 min-w-0 text-right">
                              {opp ? (
                                <div className="flex items-center justify-end gap-1.5">
                                  {opp.isCaptain && <span className="text-[8px] text-[hsl(var(--gold))]">2x</span>}
                                  {opp.isVC && <span className="text-[8px] text-primary">1.5x</span>}
                                  <span className={cn(
                                    "text-[11px] font-semibold truncate",
                                    isCommon ? "text-foreground/60" : "text-foreground"
                                  )}>
                                    {opp.name.split(" ").pop()}
                                  </span>
                                  {opp.isCaptain && <Crown className="h-3 w-3 text-[hsl(var(--gold))] shrink-0" />}
                                  {opp.isVC && <Star className="h-3 w-3 text-primary shrink-0" />}
                                </div>
                              ) : (
                                <span className="text-[10px] text-muted-foreground/30">—</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="px-5 mt-4">
              <Button variant="outline" onClick={handleReset} className="w-full rounded-xl">
                Compare Other Teams
              </Button>
            </div>
          </div>
        ) : null}

        {/* Compare CTA */}
        {step === "select" && (
          <div className="px-5 py-4 border-t border-border/15 safe-bottom" style={{ background: "hsl(228 18% 5% / 0.8)" }}>
            <Button
              onClick={handleCompare}
              disabled={!myTeamId || !oppTeamId}
              className="w-full font-bold rounded-2xl h-12 text-sm disabled:opacity-30 border-0"
              style={{
                background: !myTeamId || !oppTeamId ? "hsl(228 14% 15%)" : "linear-gradient(135deg, hsl(0 85% 55%), hsl(42 85% 55%))",
              }}
            >
              <ArrowLeftRight className="h-4 w-4 mr-2" />
              Compare Teams
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default TeamComparisonSheet;
