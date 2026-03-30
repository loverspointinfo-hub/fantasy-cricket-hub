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

interface ContestForm {
  match_id: string; name: string; type: string; entry_fee: string; prize_pool: string;
  max_entries: string; is_guaranteed: boolean; status: string; max_teams_per_user: string;
}
const empty: ContestForm = { match_id: "", name: "", type: "mega", entry_fee: "0", prize_pool: "0", max_entries: "100", is_guaranteed: false, status: "open", max_teams_per_user: "1" };

const AdminContests = () => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ContestForm>(empty);
  const [editId, setEditId] = useState<string | null>(null);

  const { data: matches = [] } = useQuery({
    queryKey: ["admin-matches-list"],
    queryFn: async () => { const { data } = await (supabase.from("matches") as any).select("id, team1_short, team2_short").order("match_time", { ascending: false }); return data ?? []; },
  });

  const { data: contests = [], isLoading } = useQuery({
    queryKey: ["admin-contests"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("contests") as any).select("*, match:matches(team1_short, team2_short)").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        match_id: form.match_id, name: form.name, type: form.type,
        entry_fee: parseFloat(form.entry_fee), prize_pool: parseFloat(form.prize_pool),
        max_entries: parseInt(form.max_entries), is_guaranteed: form.is_guaranteed, status: form.status,
        max_teams_per_user: parseInt(form.max_teams_per_user) || 1,
      };
      if (editId) {
        const { error } = await (supabase.from("contests") as any).update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from("contests") as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-contests"] }); setOpen(false); setForm(empty); setEditId(null); toast.success("Contest saved"); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await (supabase.from("contests") as any).delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-contests"] }); toast.success("Contest deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  const openEdit = (c: any) => {
    setForm({
      match_id: c.match_id, name: c.name, type: c.type, entry_fee: String(c.entry_fee ?? 0),
      prize_pool: String(c.prize_pool ?? 0), max_entries: String(c.max_entries), is_guaranteed: c.is_guaranteed ?? false, status: c.status || "open",
      max_teams_per_user: String(c.max_teams_per_user ?? 1),
    });
    setEditId(c.id); setOpen(true);
  };

  const set = (k: keyof ContestForm, v: any) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Contests</h1>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setForm(empty); setEditId(null); } }}>
          <DialogTrigger asChild><Button size="sm" className="gap-1"><Plus className="h-4 w-4" /> Add Contest</Button></DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-auto">
            <DialogHeader><DialogTitle>{editId ? "Edit Contest" : "Create Contest"}</DialogTitle></DialogHeader>
            <div className="space-y-3 mt-3">
              <div>
                <Label className="text-xs">Match</Label>
                <Select value={form.match_id} onValueChange={v => set("match_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Select match" /></SelectTrigger>
                  <SelectContent>{matches.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.team1_short} vs {m.team2_short}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Contest Name</Label><Input value={form.name} onChange={e => set("name", e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Type</Label>
                  <Select value={form.type} onValueChange={v => set("type", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mega">Mega</SelectItem><SelectItem value="h2h">Head-to-Head</SelectItem>
                      <SelectItem value="winner_takes_all">Winner Takes All</SelectItem><SelectItem value="practice">Practice</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Status</Label>
                  <Select value={form.status} onValueChange={v => set("status", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem><SelectItem value="live">Live</SelectItem><SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-3">
                <div><Label className="text-xs">Entry Fee (₹)</Label><Input type="number" value={form.entry_fee} onChange={e => set("entry_fee", e.target.value)} /></div>
                <div><Label className="text-xs">Prize Pool (₹)</Label><Input type="number" value={form.prize_pool} onChange={e => set("prize_pool", e.target.value)} /></div>
                <div><Label className="text-xs">Max Entries</Label><Input type="number" value={form.max_entries} onChange={e => set("max_entries", e.target.value)} /></div>
                <div><Label className="text-xs">Max Teams/User</Label><Input type="number" min="1" value={form.max_teams_per_user} onChange={e => set("max_teams_per_user", e.target.value)} /></div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={form.is_guaranteed} onChange={e => set("is_guaranteed", e.target.checked)} className="rounded" />
                <Label className="text-xs">Guaranteed Contest</Label>
              </div>
            </div>
            <Button onClick={() => save.mutate()} disabled={save.isPending} className="w-full mt-4">
              {save.isPending ? "Saving..." : editId ? "Update" : "Create Contest"}
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? <p className="text-muted-foreground text-sm">Loading...</p> : (
        <div className="space-y-2">
          {contests.map((c: any) => (
            <Card key={c.id} className="glass-card p-4 flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{c.name}</p>
                <p className="text-xs text-muted-foreground">
                  {c.match?.team1_short} vs {c.match?.team2_short} • ₹{c.entry_fee} entry • ₹{c.prize_pool} pool
                </p>
              </div>
              <div className="flex flex-col items-center gap-1 min-w-[60px]">
                <Badge variant="secondary" className="text-[10px] font-bold bg-primary/10 text-primary border-primary/20">
                  {c.current_entries ?? 0}/{c.max_entries} Joined
                </Badge>
                <Badge className="text-[10px]">{c.status}</Badge>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => del.mutate(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminContests;
