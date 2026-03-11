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
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface MatchForm {
  team1_name: string; team1_short: string; team2_name: string; team2_short: string;
  league: string; match_time: string; entry_deadline: string; venue: string; sport: string; status: string;
}

const empty: MatchForm = {
  team1_name: "", team1_short: "", team2_name: "", team2_short: "",
  league: "", match_time: "", entry_deadline: "", venue: "", sport: "cricket", status: "upcoming",
};

const AdminMatches = () => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<MatchForm>(empty);
  const [editId, setEditId] = useState<string | null>(null);

  const { data: matches = [], isLoading } = useQuery({
    queryKey: ["admin-matches"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("matches") as any).select("*").order("match_time", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (editId) {
        const { error } = await (supabase.from("matches") as any).update(form).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from("matches") as any).insert(form);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-matches"] }); setOpen(false); setForm(empty); setEditId(null); toast.success("Match saved"); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("matches") as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-matches"] }); toast.success("Match deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  const openEdit = (m: any) => {
    setForm({
      team1_name: m.team1_name, team1_short: m.team1_short, team2_name: m.team2_name, team2_short: m.team2_short,
      league: m.league, match_time: m.match_time?.slice(0, 16) || "", entry_deadline: m.entry_deadline?.slice(0, 16) || "",
      venue: m.venue || "", sport: m.sport || "cricket", status: m.status || "upcoming",
    });
    setEditId(m.id);
    setOpen(true);
  };

  const set = (k: keyof MatchForm, v: string) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Matches</h1>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setForm(empty); setEditId(null); } }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1"><Plus className="h-4 w-4" /> Add Match</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-auto">
            <DialogHeader><DialogTitle>{editId ? "Edit Match" : "Create Match"}</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div><Label className="text-xs">Team 1 Name</Label><Input value={form.team1_name} onChange={e => set("team1_name", e.target.value)} /></div>
              <div><Label className="text-xs">Team 1 Short</Label><Input value={form.team1_short} onChange={e => set("team1_short", e.target.value)} maxLength={4} /></div>
              <div><Label className="text-xs">Team 2 Name</Label><Input value={form.team2_name} onChange={e => set("team2_name", e.target.value)} /></div>
              <div><Label className="text-xs">Team 2 Short</Label><Input value={form.team2_short} onChange={e => set("team2_short", e.target.value)} maxLength={4} /></div>
              <div><Label className="text-xs">League</Label><Input value={form.league} onChange={e => set("league", e.target.value)} /></div>
              <div><Label className="text-xs">Venue</Label><Input value={form.venue} onChange={e => set("venue", e.target.value)} /></div>
              <div><Label className="text-xs">Match Time</Label><Input type="datetime-local" value={form.match_time} onChange={e => set("match_time", e.target.value)} /></div>
              <div><Label className="text-xs">Entry Deadline</Label><Input type="datetime-local" value={form.entry_deadline} onChange={e => set("entry_deadline", e.target.value)} /></div>
              <div>
                <Label className="text-xs">Sport</Label>
                <Select value={form.sport} onValueChange={v => set("sport", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="cricket">Cricket</SelectItem><SelectItem value="football">Football</SelectItem></SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Status</Label>
                <Select value={form.status} onValueChange={v => set("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upcoming">Upcoming</SelectItem><SelectItem value="live">Live</SelectItem><SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={() => save.mutate()} disabled={save.isPending} className="w-full mt-4">
              {save.isPending ? "Saving..." : editId ? "Update Match" : "Create Match"}
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? <p className="text-muted-foreground text-sm">Loading...</p> : (
        <div className="space-y-2">
          {matches.map((m: any) => (
            <Card key={m.id} className="glass-card p-4 flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{m.team1_short} vs {m.team2_short}</p>
                <p className="text-xs text-muted-foreground">{m.league} • {m.match_time ? format(new Date(m.match_time), "dd MMM, h:mm a") : ""}</p>
              </div>
              <Badge variant={m.status === "live" ? "destructive" : m.status === "completed" ? "secondary" : "default"} className="text-[10px]">{m.status}</Badge>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(m)}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => del.mutate(m.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminMatches;
