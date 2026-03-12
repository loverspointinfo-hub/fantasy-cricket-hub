import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, Users, Clock, Zap, CheckCircle2, Info, Timer } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow, isPast } from "date-fns";
import { formatIST, toIST, istToUTC, utcToISTInput } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import MatchLineupManager from "@/components/admin/MatchLineupManager";

interface MatchForm {
  team1_name: string; team1_short: string; team2_name: string; team2_short: string;
  league: string; match_time: string; entry_deadline: string; venue: string; sport: string; status: string;
}

const empty: MatchForm = {
  team1_name: "", team1_short: "", team2_name: "", team2_short: "",
  league: "", match_time: "", entry_deadline: "", venue: "", sport: "cricket", status: "upcoming",
};

const statusConfig: Record<string, { icon: any; color: string; bg: string; border: string }> = {
  upcoming: { icon: Clock, color: "text-primary", bg: "bg-primary/10", border: "border-primary/20" },
  live: { icon: Zap, color: "text-[hsl(var(--neon-red))]", bg: "bg-[hsl(var(--neon-red)/0.1)]", border: "border-[hsl(var(--neon-red)/0.2)]" },
  completed: { icon: CheckCircle2, color: "text-muted-foreground", bg: "bg-muted/50", border: "border-border/30" },
};

const AdminMatches = () => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<MatchForm>(empty);
  const [editId, setEditId] = useState<string | null>(null);
  const [lineupMatch, setLineupMatch] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const { data: matches = [], isLoading } = useQuery({
    queryKey: ["admin-matches"],
    queryFn: async () => {
      // Auto-transition before fetching
      await (supabase.rpc as any)("auto_transition_matches");
      const { data, error } = await (supabase.from("matches") as any).select("*").order("match_time", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 30_000,
  });

  const filteredMatches = filterStatus === "all" ? matches : matches.filter((m: any) => m.status === filterStatus);

  const statusCounts = matches.reduce((acc: Record<string, number>, m: any) => {
    acc[m.status] = (acc[m.status] || 0) + 1;
    return acc;
  }, {});

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        match_time: form.match_time ? istToUTC(form.match_time) : form.match_time,
        entry_deadline: form.entry_deadline ? istToUTC(form.entry_deadline) : form.entry_deadline,
      };
      if (editId) {
        const { error } = await (supabase.from("matches") as any).update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from("matches") as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-matches"] }); qc.invalidateQueries({ queryKey: ["matches"] }); setOpen(false); setForm(empty); setEditId(null); toast.success("Match saved"); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("matches") as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-matches"] }); qc.invalidateQueries({ queryKey: ["matches"] }); toast.success("Match deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  const openEdit = (m: any) => {
    setForm({
      team1_name: m.team1_name, team1_short: m.team1_short, team2_name: m.team2_name, team2_short: m.team2_short,
      league: m.league, match_time: m.match_time ? utcToISTInput(m.match_time) : "", entry_deadline: m.entry_deadline ? utcToISTInput(m.entry_deadline) : "",
      venue: m.venue || "", sport: m.sport || "cricket", status: m.status || "upcoming",
    });
    setEditId(m.id);
    setOpen(true);
  };

  const set = (k: keyof MatchForm, v: string) => setForm(p => ({ ...p, [k]: v }));

  const getDeadlineInfo = (m: any) => {
    if (!m.entry_deadline) return null;
    const deadlineUTC = new Date(m.entry_deadline);
    const passed = isPast(deadlineUTC);
    return { passed, label: formatDistanceToNow(deadlineUTC, { addSuffix: true }) };
  };

  return (
    <div className="space-y-5">
      {/* Info Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start gap-3 rounded-xl p-3.5"
        style={{
          background: "linear-gradient(135deg, hsl(var(--primary) / 0.06), hsl(195 100% 55% / 0.04))",
          border: "1px solid hsl(var(--primary) / 0.15)",
        }}
      >
        <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-semibold text-foreground">Auto Live Transition</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Matches automatically move to <span className="text-[hsl(var(--neon-red))] font-semibold">Live</span> when their entry deadline passes. No manual action needed.
          </p>
        </div>
      </motion.div>

      {/* Header + Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Matches</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{matches.length} total matches</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setForm(empty); setEditId(null); } }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5 rounded-xl"><Plus className="h-4 w-4" /> Add Match</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-auto">
            <DialogHeader><DialogTitle className="font-display">{editId ? "Edit Match" : "Create New Match"}</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div><Label className="text-xs text-muted-foreground">Team 1 Name</Label><Input value={form.team1_name} onChange={e => set("team1_name", e.target.value)} placeholder="e.g. Mumbai Indians" /></div>
              <div><Label className="text-xs text-muted-foreground">Team 1 Short</Label><Input value={form.team1_short} onChange={e => set("team1_short", e.target.value)} maxLength={4} placeholder="MI" /></div>
              <div><Label className="text-xs text-muted-foreground">Team 2 Name</Label><Input value={form.team2_name} onChange={e => set("team2_name", e.target.value)} placeholder="e.g. Chennai Super Kings" /></div>
              <div><Label className="text-xs text-muted-foreground">Team 2 Short</Label><Input value={form.team2_short} onChange={e => set("team2_short", e.target.value)} maxLength={4} placeholder="CSK" /></div>
              <div><Label className="text-xs text-muted-foreground">League</Label><Input value={form.league} onChange={e => set("league", e.target.value)} placeholder="IPL 2025" /></div>
              <div><Label className="text-xs text-muted-foreground">Venue</Label><Input value={form.venue} onChange={e => set("venue", e.target.value)} placeholder="Wankhede Stadium" /></div>
              <div><Label className="text-xs text-muted-foreground">Match Time (IST)</Label><Input type="datetime-local" value={form.match_time} onChange={e => set("match_time", e.target.value)} /></div>
              <div><Label className="text-xs text-muted-foreground">Entry Deadline (IST)</Label><Input type="datetime-local" value={form.entry_deadline} onChange={e => set("entry_deadline", e.target.value)} /></div>
              <div>
                <Label className="text-xs text-muted-foreground">Sport</Label>
                <Select value={form.sport} onValueChange={v => set("sport", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="cricket">Cricket</SelectItem><SelectItem value="football">Football</SelectItem></SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Select value={form.status} onValueChange={v => set("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upcoming">Upcoming</SelectItem><SelectItem value="live">Live</SelectItem><SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {form.entry_deadline && (
              <div className="flex items-center gap-2 mt-2 p-2.5 rounded-lg bg-muted/30 border border-border/30">
                <Timer className="h-3.5 w-3.5 text-primary" />
                <span className="text-[11px] text-muted-foreground">
                  When this deadline passes, match will auto-transition to <span className="text-[hsl(var(--neon-red))] font-semibold">Live</span>
                </span>
              </div>
            )}
            <Button onClick={() => save.mutate()} disabled={save.isPending} className="w-full mt-3 rounded-xl">
              {save.isPending ? "Saving..." : editId ? "Update Match" : "Create Match"}
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-2">
        {[
          { key: "all", label: "All", count: matches.length },
          { key: "upcoming", label: "Upcoming", count: statusCounts["upcoming"] || 0 },
          { key: "live", label: "Live", count: statusCounts["live"] || 0 },
          { key: "completed", label: "Completed", count: statusCounts["completed"] || 0 },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilterStatus(tab.key)}
            className={cn(
              "flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all",
              filterStatus === tab.key
                ? "bg-primary/10 text-primary border border-primary/20"
                : "text-muted-foreground hover:text-foreground bg-muted/30 border border-transparent"
            )}
          >
            {tab.key === "live" && <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--neon-red))] animate-pulse" />}
            {tab.label}
            <span className="text-[10px] opacity-60">({tab.count})</span>
          </button>
        ))}
      </div>

      {/* Match List */}
      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading...</p>
      ) : filteredMatches.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-muted-foreground">
          <Clock className="h-10 w-10 opacity-20 mb-3" />
          <p className="text-sm font-medium">No {filterStatus === "all" ? "" : filterStatus} matches</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredMatches.map((m: any, i: number) => {
            const cfg = statusConfig[m.status] || statusConfig.upcoming;
            const StatusIcon = cfg.icon;
            const deadlineInfo = getDeadlineInfo(m);

            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Card className="glass-card p-4 space-y-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold">{m.team1_short} vs {m.team2_short}</p>
                        <Badge className={cn("text-[10px] gap-1", cfg.color, cfg.bg, cfg.border)}>
                          <StatusIcon className="h-2.5 w-2.5" />
                          {m.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {m.league} • {m.team1_name} vs {m.team2_name}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setLineupMatch(m)} title="Manage Lineup"><Users className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(m)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => del.mutate(m.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>

                  {/* Timeline info */}
                  <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Match: {m.match_time ? formatIST(m.match_time, "dd MMM, h:mm a") : "N/A"}
                    </span>
                    {m.entry_deadline && (
                      <span className={cn(
                        "flex items-center gap-1 font-medium",
                        deadlineInfo?.passed ? "text-[hsl(var(--neon-red))]" : "text-primary"
                      )}>
                        <Timer className="h-3 w-3" />
                        Deadline: {formatIST(m.entry_deadline, "dd MMM, h:mm a")}
                        {deadlineInfo && (
                          <span className="opacity-60 ml-0.5">({deadlineInfo.passed ? "Passed" : deadlineInfo.label})</span>
                        )}
                      </span>
                    )}
                    {m.venue && (
                      <span className="truncate">{m.venue}</span>
                    )}
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      <MatchLineupManager
        match={lineupMatch}
        open={!!lineupMatch}
        onOpenChange={(o) => { if (!o) setLineupMatch(null); }}
      />
    </div>
  );
};

export default AdminMatches;
