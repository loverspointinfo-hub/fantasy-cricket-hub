import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMatch } from "@/hooks/useMatches";
import { useMatchPlayers, MatchPlayer } from "@/hooks/useMatchPlayers";
import { useUserTeams } from "@/hooks/useUserTeams";
import { ArrowLeft, Check, Star, Crown, Users, Minus, Plus, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { item } from "@/lib/animations";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import TeamPreview from "@/components/team/TeamPreview";

const MAX_CREDITS = 100;
const ROLE_LABELS: Record<string, string> = { BAT: "Batsman", BOWL: "Bowler", AR: "All-Rounder", WK: "Wicket-Keeper" };
const ROLE_CONSTRAINTS: Record<string, { min: number; max: number }> = {
  WK: { min: 1, max: 4 },
  BAT: { min: 3, max: 6 },
  AR: { min: 1, max: 4 },
  BOWL: { min: 3, max: 6 },
};
const ROLE_ORDER = ["WK", "BAT", "AR", "BOWL"];

type Step = "select" | "captain" | "preview";

const CreateTeam = () => {
  const { matchId, teamId } = useParams();
  const navigate = useNavigate();
  const { data: match } = useMatch(matchId || "");
  const { data: matchPlayers = [], isLoading } = useMatchPlayers(matchId || "");
  const { data: userTeams = [] } = useUserTeams(matchId || "");

  const isEditing = !!teamId;
  const editingTeam = useMemo(() => userTeams.find(t => t.id === teamId), [userTeams, teamId]);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [captainId, setCaptainId] = useState<string | null>(null);
  const [viceCaptainId, setViceCaptainId] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("select");
  const [activeRole, setActiveRole] = useState("WK");
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Load existing team data when editing
  useEffect(() => {
    if (isEditing && editingTeam && !initialized) {
      const playerIds = new Set(editingTeam.team_players.map(tp => tp.player_id));
      setSelected(playerIds);
      setCaptainId(editingTeam.captain_id);
      setViceCaptainId(editingTeam.vice_captain_id);
      setInitialized(true);
    }
  }, [isEditing, editingTeam, initialized]);

  const selectedPlayers = useMemo(() =>
    matchPlayers.filter(mp => selected.has(mp.player_id)),
    [matchPlayers, selected]
  );

  const usedCredits = useMemo(() =>
    selectedPlayers.reduce((sum, mp) => sum + mp.player.credit_value, 0),
    [selectedPlayers]
  );

  const remainingCredits = MAX_CREDITS - usedCredits;

  const roleCount = useMemo(() => {
    const counts: Record<string, number> = { WK: 0, BAT: 0, AR: 0, BOWL: 0 };
    selectedPlayers.forEach(mp => { counts[mp.player.role] = (counts[mp.player.role] || 0) + 1; });
    return counts;
  }, [selectedPlayers]);

  const canSelect = (mp: MatchPlayer) => {
    if (selected.has(mp.player_id)) return true;
    if (selected.size >= 11) return false;
    if (mp.player.credit_value > remainingCredits) return false;
    const rc = ROLE_CONSTRAINTS[mp.player.role];
    if (rc && roleCount[mp.player.role] >= rc.max) return false;
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
    return true;
  };

  const handleContinue = () => {
    if (!isValidTeam()) {
      toast.error("Select exactly 11 players meeting role requirements");
      return;
    }
    setStep("captain");
  };

  const handleSave = async () => {
    if (!captainId || !viceCaptainId) {
      toast.error("Select both Captain and Vice-Captain");
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Please login first"); navigate("/login"); return; }

      if (isEditing && teamId) {
        // Update existing team
        const { error: updateError } = await (supabase
          .from("user_teams" as any) as any)
          .update({
            captain_id: captainId,
            vice_captain_id: viceCaptainId,
            total_credits: usedCredits,
          })
          .eq("id", teamId);
        if (updateError) throw updateError;

        // Delete old team_players and insert new ones
        const { error: delError } = await (supabase.from("team_players" as any) as any).delete().eq("team_id", teamId);
        if (delError) throw delError;

        const teamPlayers = Array.from(selected).map(playerId => ({
          team_id: teamId,
          player_id: playerId,
        }));
        const { error: tpError } = await (supabase.from("team_players" as any) as any).insert(teamPlayers);
        if (tpError) throw tpError;

        toast.success("Team updated successfully!");
      } else {
        // Create new team
        const { data: team, error: teamError } = await (supabase
          .from("user_teams" as any)
          .insert({
            user_id: user.id,
            match_id: matchId!,
            captain_id: captainId,
            vice_captain_id: viceCaptainId,
            total_credits: usedCredits,
          }) as any)
          .select()
          .single();

        if (teamError) throw teamError;

        const teamPlayers = Array.from(selected).map(playerId => ({
          team_id: team.id,
          player_id: playerId,
        }));
        const { error: tpError } = await (supabase.from("team_players" as any) as any).insert(teamPlayers);
        if (tpError) throw tpError;

        toast.success("Team created successfully!");
      }

      navigate(`/match/${matchId}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to save team");
    } finally {
      setSaving(false);
    }
  };

  const playersForRole = matchPlayers.filter(mp => mp.player.role === activeRole);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col">
      <div className="floating-orb w-64 h-64 bg-neon-green -top-20 -right-20" />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/30" style={{
        background: "linear-gradient(180deg, hsl(228 18% 5% / 0.95), hsl(228 18% 5% / 0.8))",
        backdropFilter: "blur(20px)",
      }}>
        <div className="mx-auto max-w-lg px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => step === "preview" ? setStep("captain") : step === "captain" ? setStep("select") : navigate(-1)}
            className="p-1.5 rounded-xl hover:bg-secondary transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <p className="font-display text-sm font-bold">
              {step === "select" ? (isEditing ? "Edit Team" : "Create Team") : step === "captain" ? "Select Captain" : "Team Preview"}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {match ? `${match.team1_short} vs ${match.team2_short}` : ""}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Players</p>
            <p className="font-display font-bold text-sm">
              <span className="text-primary">{selected.size}</span>/11
            </p>
          </div>
        </div>
      </header>

      {step === "preview" ? (
        /* Team Preview */
        <div className="flex-1 mx-auto max-w-lg w-full px-4 py-5 space-y-3 overflow-y-auto pb-32">
          {/* Edit buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setStep("select")}
              className="flex-1 rounded-xl h-10 text-xs font-semibold border-border/50 hover:border-primary/50 hover:bg-primary/5"
            >
              <Users className="h-4 w-4 mr-1.5" /> Edit Players
            </Button>
            <Button
              variant="outline"
              onClick={() => setStep("captain")}
              className="flex-1 rounded-xl h-10 text-xs font-semibold border-border/50 hover:border-primary/50 hover:bg-primary/5"
            >
              <Crown className="h-4 w-4 mr-1.5" /> Edit C / VC
            </Button>
          </div>

          <TeamPreview
            players={selectedPlayers}
            captainId={captainId!}
            viceCaptainId={viceCaptainId!}
            totalCredits={usedCredits}
            team1Short={match?.team1_short}
            team2Short={match?.team2_short}
          />

          {/* Save CTA */}
          <div className="fixed bottom-20 left-0 right-0 z-50 px-4 pb-3">
            <div className="mx-auto max-w-lg">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="w-full gradient-primary font-bold rounded-xl h-12 text-base disabled:opacity-40 relative overflow-hidden"
              >
                <span className="shimmer absolute inset-0" />
                <span className="relative z-10">{saving ? "Saving..." : "Confirm & Save Team"}</span>
              </Button>
            </div>
          </div>
        </div>
      ) : step === "select" ? (
        <>
          {/* Credit bar */}
          <div className="mx-auto max-w-lg w-full px-4 py-3 border-b border-border/20" style={{
            background: "hsl(228 16% 8% / 0.9)",
          }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Credits Used</span>
              <span className="font-display font-bold text-sm">
                <span className={cn(remainingCredits < 10 ? "text-neon-red" : "text-neon-green")}>
                  {remainingCredits.toFixed(1)}
                </span>
                <span className="text-muted-foreground"> / {MAX_CREDITS}</span>
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
              <motion.div
                className="h-full rounded-full gradient-primary"
                animate={{ width: `${(usedCredits / MAX_CREDITS) * 100}%` }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            </div>

            {/* Role counts */}
            <div className="flex gap-2 mt-3">
              {ROLE_ORDER.map(role => {
                const rc = ROLE_CONSTRAINTS[role];
                const count = roleCount[role];
                const isFull = count >= rc.max;
                const isMin = count >= rc.min;
                return (
                  <div key={role} className={cn(
                    "flex-1 text-center py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider",
                    isFull ? "bg-primary/15 text-primary border border-primary/20" :
                    isMin ? "bg-neon-green/10 text-neon-green border border-neon-green/20" :
                    "bg-secondary text-muted-foreground border border-border/30"
                  )}>
                    {role} {count}/{rc.max}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Role tabs */}
          <div className="mx-auto max-w-lg w-full px-4 pt-3">
            <div className="flex gap-1 rounded-xl bg-secondary/50 p-1 border border-border/30">
              {ROLE_ORDER.map(role => (
                <button
                  key={role}
                  onClick={() => setActiveRole(role)}
                  className={cn(
                    "flex-1 py-2 rounded-lg text-xs font-semibold transition-all relative",
                    activeRole === role ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {activeRole === role && (
                    <motion.div
                      layoutId="role-tab"
                      className="absolute inset-0 rounded-lg gradient-primary opacity-15"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{ROLE_LABELS[role]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Player list */}
          <div className="flex-1 mx-auto max-w-lg w-full px-4 py-3 space-y-2 overflow-y-auto pb-24">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeRole}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-2"
              >
                {playersForRole.length === 0 ? (
                  <div className="glass-card flex flex-col items-center py-12 text-muted-foreground">
                    <Users className="h-8 w-8 opacity-20 mb-2" />
                    <p className="text-sm">No {ROLE_LABELS[activeRole]}s available</p>
                  </div>
                ) : (
                  playersForRole.map(mp => {
                    const isSelected = selected.has(mp.player_id);
                    const canAdd = canSelect(mp);
                    return (
                      <motion.div
                        key={mp.player_id}
                        variants={item}
                        initial="hidden"
                        animate="show"
                        onClick={() => canAdd && togglePlayer(mp.player_id)}
                        className={cn(
                          "glass-card p-3.5 flex items-center gap-3 cursor-pointer transition-all",
                          isSelected && "border-primary/40 bg-primary/5",
                          !canAdd && !isSelected && "opacity-40 cursor-not-allowed"
                        )}
                      >
                        {/* Player avatar */}
                        <div className={cn(
                          "h-11 w-11 rounded-xl flex items-center justify-center font-display font-bold text-xs",
                          isSelected ? "gradient-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                        )}>
                          {mp.player.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{mp.player.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-muted-foreground">{mp.player.team}</span>
                            <span className="text-[10px] text-muted-foreground/40">•</span>
                            <span className="text-[10px] text-muted-foreground">
                              Sel by {mp.selected_by_percent}%
                            </span>
                          </div>
                        </div>

                        <div className="text-right mr-2">
                          <p className="font-display font-bold text-sm">{mp.player.credit_value}</p>
                          <p className="text-[9px] text-muted-foreground uppercase">Credits</p>
                        </div>

                        <div className={cn(
                          "h-7 w-7 rounded-lg flex items-center justify-center transition-all",
                          isSelected ? "gradient-primary" : "bg-secondary border border-border/50"
                        )}>
                          {isSelected ? (
                            <Check className="h-4 w-4 text-primary-foreground" />
                          ) : (
                            <Plus className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Bottom CTA */}
          <div className="fixed bottom-20 left-0 right-0 z-50 px-4 pb-3">
            <div className="mx-auto max-w-lg">
              {selected.size === 11 && !isValidTeam() && (
                <p className="text-[11px] text-center mb-2 text-destructive font-medium">
                  Fix role requirements: {ROLE_ORDER.filter(r => roleCount[r] < ROLE_CONSTRAINTS[r].min).map(r => `${ROLE_LABELS[r]} (need ${ROLE_CONSTRAINTS[r].min - roleCount[r]} more)`).join(", ")}
                </p>
              )}
              {selected.size < 11 && (
                <p className="text-[11px] text-center mb-2 text-muted-foreground">
                  Select {11 - selected.size} more player{11 - selected.size > 1 ? "s" : ""}
                </p>
              )}
              <Button
                onClick={handleContinue}
                disabled={!isValidTeam()}
                className="w-full gradient-primary font-bold rounded-xl h-12 text-base disabled:opacity-40 relative overflow-hidden"
              >
                <span className="shimmer absolute inset-0" />
                <span className="relative z-10">Continue — Select Captain</span>
              </Button>
            </div>
          </div>
        </>
      ) : (
        /* Captain Selection */
        <div className="flex-1 mx-auto max-w-lg w-full px-4 py-5 space-y-3 overflow-y-auto pb-24">
          <div className="glass-card p-4 flex items-center gap-3">
            <Info className="h-5 w-5 text-neon-cyan flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              Captain gets <span className="text-primary font-bold">2x</span> points, Vice-Captain gets <span className="text-primary font-bold">1.5x</span> points
            </p>
          </div>

          {selectedPlayers.map(mp => {
            const isCaptain = captainId === mp.player_id;
            const isVC = viceCaptainId === mp.player_id;
            return (
              <motion.div
                key={mp.player_id}
                variants={item}
                initial="hidden"
                animate="show"
                className={cn(
                  "glass-card p-3.5 flex items-center gap-3 transition-all",
                  (isCaptain || isVC) && "border-primary/40 bg-primary/5"
                )}
              >
                <div className={cn(
                  "h-11 w-11 rounded-xl flex items-center justify-center font-display font-bold text-xs",
                  isCaptain ? "gradient-premium text-primary-foreground" :
                  isVC ? "gradient-primary text-primary-foreground" :
                  "bg-secondary text-muted-foreground"
                )}>
                  {mp.player.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{mp.player.name}</p>
                  <p className="text-[10px] text-muted-foreground">{ROLE_LABELS[mp.player.role]} • {mp.player.team}</p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isCaptain) {
                        setCaptainId(null);
                      } else {
                        if (viceCaptainId === mp.player_id) setViceCaptainId(null);
                        setCaptainId(mp.player_id);
                      }
                    }}
                    className={cn(
                      "h-9 w-9 rounded-xl flex items-center justify-center text-[10px] font-bold transition-all border",
                      isCaptain ? "gradient-premium text-primary-foreground border-transparent" : "bg-secondary text-muted-foreground border-border/50 hover:border-gold/50"
                    )}
                  >
                    {isCaptain ? <Crown className="h-4 w-4" /> : "C"}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isVC) {
                        setViceCaptainId(null);
                      } else {
                        if (captainId === mp.player_id) setCaptainId(null);
                        setViceCaptainId(mp.player_id);
                      }
                    }}
                    className={cn(
                      "h-9 w-9 rounded-xl flex items-center justify-center text-[10px] font-bold transition-all border",
                      isVC ? "gradient-primary text-primary-foreground border-transparent" : "bg-secondary text-muted-foreground border-border/50 hover:border-primary/50"
                    )}
                  >
                    {isVC ? <Star className="h-4 w-4" /> : "VC"}
                  </button>
                </div>
              </motion.div>
            );
          })}

          {/* Preview CTA */}
          <div className="fixed bottom-20 left-0 right-0 z-50 px-4 pb-3">
            <div className="mx-auto max-w-lg">
              <Button
                onClick={() => { if (captainId && viceCaptainId) setStep("preview"); else toast.error("Select both Captain and Vice-Captain"); }}
                disabled={!captainId || !viceCaptainId}
                className="w-full gradient-primary font-bold rounded-xl h-12 text-base disabled:opacity-40 relative overflow-hidden"
              >
                <span className="shimmer absolute inset-0" />
                <span className="relative z-10">Preview Team</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateTeam;
