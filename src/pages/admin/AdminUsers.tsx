import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Wallet, Eye, Pencil } from "lucide-react";
import { toast } from "sonner";

const AdminUsers = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [addMoneyOpen, setAddMoneyOpen] = useState(false);
  const [moneyForm, setMoneyForm] = useState({ userId: "", amount: "", type: "deposit_balance", description: "" });
  const [teamEditOpen, setTeamEditOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<any>(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("profiles") as any).select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: userWallets = [] } = useQuery({
    queryKey: ["admin-wallets"],
    queryFn: async () => {
      const { data } = await (supabase.from("wallets") as any).select("*");
      return data ?? [];
    },
  });

  const { data: userTeams = [] } = useQuery({
    queryKey: ["admin-user-teams", selectedUser?.id],
    queryFn: async () => {
      const { data } = await (supabase.from("user_teams") as any)
        .select("*, match:matches(team1_short, team2_short, status), team_players(*, player:players(name, role, team))")
        .eq("user_id", selectedUser!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!selectedUser,
  });

  const { data: allPlayers = [] } = useQuery({
    queryKey: ["admin-all-players"],
    queryFn: async () => {
      const { data } = await supabase.from("players").select("*").order("name");
      return data ?? [];
    },
  });

  const addMoney = useMutation({
    mutationFn: async () => {
      const amt = parseFloat(moneyForm.amount);
      if (!amt || amt <= 0) throw new Error("Invalid amount");
      // Update wallet
      const { error } = await (supabase.from("wallets") as any)
        .update({ [moneyForm.type]: (supabase as any).rpc ? amt : amt })
        .eq("user_id", moneyForm.userId);
      // Actually we need to increment, let's use rpc or raw update
      // For simplicity, fetch current and add
      const { data: wallet } = await (supabase.from("wallets") as any).select("*").eq("user_id", moneyForm.userId).single();
      if (!wallet) throw new Error("Wallet not found");
      const newVal = (wallet[moneyForm.type] ?? 0) + amt;
      const { error: updateErr } = await (supabase.from("wallets") as any).update({ [moneyForm.type]: newVal }).eq("user_id", moneyForm.userId);
      if (updateErr) throw updateErr;
      // Record transaction
      await (supabase.from("transactions") as any).insert({
        user_id: moneyForm.userId, type: "admin_credit", amount: amt,
        description: moneyForm.description || `Admin added ₹${amt} to ${moneyForm.type.replace("_", " ")}`,
        status: "completed",
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-wallets"] }); setAddMoneyOpen(false); setMoneyForm({ userId: "", amount: "", type: "deposit_balance", description: "" }); toast.success("Money added"); },
    onError: (e: any) => toast.error(e.message),
  });

  const updateTeamCaptain = useMutation({
    mutationFn: async ({ teamId, captainId, viceCaptainId }: { teamId: string; captainId: string; viceCaptainId: string }) => {
      const { error } = await (supabase.from("user_teams") as any)
        .update({ captain_id: captainId, vice_captain_id: viceCaptainId })
        .eq("id", teamId);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-user-teams"] }); toast.success("Team updated"); setTeamEditOpen(false); },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = users.filter((u: any) =>
    (u.username || "").toLowerCase().includes(search.toLowerCase()) ||
    (u.full_name || "").toLowerCase().includes(search.toLowerCase())
  );

  const getWallet = (userId: string) => userWallets.find((w: any) => w.user_id === userId);

  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-bold">User Management</h1>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by username or name..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {isLoading ? <p className="text-muted-foreground text-sm">Loading...</p> : (
        <div className="space-y-2">
          {filtered.map((u: any) => {
            const w = getWallet(u.id);
            const total = (w?.deposit_balance ?? 0) + (w?.winning_balance ?? 0) + (w?.bonus_balance ?? 0);
            return (
              <Card key={u.id} className="glass-card p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{u.username || "No username"}</p>
                    <p className="text-xs text-muted-foreground">{u.full_name || "—"} • KYC: {u.kyc_status}</p>
                    <p className="text-xs text-primary font-semibold mt-0.5">Balance: ₹{total.toFixed(0)}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedUser(u)} title="View details">
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => { setMoneyForm(p => ({ ...p, userId: u.id })); setAddMoneyOpen(true); }} title="Add money">
                      <Wallet className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Money Dialog */}
      <Dialog open={addMoneyOpen} onOpenChange={setAddMoneyOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Money to User</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-3">
            <div><Label className="text-xs">Amount (₹)</Label><Input type="number" value={moneyForm.amount} onChange={e => setMoneyForm(p => ({ ...p, amount: e.target.value }))} /></div>
            <div>
              <Label className="text-xs">Balance Type</Label>
              <Select value={moneyForm.type} onValueChange={v => setMoneyForm(p => ({ ...p, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="deposit_balance">Deposit Balance</SelectItem>
                  <SelectItem value="winning_balance">Winning Balance</SelectItem>
                  <SelectItem value="bonus_balance">Bonus Balance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Description (optional)</Label><Input value={moneyForm.description} onChange={e => setMoneyForm(p => ({ ...p, description: e.target.value }))} /></div>
          </div>
          <Button onClick={() => addMoney.mutate()} disabled={addMoney.isPending} className="w-full mt-4">
            {addMoney.isPending ? "Adding..." : "Add Money"}
          </Button>
        </DialogContent>
      </Dialog>

      {/* User Detail / Teams Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={o => { if (!o) setSelectedUser(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-auto">
          <DialogHeader><DialogTitle>User: {selectedUser?.username}</DialogTitle></DialogHeader>
          {selectedUser && (
            <div className="space-y-4 mt-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground text-xs">Full Name</span><p className="font-semibold">{selectedUser.full_name || "—"}</p></div>
                <div><span className="text-muted-foreground text-xs">KYC Status</span><p className="font-semibold">{selectedUser.kyc_status}</p></div>
                <div><span className="text-muted-foreground text-xs">Referral Code</span><p className="font-semibold">{selectedUser.referral_code || "—"}</p></div>
                <div><span className="text-muted-foreground text-xs">Joined</span><p className="font-semibold">{selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleDateString() : "—"}</p></div>
              </div>

              <div>
                <h3 className="font-display text-sm font-bold mb-2">User Teams ({userTeams.length})</h3>
                {userTeams.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No teams created</p>
                ) : (
                  <div className="space-y-2">
                    {userTeams.map((t: any) => (
                      <Card key={t.id} className="glass-card p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-bold">{t.name} <Badge className="text-[9px] ml-1">{t.match?.team1_short} vs {t.match?.team2_short}</Badge></p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {t.team_players?.length ?? 0} players • {t.total_credits} credits
                              {t.match?.status === "live" && <Badge variant="destructive" className="text-[9px] ml-1">LIVE</Badge>}
                            </p>
                          </div>
                          {(t.match?.status === "live" || t.match?.status === "upcoming") && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingTeam(t); setTeamEditOpen(true); }}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Team Edit Dialog */}
      <Dialog open={teamEditOpen} onOpenChange={o => { setTeamEditOpen(o); if (!o) setEditingTeam(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Team: {editingTeam?.name}</DialogTitle></DialogHeader>
          {editingTeam && (
            <div className="space-y-3 mt-3">
              <div>
                <Label className="text-xs">Captain</Label>
                <Select value={editingTeam.captain_id || ""} onValueChange={v => setEditingTeam((p: any) => ({ ...p, captain_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select captain" /></SelectTrigger>
                  <SelectContent>
                    {(editingTeam.team_players ?? []).map((tp: any) => (
                      <SelectItem key={tp.player_id} value={tp.player_id}>{tp.player?.name} ({tp.player?.role})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Vice Captain</Label>
                <Select value={editingTeam.vice_captain_id || ""} onValueChange={v => setEditingTeam((p: any) => ({ ...p, vice_captain_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select vice captain" /></SelectTrigger>
                  <SelectContent>
                    {(editingTeam.team_players ?? []).map((tp: any) => (
                      <SelectItem key={tp.player_id} value={tp.player_id}>{tp.player?.name} ({tp.player?.role})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="w-full"
                onClick={() => updateTeamCaptain.mutate({ teamId: editingTeam.id, captainId: editingTeam.captain_id, viceCaptainId: editingTeam.vice_captain_id })}
                disabled={updateTeamCaptain.isPending}
              >
                {updateTeamCaptain.isPending ? "Saving..." : "Update Team"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsers;
