import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Zap, Save, RefreshCw, Trophy, Users, Settings, Plus, Trash2, GripVertical, Radio, BookOpen, AlertTriangle, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface ScoringPreset {
  id: string;
  label: string;
  value: number;
  roles: string[];
  color: string;
  sort_order: number;
}

const ALL_ROLES = ["BAT", "BOWL", "AR", "WK"];

const COLOR_OPTIONS = [
  { label: "Gray", value: "bg-secondary/60 hover:bg-secondary" },
  { label: "Blue", value: "bg-blue-500/15 hover:bg-blue-500/30 text-blue-400" },
  { label: "Purple", value: "bg-purple-500/15 hover:bg-purple-500/30 text-purple-400" },
  { label: "Red", value: "bg-red-500/15 hover:bg-red-500/30 text-red-400" },
  { label: "Green", value: "bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-400" },
  { label: "Amber", value: "bg-amber-500/15 hover:bg-amber-500/30 text-amber-400" },
  { label: "Yellow", value: "bg-yellow-500/15 hover:bg-yellow-500/30 text-yellow-400" },
  { label: "Orange", value: "bg-orange-500/15 hover:bg-orange-500/30 text-orange-400" },
];

// ── Presets Hook ──
const useScoringPresets = () => {
  return useQuery({
    queryKey: ["scoring-presets"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("scoring_presets" as any) as any)
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ScoringPreset[];
    },
  });
};

// ── Preset Manager Component ──
const PresetManager = () => {
  const qc = useQueryClient();
  const { data: presets = [] } = useScoringPresets();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ label: "", value: "0", roles: [...ALL_ROLES], color: COLOR_OPTIONS[0].value });

  const addPreset = useMutation({
    mutationFn: async () => {
      const maxOrder = presets.length > 0 ? Math.max(...presets.map(p => p.sort_order)) : 0;
      const { error } = await (supabase.from("scoring_presets" as any) as any).insert({
        label: form.label,
        value: parseFloat(form.value),
        roles: form.roles,
        color: form.color,
        sort_order: maxOrder + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scoring-presets"] });
      setForm({ label: "", value: "0", roles: [...ALL_ROLES], color: COLOR_OPTIONS[0].value });
      toast.success("Preset added");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deletePreset = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("scoring_presets" as any) as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scoring-presets"] });
      toast.success("Preset deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleRole = (role: string) => {
    setForm(prev => ({
      ...prev,
      roles: prev.roles.includes(role) ? prev.roles.filter(r => r !== role) : [...prev.roles, role],
    }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 rounded-xl">
          <Settings className="h-3.5 w-3.5" /> Manage Presets
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Settings className="h-4 w-4" /> Scoring Presets
          </DialogTitle>
        </DialogHeader>

        {/* Existing presets list */}
        <div className="space-y-1.5 mt-2">
          {presets.map((p) => (
            <div key={p.id} className="flex items-center gap-2 p-2.5 rounded-xl bg-secondary/20 border border-border/20">
              <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
              <button className={cn("px-2 py-1 rounded-lg text-[10px] font-bold border border-border/20 shrink-0", p.color)}>
                {p.value > 0 ? "+" : ""}{p.value} {p.label}
              </button>
              <div className="flex-1 flex gap-1 flex-wrap">
                {p.roles.map(r => (
                  <span key={r} className="text-[9px] bg-secondary/50 px-1.5 py-0.5 rounded font-medium text-muted-foreground">{r}</span>
                ))}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive shrink-0"
                onClick={() => deletePreset.mutate(p.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>

        {/* Add new preset form */}
        <div className="mt-4 p-4 rounded-xl border border-border/30 bg-secondary/10 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Add New Preset</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[10px] text-muted-foreground">Label</Label>
              <Input
                value={form.label}
                onChange={e => setForm(p => ({ ...p, label: e.target.value }))}
                placeholder="e.g. Boundary"
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">Points Value</Label>
              <Input
                type="number"
                value={form.value}
                onChange={e => setForm(p => ({ ...p, value: e.target.value }))}
                className="h-8 text-sm"
                step="0.5"
              />
            </div>
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">Applicable Roles</Label>
            <div className="flex gap-3 mt-1.5">
              {ALL_ROLES.map(role => (
                <label key={role} className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <Checkbox
                    checked={form.roles.includes(role)}
                    onCheckedChange={() => toggleRole(role)}
                  />
                  {role}
                </label>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">Color</Label>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {COLOR_OPTIONS.map(c => (
                <button
                  key={c.label}
                  onClick={() => setForm(p => ({ ...p, color: c.value }))}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all",
                    c.value,
                    form.color === c.value ? "border-primary ring-1 ring-primary" : "border-border/20"
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          {/* Preview */}
          {form.label && (
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[10px] text-muted-foreground">Preview:</span>
              <span className={cn("px-2 py-1 rounded-lg text-[10px] font-bold border border-border/20", form.color)}>
                {parseFloat(form.value) >= 0 ? "+" : ""}{form.value} {form.label}
              </span>
            </div>
          )}
          <Button
            onClick={() => addPreset.mutate()}
            disabled={!form.label || addPreset.isPending}
            size="sm"
            className="w-full gap-1.5 rounded-xl"
          >
            <Plus className="h-3.5 w-3.5" /> Add Preset
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ── Scoring Rules Reference Card ──
const SCORING_RULES_DATA = [
  { category: "Batting", rules: [
    { label: "Per Run", value: "+1" },
    { label: "Per Boundary (4s)", value: "+1" },
    { label: "Per Six", value: "+2" },
    { label: "Half Century (50)", value: "+8" },
    { label: "Century (100)", value: "+16" },
    { label: "Duck (BAT/WK/AR)", value: "-2" },
  ]},
  { category: "Bowling", rules: [
    { label: "Per Wicket", value: "+25" },
    { label: "LBW/Bowled Bonus", value: "+8" },
    { label: "3 Wicket Haul", value: "+4" },
    { label: "4 Wicket Haul", value: "+8" },
    { label: "5 Wicket Haul", value: "+16" },
    { label: "Maiden Over", value: "+12" },
  ]},
  { category: "Fielding", rules: [
    { label: "Catch", value: "+8" },
    { label: "Stumping", value: "+12" },
    { label: "Run Out (Direct)", value: "+12" },
    { label: "Run Out (Indirect)", value: "+6" },
  ]},
  { category: "Economy Rate (min 2 overs)", rules: [
    { label: "Below 5", value: "+6" },
    { label: "5 to 6", value: "+4" },
    { label: "6 to 7", value: "+2" },
    { label: "10 to 11", value: "-2" },
    { label: "11 to 12", value: "-4" },
    { label: "Above 12", value: "-6" },
  ]},
  { category: "Strike Rate (min 10 balls, BAT/WK/AR)", rules: [
    { label: "Above 170", value: "+6" },
    { label: "150 to 170", value: "+4" },
    { label: "130 to 150", value: "+2" },
    { label: "60 to 70", value: "-2" },
    { label: "50 to 60", value: "-4" },
    { label: "Below 50", value: "-6" },
  ]},
  { category: "Other", rules: [
    { label: "Playing XI", value: "+4" },
  ]},
];

const ScoringRulesCard = () => {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 rounded-xl">
          <BookOpen className="h-3.5 w-3.5" /> Scoring Rules
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" /> Fantasy Scoring Rules
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          {SCORING_RULES_DATA.map((cat) => (
            <div key={cat.category}>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground mb-1.5">{cat.category}</p>
              <div className="rounded-xl border border-border/20 overflow-hidden">
                {cat.rules.map((rule, i) => (
                  <div key={rule.label} className={cn(
                    "flex items-center justify-between px-3 py-2 text-xs",
                    i % 2 === 0 ? "bg-secondary/10" : "bg-transparent"
                  )}>
                    <span className="text-foreground/80">{rule.label}</span>
                    <span className={cn(
                      "font-display font-bold tabular-nums",
                      rule.value.startsWith("+") ? "text-primary" : "text-destructive"
                    )}>{rule.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ── Auto Score Button with Match Completion Detection ──
const AutoScoreButton = ({ matchId, onComplete }: { matchId: string; onComplete: () => void }) => {
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [matchEndedAlert, setMatchEndedAlert] = useState<{ status: string } | null>(null);
  const qc = useQueryClient();

  const triggerAutoScore = async () => {
    if (!matchId) {
      toast.error("Select a match first");
      return;
    }
    setLoading(true);
    setMatchEndedAlert(null);
    try {
      const { data: match } = await (supabase.from("matches") as any)
        .select("team1_short, team2_short, status")
        .eq("id", matchId)
        .single();
      if (!match) throw new Error("Match not found");

      const { data: apiKeySetting } = await (supabase.from("site_settings") as any)
        .select("value")
        .eq("key", "cricketdata_api_key")
        .single();
      const apiKey = apiKeySetting?.value;
      if (!apiKey) throw new Error("CricketData API key not configured. Go to Settings to add it.");

      toast.info("Fetching live scorecard from API...");

      const searchRes = await fetch(`https://api.cricapi.com/v1/currentMatches?apikey=${apiKey}&offset=0`);
      const searchData = await searchRes.json();

      if (searchData.status !== "success" || !searchData.data) {
        throw new Error(`API error: ${searchData.info || "Failed to fetch current matches"}`);
      }

      const apiMatch = searchData.data.find((am: any) => {
        const t1 = (am.teamInfo?.[0]?.shortname || "").toUpperCase();
        const t2 = (am.teamInfo?.[1]?.shortname || "").toUpperCase();
        const m1 = match.team1_short.toUpperCase();
        const m2 = match.team2_short.toUpperCase();
        return (t1 === m1 && t2 === m2) || (t1 === m2 && t2 === m1);
      });

      if (!apiMatch) {
        throw new Error(`No live match found for ${match.team1_short} vs ${match.team2_short} in API`);
      }

      const scRes = await fetch(`https://api.cricapi.com/v1/match_scorecard?apikey=${apiKey}&id=${apiMatch.id}`);
      const scData = await scRes.json();

      if (scData.status !== "success" || !scData.data) {
        throw new Error("Failed to fetch scorecard data");
      }

      toast.info("Calculating fantasy points...");

      const { data, error } = await supabase.functions.invoke("auto-score-matches", {
        body: {
          match_id: matchId,
          scorecard_data: scData.data,
          api_match_status: apiMatch.status || "",
          match_ended: apiMatch.matchEnded || false,
        },
      });
      if (error) throw error;
      const result = data as any;
      if (result.error) throw new Error(result.error);
      const msg = `✅ ${result.players_updated || 0} players updated, ${result.teams_recalculated || 0} teams recalculated`;
      setLastResult(msg);
      toast.success(msg);
      if (result.errors?.length) {
        result.errors.forEach((e: string) => toast.warning(e));
      }

      // Match completion detection
      const matchEnded = apiMatch.matchEnded === true;
      const statusIndicatesEnd = /won|drawn|tied|no result/i.test(apiMatch.status || "");
      if ((matchEnded || statusIndicatesEnd) && match.status === "live") {
        setMatchEndedAlert({ status: apiMatch.status || "Match ended" });
        toast.warning("⚠️ This match appears to have ended! Consider completing & distributing winnings.", { duration: 8000 });
      }

      onComplete();
    } catch (err: any) {
      toast.error(err.message || "Auto-score failed");
      setLastResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteAndDistribute = async () => {
    try {
      await (supabase.from("matches") as any).update({ status: "completed" }).eq("id", matchId);
      const { error: recalcErr } = await (supabase.rpc as any)("recalculate_team_points", { p_match_id: matchId });
      if (recalcErr) throw recalcErr;
      const { data: count, error: distErr } = await (supabase.rpc as any)("distribute_contest_winnings", { p_match_id: matchId });
      if (distErr) throw distErr;
      toast.success(`✅ Match completed & winnings distributed to ${count} winners!`);
      setMatchEndedAlert(null);
      qc.invalidateQueries({ queryKey: ["admin-live-matches"] });
      qc.invalidateQueries({ queryKey: ["admin-match-players-scoring"] });
      qc.invalidateQueries({ queryKey: ["contest-leaderboard"] });
      onComplete();
    } catch (err: any) {
      toast.error(err.message || "Failed to complete match");
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Button
          onClick={triggerAutoScore}
          disabled={loading}
          variant="outline"
          size="sm"
          className="gap-1.5 rounded-xl border-primary/30 text-primary hover:bg-primary/10"
        >
          {loading ? (
            <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Scoring...</>
          ) : (
            <><Radio className="h-3.5 w-3.5" /> Auto Score (API)</>
          )}
        </Button>
        {lastResult && (
          <span className="text-[10px] text-muted-foreground max-w-[200px] truncate">{lastResult}</span>
        )}
      </div>

      {matchEndedAlert && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 p-3 rounded-xl border"
          style={{
            background: "hsl(45 100% 50% / 0.08)",
            borderColor: "hsl(45 100% 50% / 0.2)",
          }}
        >
          <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-amber-300">Match Ended</p>
            <p className="text-[10px] text-amber-400/70 truncate">{matchEndedAlert.status}</p>
          </div>
          <Button
            onClick={handleCompleteAndDistribute}
            size="sm"
            className="gap-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-xs h-7 shrink-0"
          >
            <Trophy className="h-3 w-3" /> Complete & Distribute
          </Button>
          <button onClick={() => setMatchEndedAlert(null)} className="p-1 hover:bg-secondary/50 rounded">
            <X className="h-3 w-3 text-muted-foreground" />
          </button>
        </motion.div>
      )}
    </div>
  );
};

// ── Main Live Scoring Page ──
const AdminLiveScoring = () => {
  const qc = useQueryClient();
  const [selectedMatchId, setSelectedMatchId] = useState<string>("");
  const [points, setPoints] = useState<Record<string, string>>({});

  const { data: presets = [] } = useScoringPresets();

  const { data: liveMatches = [] } = useQuery({
    queryKey: ["admin-live-matches"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("matches") as any)
        .select("*")
        .in("status", ["live", "completed"])
        .order("match_time", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 30_000,
  });

  const { data: matchPlayers = [], isLoading: loadingPlayers } = useQuery({
    queryKey: ["admin-match-players-scoring", selectedMatchId],
    queryFn: async () => {
      const { data, error } = await (supabase.from("match_players") as any)
        .select("*, players!match_players_player_id_fkey(name, role, team, photo_url)")
        .eq("match_id", selectedMatchId)
        .order("fantasy_points", { ascending: false });
      if (error) throw error;
      const pts: Record<string, string> = {};
      (data || []).forEach((mp: any) => { pts[mp.id] = String(mp.fantasy_points ?? 0); });
      setPoints(pts);
      return data ?? [];
    },
    enabled: !!selectedMatchId,
  });

  const { data: teamCount = 0 } = useQuery({
    queryKey: ["admin-team-count", selectedMatchId],
    queryFn: async () => {
      const { count, error } = await (supabase.from("user_teams") as any)
        .select("id", { count: "exact", head: true })
        .eq("match_id", selectedMatchId);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!selectedMatchId,
  });

  const savePoints = useMutation({
    mutationFn: async () => {
      for (const mp of matchPlayers) {
        const newPts = parseFloat(points[mp.id] || "0");
        if (newPts !== (mp.fantasy_points ?? 0)) {
          const { error } = await (supabase.from("match_players") as any)
            .update({ fantasy_points: newPts })
            .eq("id", mp.id);
          if (error) throw error;
        }
      }
      const { data, error } = await (supabase.rpc as any)("recalculate_team_points", { p_match_id: selectedMatchId });
      if (error) throw error;
      return data;
    },
    onSuccess: (count) => {
      qc.invalidateQueries({ queryKey: ["admin-match-players-scoring"] });
      qc.invalidateQueries({ queryKey: ["contest-leaderboard"] });
      qc.invalidateQueries({ queryKey: ["user-teams"] });
      toast.success(`Points saved! ${count} teams recalculated`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const distributeWinnings = useMutation({
    mutationFn: async () => {
      const { data, error } = await (supabase.rpc as any)("distribute_contest_winnings", { p_match_id: selectedMatchId });
      if (error) throw error;
      return data;
    },
    onSuccess: (count) => {
      qc.invalidateQueries({ queryKey: ["contest-leaderboard"] });
      qc.invalidateQueries({ queryKey: ["wallet"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["admin-live-matches"] });
      toast.success(`✅ Winnings distributed! ${count} winners credited.`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const selectedMatch = liveMatches.find((m: any) => m.id === selectedMatchId);

  const groupedPlayers = matchPlayers.reduce((acc: Record<string, any[]>, mp: any) => {
    const team = mp.players?.team || "Unknown";
    if (!acc[team]) acc[team] = [];
    acc[team].push(mp);
    return acc;
  }, {});

  const roleColors: Record<string, string> = {
    BAT: "bg-blue-500/15 text-blue-400 border-blue-500/20",
    BOWL: "bg-purple-500/15 text-purple-400 border-purple-500/20",
    AR: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    WK: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  };

  const getPresetsForRole = (role: string): ScoringPreset[] => {
    return presets.filter(p => p.roles.includes(role));
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <Zap className="h-5 w-5 text-[hsl(var(--neon-red))]" />
            Live Scoring
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Update player fantasy points during live matches
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AutoScoreButton matchId={selectedMatchId} onComplete={() => {
            qc.invalidateQueries({ queryKey: ["admin-match-players-scoring"] });
            qc.invalidateQueries({ queryKey: ["contest-leaderboard"] });
          }} />
          <PresetManager />
        </div>
      </div>

      {/* Match Selector */}
      <Card className="glass-card p-4">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Select Match</label>
        <Select value={selectedMatchId} onValueChange={setSelectedMatchId}>
          <SelectTrigger className="mt-2">
            <SelectValue placeholder="Choose a live or completed match" />
          </SelectTrigger>
          <SelectContent>
            {liveMatches.map((m: any) => (
              <SelectItem key={m.id} value={m.id}>
                <span className="flex items-center gap-2">
                  {m.status === "live" && <span className="h-2 w-2 rounded-full bg-[hsl(var(--neon-red))] animate-pulse" />}
                  {m.team1_short} vs {m.team2_short} — {m.league}
                  <Badge variant="outline" className="text-[9px] ml-1">{m.status}</Badge>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Card>

      {selectedMatchId && (
        <>
          {/* Info bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {selectedMatch?.status === "live" && (
                <Badge className="bg-[hsl(var(--neon-red)/0.15)] text-[hsl(var(--neon-red))] border-[hsl(var(--neon-red)/0.25)] text-[10px] font-bold gap-1 animate-pulse">
                  <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--neon-red))]" /> LIVE
                </Badge>
              )}
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Users className="h-3 w-3" /> {teamCount} teams
              </span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Trophy className="h-3 w-3" /> {matchPlayers.length} players
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => savePoints.mutate()} disabled={savePoints.isPending} className="gap-1.5 rounded-xl" size="sm">
                {savePoints.isPending ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Saving...</> : <><Save className="h-3.5 w-3.5" /> Save & Recalculate</>}
              </Button>
              {selectedMatch?.status === "live" && (
                <Button
                  onClick={async () => {
                    // Mark as completed first
                    await (supabase.from("matches") as any).update({ status: "completed" }).eq("id", selectedMatchId);
                    // Save points & recalculate
                    await savePoints.mutateAsync();
                    // Auto-distribute winnings
                    distributeWinnings.mutate();
                    qc.invalidateQueries({ queryKey: ["admin-live-matches"] });
                  }}
                  disabled={distributeWinnings.isPending}
                  className="gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700"
                  size="sm"
                >
                  {distributeWinnings.isPending ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Processing...</> : <><Trophy className="h-3.5 w-3.5" /> Complete & Distribute</>}
                </Button>
              )}
              {selectedMatch?.status === "completed" && (
                <Button
                  onClick={() => distributeWinnings.mutate()}
                  disabled={distributeWinnings.isPending}
                  className="gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700"
                  size="sm"
                >
                  {distributeWinnings.isPending ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Distributing...</> : <><Trophy className="h-3.5 w-3.5" /> Distribute Winnings</>}
                </Button>
              )}
            </div>
          </div>

          {/* Players by team */}
          {loadingPlayers ? (
            <p className="text-sm text-muted-foreground">Loading players...</p>
          ) : Object.keys(groupedPlayers).length === 0 ? (
            <Card className="glass-card p-8 text-center">
              <p className="text-sm text-muted-foreground">No players in this match lineup. Add players from the Matches page first.</p>
            </Card>
          ) : (
            Object.entries(groupedPlayers).map(([team, players]: [string, any[]]) => (
              <motion.div key={team} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="glass-card overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-border/20 flex items-center justify-between"
                    style={{ background: "hsl(228 16% 10% / 0.6)" }}>
                    <span className="text-xs font-bold uppercase tracking-wider">{team}</span>
                    <span className="text-[10px] text-muted-foreground">{players.length} players</span>
                  </div>
                  <div className="divide-y divide-border/10">
                    {players.map((mp: any) => {
                      const role = mp.players?.role || "";
                      const rolePresets = getPresetsForRole(role);

                      const addPts = (val: number) => {
                        setPoints(prev => ({ ...prev, [mp.id]: String(parseFloat(prev[mp.id] || "0") + val) }));
                      };

                      return (
                        <div key={mp.id} className="px-4 py-3 hover:bg-secondary/20 transition-colors space-y-2">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-secondary/50 flex items-center justify-center overflow-hidden shrink-0">
                              {mp.players?.photo_url ? (
                                <img src={mp.players.photo_url} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <span className="text-xs font-bold text-muted-foreground">{mp.players?.name?.charAt(0) || "?"}</span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold truncate">{mp.players?.name}</p>
                              <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0", roleColors[role] || "")}>
                                {role}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => setPoints(prev => ({ ...prev, [mp.id]: "0" }))}
                                className="h-7 w-7 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive text-xs font-bold flex items-center justify-center transition-colors"
                                title="Reset"
                              >↺</button>
                              <Input
                                type="number"
                                value={points[mp.id] || "0"}
                                onChange={(e) => setPoints(prev => ({ ...prev, [mp.id]: e.target.value }))}
                                className="w-20 h-8 text-center font-display font-bold text-sm"
                                step="0.5"
                              />
                              <span className="text-[10px] text-muted-foreground w-6">pts</span>
                            </div>
                          </div>
                          {/* Dynamic preset buttons from DB */}
                          <div className="flex flex-wrap gap-1.5 pl-12">
                            {rolePresets.map((p) => (
                              <button
                                key={p.id}
                                onClick={() => addPts(p.value)}
                                className={cn(
                                  "px-2 py-1 rounded-lg text-[10px] font-bold border border-border/20 transition-all active:scale-95",
                                  p.color
                                )}
                              >
                                {p.value > 0 ? "+" : ""}{p.value} {p.label}
                              </button>
                            ))}
                            <button
                              onClick={() => addPts(-1)}
                              className="px-2 py-1 rounded-lg text-[10px] font-bold border border-border/20 bg-destructive/10 hover:bg-destructive/20 text-destructive transition-all active:scale-95"
                            >−1</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </motion.div>
            ))
          )}

          {matchPlayers.length > 0 && (
            <div className="fixed bottom-6 right-6 z-50">
              <Button onClick={() => savePoints.mutate()} disabled={savePoints.isPending} size="lg" className="rounded-2xl shadow-2xl gap-2 gradient-primary">
                {savePoints.isPending ? <><RefreshCw className="h-4 w-4 animate-spin" /> Saving...</> : <><Save className="h-4 w-4" /> Save & Recalculate</>}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminLiveScoring;
