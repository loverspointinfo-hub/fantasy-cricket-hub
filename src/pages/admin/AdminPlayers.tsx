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
import { Plus, Pencil, Trash2, Search, Upload } from "lucide-react";
import { toast } from "sonner";
import { useRef } from "react";

interface PlayerForm { name: string; role: string; team: string; credit_value: string; photo_url: string; }
const ROLE_OPTIONS = [
  { value: "BAT", label: "Batsman" },
  { value: "BOWL", label: "Bowler" },
  { value: "AR", label: "All-Rounder" },
  { value: "WK", label: "Wicket-Keeper" },
];
const empty: PlayerForm = { name: "", role: "BAT", team: "", credit_value: "8", photo_url: "" };

const AdminPlayers = () => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<PlayerForm>(empty);
  const [editId, setEditId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const csvRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  const { data: players = [], isLoading } = useQuery({
    queryKey: ["admin-players"],
    queryFn: async () => {
      const { data, error } = await supabase.from("players").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = players.filter((p: any) =>
    p.name.toLowerCase().includes(search.toLowerCase()) || p.team.toLowerCase().includes(search.toLowerCase())
  );

  const save = useMutation({
    mutationFn: async () => {
      const payload = { name: form.name, role: form.role, team: form.team, credit_value: parseFloat(form.credit_value), photo_url: form.photo_url || null };
      if (editId) {
        const { error } = await (supabase.from("players") as any).update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from("players") as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-players"] }); setOpen(false); setForm(empty); setEditId(null); toast.success("Player saved"); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await (supabase.from("players") as any).delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-players"] }); toast.success("Player deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  const openEdit = (p: any) => {
    setForm({ name: p.name, role: p.role, team: p.team, credit_value: String(p.credit_value), photo_url: p.photo_url || "" });
    setEditId(p.id); setOpen(true);
  };

  const set = (k: keyof PlayerForm, v: string) => setForm(p => ({ ...p, [k]: v }));

  const roleColors: Record<string, string> = { BAT: "default", BOWL: "secondary", AR: "outline", WK: "destructive" };

  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const lines = text.split("\n").filter(l => l.trim());
      if (lines.length < 2) throw new Error("CSV must have header + data rows");
      const header = lines[0].split(",").map(h => h.trim().toLowerCase());
      const nameIdx = header.indexOf("name");
      const roleIdx = header.indexOf("role");
      const teamIdx = header.indexOf("team");
      const creditIdx = header.findIndex(h => h.includes("credit"));
      if (nameIdx === -1 || roleIdx === -1 || teamIdx === -1) throw new Error("CSV must have name, role, team columns");

      const rows = lines.slice(1).map(line => {
        const cols = line.split(",").map(c => c.trim());
        return {
          name: cols[nameIdx],
          role: cols[roleIdx]?.toUpperCase(),
          team: cols[teamIdx],
          credit_value: creditIdx >= 0 ? parseFloat(cols[creditIdx]) || 8 : 8,
        };
      }).filter(r => r.name && r.role && r.team);

      if (rows.length === 0) throw new Error("No valid rows found");
      const { error } = await (supabase.from("players") as any).insert(rows);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["admin-players"] });
      toast.success(`${rows.length} players imported!`);
    } catch (err: any) {
      toast.error(err.message || "Import failed");
    } finally {
      setImporting(false);
      if (csvRef.current) csvRef.current.value = "";
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-display text-2xl font-bold">Players</h1>
        <div className="flex gap-2">
          <input ref={csvRef} type="file" accept=".csv" className="hidden" onChange={handleCSVImport} />
          <Button variant="outline" size="sm" className="gap-1" onClick={() => csvRef.current?.click()} disabled={importing}>
            <Upload className="h-4 w-4" /> {importing ? "Importing..." : "CSV Import"}
          </Button>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setForm(empty); setEditId(null); } }}>
          <DialogTrigger asChild><Button size="sm" className="gap-1"><Plus className="h-4 w-4" /> Add Player</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editId ? "Edit Player" : "Add Player"}</DialogTitle></DialogHeader>
            <div className="space-y-3 mt-3">
              <div><Label className="text-xs">Name</Label><Input value={form.name} onChange={e => set("name", e.target.value)} /></div>
              <div><Label className="text-xs">Team</Label><Input value={form.team} onChange={e => set("team", e.target.value)} /></div>
              <div>
                <Label className="text-xs">Role</Label>
                <Select value={form.role} onValueChange={v => set("role", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map(r => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Credit Value</Label><Input type="number" value={form.credit_value} onChange={e => set("credit_value", e.target.value)} /></div>
              <div><Label className="text-xs">Photo URL (optional)</Label><Input value={form.photo_url} onChange={e => set("photo_url", e.target.value)} /></div>
            </div>
            <Button onClick={() => save.mutate()} disabled={save.isPending} className="w-full mt-4">
              {save.isPending ? "Saving..." : editId ? "Update" : "Add Player"}
            </Button>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search players..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {isLoading ? <p className="text-muted-foreground text-sm">Loading...</p> : (
        <div className="space-y-2">
          {filtered.map((p: any) => (
            <Card key={p.id} className="glass-card p-3 flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{p.name}</p>
                <p className="text-xs text-muted-foreground">{p.team} • ₹{p.credit_value} Cr</p>
              </div>
              <Badge variant={roleColors[p.role] as any || "default"} className="text-[10px] capitalize">{p.role}</Badge>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => del.mutate(p.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </Card>
          ))}
          {filtered.length === 0 && <p className="text-center text-muted-foreground text-sm py-8">No players found</p>}
        </div>
      )}
    </div>
  );
};

export default AdminPlayers;
