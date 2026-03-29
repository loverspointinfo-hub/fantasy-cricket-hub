import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMatch } from "@/hooks/useMatches";
import { useMatchPlayers, MatchPlayer } from "@/hooks/useMatchPlayers";
import { useUserTeams } from "@/hooks/useUserTeams";
import { ArrowLeft, Check, Crown, Users, Plus, Info, Eye, HelpCircle, CircleMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { item } from "@/lib/animations";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import TeamPreview from "@/components/team/TeamPreview";
import { useCountdown } from "@/hooks/useCountdown";

const MAX_CREDITS = 100;
const ROLE_LABELS: Record<string, string> = { BAT: "Batsman", BOWL: "Bowler", AR: "All-Rounder", WK: "Wicket-Keeper" };
const ROLE_SHORT: Record<string, string> = { BAT: "BAT", BOWL: "BOWL", AR: "AR", WK: "WK" };
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
  const { data: match, isLoading: matchLoading } = useMatch(matchId || "");
  const { data: matchPlayers = [], isLoading } = useMatchPlayers(matchId || "");
  const { data: userTeams = [] } = useUserTeams(matchId || "");
  const countdown = useCountdown(match?.entry_deadline ?? "");

  const isEditing = !!teamId;
  const editingTeam = useMemo(() => userTeams.find(t => t.id === teamId), [userTeams, teamId]);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [captainId, setCaptainId] = useState<string | null>(null);
  const [viceCaptainId, setViceCaptainId] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("select");
  const [activeRole, setActiveRole] = useState("WK");
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (match && match.status !== "upcoming") {
      toast.error("Team editing is locked — match is " + match.status);
      navigate(`/match/${matchId}`, { replace: true });
    } else if (match && new Date(match.entry_deadline) <= new Date()) {
      toast.error("Entry deadline has passed");
      navigate(`/match/${matchId}`, { replace: true });
    }
  }, [match, matchId, navigate]);

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

  // Team-wise counts
  const team1Count = useMemo(() => selectedPlayers.filter(p => p.player.team === match?.team1_short).length, [selectedPlayers, match]);
  const team2Count = useMemo(() => selectedPlayers.filter(p => p.player.team === match?.team2_short).length, [selectedPlayers, match]);

  const canSelect = (mp: MatchPlayer) => {
    if (selected.has(mp.player_id)) return true;
    if (selected.size >= 11) return false;
    if (mp.player.credit_value > remainingCredits) return false;
    const rc = ROLE_CONSTRAINTS[mp.player.role];
    if (rc && roleCount[mp.player.role] >= rc.max) return false;
    // Max 10 from one team
    const sameTeamCount = selectedPlayers.filter(p => p.player.team === mp.player.team).length;
    if (sameTeamCount >= 10) return false;
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
    if (isEditing && match && (match.status !== "upcoming" || new Date(match.entry_deadline).getTime() <= Date.now())) {
      toast.error("Team editing is locked once the match is live");
      navigate(`/match/${matchId}`);
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Please login first"); navigate("/login"); return; }

      if (isEditing && teamId) {
        const { error: updateError } = await (supabase
          .from("user_teams" as any) as any)
          .update({
            captain_id: captainId,
            vice_captain_id: viceCaptainId,
            total_credits: usedCredits,
          })
          .eq("id", teamId);
        if (updateError) throw updateError;

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
        // Auto-name: "1st Team", "2nd Team", "3rd Team", etc.
        const teamNumber = userTeams.length + 1;
        const suffix = teamNumber === 1 ? "st" : teamNumber === 2 ? "nd" : teamNumber === 3 ? "rd" : "th";
        const autoName = `${teamNumber}${suffix} Team`;

        const { data: team, error: teamError } = await (supabase
          .from("user_teams" as any)
          .insert({
            user_id: user.id,
            match_id: matchId!,
            name: autoName,
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

  const captainPlayer = selectedPlayers.find(mp => mp.player_id === captainId);
  const vcPlayer = selectedPlayers.find(mp => mp.player_id === viceCaptainId);

  const playersForRole = matchPlayers.filter(mp => mp.player.role === activeRole);
  const isTeamEditingLocked = !!match && (match.status !== "upcoming" || new Date(match.entry_deadline).getTime() <= Date.now());

  if (isEditing && isTeamEditingLocked) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <p className="text-muted-foreground text-center px-6">Teams cannot be edited after the match deadline has passed.</p>
        <Button onClick={() => navigate(-1)} variant="outline" className="rounded-xl">Go Back</Button>
      </div>
    );
  }

  if (isLoading || matchLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col bg-background">
      {/* ───── HEADER ───── */}
      <header className="sticky top-0 z-40" style={{
        background: "linear-gradient(180deg, hsl(228 18% 6%), hsl(228 18% 5%))",
        borderBottom: "1px solid hsl(228 12% 14%)",
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
              {step === "select" ? (isEditing ? "Edit Team" : "Create Team") : step === "captain" ? "Choose Captain & V. Captain" : "Team Preview"}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {!countdown.isExpired ? `${countdown.label} Left` : match?.league || ""}
            </p>
          </div>
          <button className="h-8 w-8 rounded-full flex items-center justify-center"
            style={{ background: "hsl(var(--neon-red))", }}>
            <HelpCircle className="h-4 w-4 text-white" />
          </button>
        </div>
      </header>

      {step === "preview" ? (
        <div className="flex-1 mx-auto max-w-lg w-full px-4 py-5 space-y-3 overflow-y-auto pb-32">
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

          <div className="fixed bottom-20 left-0 right-0 z-50 px-4 pb-3">
            <div className="mx-auto max-w-lg">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="w-full font-bold rounded-xl h-12 text-base disabled:opacity-40 relative overflow-hidden text-white"
                style={{ background: "hsl(0 85% 50%)" }}
              >
                {saving ? "Saving..." : isEditing ? "Update Team" : "Confirm & Save Team"}
              </Button>
            </div>
          </div>
        </div>
      ) : step === "select" ? (
        <>
          {/* ───── TEAM HEADER BAR ───── */}
          <div className="mx-auto max-w-lg w-full" style={{
            background: "hsl(228 16% 8%)",
            borderBottom: "1px solid hsl(228 12% 14%)",
          }}>
            {/* Max from team notice */}
            <div className="text-center py-1.5" style={{ background: "hsl(228 14% 11%)" }}>
              <p className="text-[10px] text-muted-foreground">Max 10 Players from a team</p>
            </div>

            {/* Team counts + credits */}
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Players</p>
                <p className="font-display font-bold text-lg">
                  <span className="text-primary">{selected.size}</span><span className="text-muted-foreground">/11</span>
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full flex items-center justify-center text-[9px] font-bold"
                    style={{ background: match?.team1_color || "hsl(228 16% 20%)", color: "white", border: "2px solid hsl(228 12% 25%)" }}>
                    {match?.team1_short?.slice(0, 3)}
                  </div>
                  <div className="text-center">
                    <p className="font-display font-bold text-sm">{match?.team1_short}</p>
                    <p className="text-xs text-muted-foreground">{team1Count}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-center">
                    <p className="font-display font-bold text-sm">{match?.team2_short}</p>
                    <p className="text-xs text-muted-foreground">{team2Count}</p>
                  </div>
                  <div className="h-8 w-8 rounded-full flex items-center justify-center text-[9px] font-bold"
                    style={{ background: match?.team2_color || "hsl(228 16% 20%)", color: "white", border: "2px solid hsl(228 12% 25%)" }}>
                    {match?.team2_short?.slice(0, 3)}
                  </div>
                </div>
              </div>

              <div className="text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Credits Left</p>
                <p className="font-display font-bold text-lg">
                  <span className={cn(remainingCredits < 10 ? "text-[hsl(var(--neon-red))]" : "text-foreground")}>
                    {remainingCredits.toFixed(1)}
                  </span>
                </p>
              </div>
            </div>

            {/* Player slot indicators */}
            <div className="px-4 pb-2 flex items-center gap-1.5 justify-center">
              {Array.from({ length: 11 }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-6 w-6 rounded-md flex items-center justify-center text-[10px] font-bold transition-all",
                    i < selected.size
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground/40 border border-border/30"
                  )}
                >
                  {i + 1}
                </div>
              ))}
              <button className="h-6 w-6 rounded-md flex items-center justify-center bg-secondary border border-border/30 ml-1">
                <CircleMinus className="h-3.5 w-3.5 text-muted-foreground/40" />
              </button>
            </div>

            {/* Scrolling tip */}
            <div className="overflow-hidden" style={{ background: "hsl(152 100% 50% / 0.08)" }}>
              <div className="py-1.5 px-4">
                <p className="text-[10px] text-primary font-medium text-center animate-pulse">
                  📢 Please do due research before creating team. Lineup feature is for reference.
                </p>
              </div>
            </div>
          </div>

          {/* ───── ROLE TABS ───── */}
          <div className="mx-auto max-w-lg w-full" style={{
            background: "hsl(228 16% 8%)",
            borderBottom: "2px solid hsl(228 12% 14%)",
          }}>
            <div className="flex">
              {ROLE_ORDER.map(role => {
                const isActive = activeRole === role;
                return (
                  <button
                    key={role}
                    onClick={() => setActiveRole(role)}
                    className={cn(
                      "flex-1 py-2.5 text-xs font-bold transition-all relative text-center uppercase",
                      isActive ? "text-primary" : "text-muted-foreground/50"
                    )}
                  >
                    {ROLE_SHORT[role]}({roleCount[role]})
                    {isActive && (
                      <motion.div
                        layoutId="role-tab-indicator"
                        className="absolute bottom-0 left-0 right-0 h-[2px]"
                        style={{ background: "hsl(var(--neon-red))" }}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Role constraint hint */}
          <div className="mx-auto max-w-lg w-full px-4 py-2 text-center" style={{ background: "hsl(228 14% 7%)" }}>
            <p className="text-[11px] text-muted-foreground">
              Pick {ROLE_CONSTRAINTS[activeRole].min}-{ROLE_CONSTRAINTS[activeRole].max} {ROLE_LABELS[activeRole]}
              {" "}<Info className="h-3 w-3 inline -mt-0.5 text-muted-foreground/40" />
            </p>
          </div>

          {/* Column header */}
          <div className="mx-auto max-w-lg w-full px-4 py-2 flex items-center" style={{
            background: "hsl(var(--neon-red) / 0.06)",
            borderBottom: "1px solid hsl(228 12% 14%)",
          }}>
            <span className="text-[10px] text-muted-foreground font-semibold flex-1 pl-14">Selected BY</span>
            <span className="text-[10px] text-muted-foreground font-semibold w-20 text-center">Avg. Points</span>
            <span className="text-[10px] text-muted-foreground font-semibold w-16 text-right">Credits</span>
            <span className="w-8" />
          </div>

          {/* ───── PLAYER LIST ───── */}
          <div className="flex-1 mx-auto max-w-lg w-full overflow-y-auto pb-28">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeRole}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                {playersForRole.length === 0 ? (
                  <div className="flex flex-col items-center py-12 text-muted-foreground">
                    <Users className="h-8 w-8 opacity-20 mb-2" />
                    <p className="text-sm">No {ROLE_LABELS[activeRole]}s available</p>
                  </div>
                ) : (
                  playersForRole.map(mp => {
                    const isSelected = selected.has(mp.player_id);
                    const canAdd = canSelect(mp);
                    return (
                      <div
                        key={mp.player_id}
                        onClick={() => canAdd && togglePlayer(mp.player_id)}
                        className={cn(
                          "px-4 py-3 flex items-center gap-3 cursor-pointer transition-all border-b",
                          isSelected
                            ? "bg-primary/5 border-primary/10"
                            : "border-border/10 hover:bg-secondary/30",
                          !canAdd && !isSelected && "opacity-40 cursor-not-allowed"
                        )}
                      >
                        {/* Info icon */}
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/player/${mp.player_id}`); }}
                          className="h-5 w-5 rounded-full border border-border/40 flex items-center justify-center flex-shrink-0"
                        >
                          <Info className="h-3 w-3 text-muted-foreground/50" />
                        </button>

                        {/* Player avatar with team badge */}
                        <div className="relative flex-shrink-0">
                          <div className="h-11 w-11 rounded-full flex items-center justify-center overflow-hidden bg-secondary border-2 border-border/20">
                            {mp.player.photo_url ? (
                              <img src={mp.player.photo_url} alt={mp.player.name} className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-xs font-bold text-muted-foreground">
                                {mp.player.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                              </span>
                            )}
                          </div>
                          {/* Team badge */}
                          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
                            <span className="text-[7px] font-bold px-1.5 py-[1px] rounded-sm text-white"
                              style={{ background: mp.player.team === match?.team1_short ? (match?.team1_color || "hsl(var(--neon-red))") : (match?.team2_color || "hsl(228 18% 25%)") }}>
                              {mp.player.team?.slice(0, 3) || "???"}
                            </span>
                          </div>
                        </div>

                        {/* Name + sel by */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{mp.player.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            Sel by {mp.selected_by_percent}%
                          </p>
                        </div>

                        {/* Avg Points */}
                        <div className="w-20 text-center">
                          <p className="text-sm font-bold">{mp.fantasy_points || 0}</p>
                        </div>

                        {/* Credits */}
                        <div className="w-16 text-right">
                          <p className="text-sm font-bold">{mp.player.credit_value}</p>
                        </div>

                        {/* Select indicator */}
                        <div className={cn(
                          "h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all",
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "border-2 border-[hsl(var(--neon-red))] text-[hsl(var(--neon-red))]"
                        )}>
                          {isSelected ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Plus className="h-4 w-4" />
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* ───── BOTTOM CTA ───── */}
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
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (selectedPlayers.length > 0) {
                      // Show team preview dialog inline
                      setStep("preview");
                    } else {
                      toast.error("Select players first");
                    }
                  }}
                  className="flex-1 rounded-xl h-12 text-sm font-bold border-[hsl(var(--neon-red))] text-[hsl(var(--neon-red))] hover:bg-[hsl(var(--neon-red)/0.05)]"
                >
                  Team Preview
                </Button>
                <Button
                  onClick={handleContinue}
                  disabled={!isValidTeam()}
                  className="flex-1 font-bold rounded-xl h-12 text-sm disabled:opacity-40 text-white"
                  style={{
                    background: isValidTeam() ? "hsl(0 85% 50%)" : undefined,
                  }}
                >
                  Continue
                </Button>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* ───── CAPTAIN SELECTION ───── */
        <div className="flex-1 mx-auto max-w-lg w-full flex flex-col overflow-hidden">
          {/* Team logos header */}
          <div className="px-4 py-4 flex items-center justify-center gap-6" style={{
            background: "hsl(var(--neon-red) / 0.06)",
            borderBottom: "1px solid hsl(228 12% 14%)",
          }}>
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-full flex items-center justify-center text-[9px] font-bold"
                style={{ background: match?.team1_color || "hsl(228 16% 20%)", color: "white", border: "2px solid hsl(228 12% 25%)" }}>
                {match?.team1_short?.slice(0, 3)}
              </div>
              <span className="font-display font-bold text-sm">{match?.team1_short}</span>
            </div>
            <span className="text-muted-foreground font-bold text-xs">VS</span>
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-sm">{match?.team2_short}</span>
              <div className="h-10 w-10 rounded-full flex items-center justify-center text-[9px] font-bold"
                style={{ background: match?.team2_color || "hsl(228 16% 20%)", color: "white", border: "2px solid hsl(228 12% 25%)" }}>
                {match?.team2_short?.slice(0, 3)}
              </div>
            </div>
          </div>

          {/* C/VC Info */}
          <div className="px-4 py-3 text-center" style={{
            background: "hsl(var(--neon-red) / 0.04)",
            borderBottom: "1px solid hsl(228 12% 14%)",
          }}>
            <p className="text-sm text-muted-foreground mb-2">Choose Captain and Vice Captain</p>
            <div className="flex items-center justify-center gap-8">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold"
                  style={{ background: "hsl(var(--neon-red))", color: "white" }}>
                  C
                </div>
                <span className="text-[11px] text-muted-foreground">Get 2x points</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold"
                  style={{ background: "hsl(152 80% 40%)", color: "white" }}>
                  VC
                </div>
                <span className="text-[11px] text-muted-foreground">Get 1.5x points</span>
              </div>
            </div>
          </div>

          {/* Table header */}
          <div className="px-4 py-2 flex items-center border-b border-border/20" style={{
            background: "hsl(228 16% 8%)",
          }}>
            <span className="text-[10px] text-muted-foreground font-semibold w-16">Type</span>
            <span className="text-[10px] text-muted-foreground font-semibold flex-1">Points</span>
            <span className="text-[10px] text-muted-foreground font-semibold w-16 text-center">% C BY</span>
            <span className="text-[10px] text-muted-foreground font-semibold w-16 text-center">% VC BY</span>
          </div>

          {/* Player list */}
          <div className="flex-1 overflow-y-auto pb-28">
            {selectedPlayers.map(mp => {
              const isCaptain = captainId === mp.player_id;
              const isVC = viceCaptainId === mp.player_id;
              // Mock C/VC percentages based on selected_by_percent
              const cPercent = (mp.selected_by_percent * 0.4).toFixed(2);
              const vcPercent = (mp.selected_by_percent * 0.25).toFixed(2);
              return (
                <div
                  key={mp.player_id}
                  className={cn(
                    "px-4 py-3 flex items-center border-b border-border/10 transition-colors",
                    (isCaptain || isVC) && "bg-primary/5"
                  )}
                >
                  {/* Info icon */}
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/player/${mp.player_id}`); }}
                    className="h-5 w-5 rounded-full border border-border/40 flex items-center justify-center flex-shrink-0 mr-2"
                  >
                    <Info className="h-3 w-3 text-muted-foreground/50" />
                  </button>

                  {/* Player avatar */}
                  <div className="relative flex-shrink-0 mr-2.5">
                    <div className="h-11 w-11 rounded-full flex items-center justify-center overflow-hidden bg-secondary border-2 border-border/20">
                      {mp.player.photo_url ? (
                        <img src={mp.player.photo_url} alt={mp.player.name} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-xs font-bold text-muted-foreground">
                          {mp.player.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                        </span>
                      )}
                    </div>
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
                      <span className="text-[7px] font-bold px-1.5 py-[1px] rounded-sm text-white"
                        style={{ background: mp.player.team === match?.team1_short ? (match?.team1_color || "hsl(var(--neon-red))") : (match?.team2_color || "hsl(228 18% 25%)") }}>
                        {mp.player.team?.slice(0, 3) || "???"}
                      </span>
                    </div>
                  </div>

                  {/* Name + points */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{mp.player.name}</p>
                    <p className="text-[10px] text-muted-foreground">{mp.fantasy_points || 0}</p>
                  </div>

                  {/* C button with % */}
                  <div className="flex flex-col items-center mx-2 w-14">
                    <button
                      onClick={() => {
                        if (isCaptain) {
                          setCaptainId(null);
                        } else {
                          if (viceCaptainId === mp.player_id) setViceCaptainId(null);
                          setCaptainId(mp.player_id);
                        }
                      }}
                      className={cn(
                        "h-9 w-9 rounded-full flex items-center justify-center text-[11px] font-bold transition-all",
                        isCaptain
                          ? "text-white"
                          : "border-2 border-border/50 text-muted-foreground hover:border-foreground/30"
                      )}
                      style={isCaptain ? { background: "hsl(var(--neon-red))" } : undefined}
                    >
                      C
                    </button>
                    <span className="text-[9px] text-muted-foreground mt-0.5">{cPercent}%</span>
                  </div>

                  {/* VC button with % */}
                  <div className="flex flex-col items-center w-14">
                    <button
                      onClick={() => {
                        if (isVC) {
                          setViceCaptainId(null);
                        } else {
                          if (captainId === mp.player_id) setCaptainId(null);
                          setViceCaptainId(mp.player_id);
                        }
                      }}
                      className={cn(
                        "h-9 w-9 rounded-full flex items-center justify-center text-[11px] font-bold transition-all",
                        isVC
                          ? "text-white"
                          : "border-2 border-border/50 text-muted-foreground hover:border-foreground/30"
                      )}
                      style={isVC ? { background: "hsl(152 80% 40%)" } : undefined}
                    >
                      VC
                    </button>
                    <span className="text-[9px] text-muted-foreground mt-0.5">{vcPercent}%</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom CTA */}
          <div className="fixed bottom-20 left-0 right-0 z-50 px-4 pb-3">
            <div className="mx-auto max-w-lg flex gap-2">
              <Button
                variant="outline"
                onClick={() => { if (captainId && viceCaptainId) setStep("preview"); else toast.error("Select both Captain and Vice-Captain"); }}
                disabled={!captainId || !viceCaptainId}
                className="flex-1 rounded-xl h-12 text-sm font-bold border-[hsl(var(--neon-red))] text-[hsl(var(--neon-red))] hover:bg-[hsl(var(--neon-red)/0.05)] disabled:opacity-40 disabled:border-border/50 disabled:text-muted-foreground"
              >
                Team Preview
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !captainId || !viceCaptainId}
                className="flex-1 font-bold rounded-xl h-12 text-sm disabled:opacity-40 text-white"
                style={{
                  background: captainId && viceCaptainId ? "hsl(0 85% 50%)" : undefined,
                }}
              >
                {saving ? "Saving..." : "Continue"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateTeam;
