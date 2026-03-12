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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Wallet, Eye, Pencil, Trophy, Users, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { formatIST } from "@/lib/date-utils";
import AdminTeamEditor from "@/components/admin/AdminTeamEditor";

const AdminUsers = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [addMoneyOpen, setAddMoneyOpen] = useState(false);
  const [moneyForm, setMoneyForm] = useState({ userId: "", amount: "", type: "deposit_balance", description: "" });
  const [editingTeam, setEditingTeam] = useState<any>(null);
  const [teamEditOpen, setTeamEditOpen] = useState(false);

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
        .select("*, match:matches(id, team1_short, team2_short, status, match_time), team_players(*, player:players(name, role, team, credit_value))")
        .eq("user_id", selectedUser!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!selectedUser,
  });

  const { data: userContestEntries = [] } = useQuery({
    queryKey: ["admin-user-contests", selectedUser?.id],
    queryFn: async () => {
      const { data } = await (supabase.from("contest_entries") as any)
        .select("*, contest:contests(name, entry_fee, prize_pool, match_id, status)")
        .eq("user_id", selectedUser!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!selectedUser,
  });

  const { data: userTransactions = [] } = useQuery({
    queryKey: ["admin-user-transactions", selectedUser?.id],
    queryFn: async () => {
      const { data } = await (supabase.from("transactions") as any)
        .select("*")
        .eq("user_id", selectedUser!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
    enabled: !!selectedUser,
  });

  const addMoney = useMutation({
    mutationFn: async () => {
      const amt = parseFloat(moneyForm.amount);
      if (!amt || amt <= 0) throw new Error("Invalid amount");
      const { error: txErr } = await (supabase.from("transactions") as any).insert({
        user_id: moneyForm.userId,
        type: "deposit",
        amount: amt,
        description: moneyForm.description || `Admin deposit ₹${amt} to ${moneyForm.type.replace(/_/g, " ")}`,
        status: "pending",
      });
      if (txErr) throw txErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-transactions"] });
      qc.invalidateQueries({ queryKey: ["admin-user-transactions"] });
      setAddMoneyOpen(false);
      setMoneyForm({ userId: "", amount: "", type: "deposit_balance", description: "" });
      toast.success("Deposit request created — approve it in Wallet & Transactions");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = users.filter((u: any) =>
    (u.username || "").toLowerCase().includes(search.toLowerCase()) ||
    (u.full_name || "").toLowerCase().includes(search.toLowerCase())
  );

  const getWallet = (userId: string) => userWallets.find((w: any) => w.user_id === userId);
  const selectedWallet = selectedUser ? getWallet(selectedUser.id) : null;

  const liveTeams = userTeams.filter((t: any) => t.match?.status === "live");
  const upcomingTeams = userTeams.filter((t: any) => t.match?.status === "upcoming");
  const completedTeams = userTeams.filter((t: any) => t.match?.status === "completed");

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

      {/* User Detail Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={o => { if (!o) setSelectedUser(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              {selectedUser?.username || "User Details"}
            </DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <Tabs defaultValue="overview" className="mt-2">
              <TabsList className="w-full grid grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="teams">Teams ({userTeams.length})</TabsTrigger>
                <TabsTrigger value="contests">Contests ({userContestEntries.length})</TabsTrigger>
                <TabsTrigger value="transactions">Txns ({userTransactions.length})</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-4 mt-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Card className="glass-card p-3">
                    <span className="text-muted-foreground text-[10px] uppercase tracking-wider">Full Name</span>
                    <p className="font-semibold text-sm">{selectedUser.full_name || "—"}</p>
                  </Card>
                  <Card className="glass-card p-3">
                    <span className="text-muted-foreground text-[10px] uppercase tracking-wider">KYC Status</span>
                    <p className="font-semibold text-sm">
                      <Badge variant={selectedUser.kyc_status === "verified" ? "default" : "secondary"} className="text-[10px]">
                        {selectedUser.kyc_status}
                      </Badge>
                    </p>
                  </Card>
                  <Card className="glass-card p-3">
                    <span className="text-muted-foreground text-[10px] uppercase tracking-wider">Referral Code</span>
                    <p className="font-semibold text-sm">{selectedUser.referral_code || "—"}</p>
                  </Card>
                  <Card className="glass-card p-3">
                    <span className="text-muted-foreground text-[10px] uppercase tracking-wider">Joined</span>
                    <p className="font-semibold text-sm">{selectedUser.created_at ? formatIST(selectedUser.created_at, "dd MMM yyyy") : "—"}</p>
                  </Card>
                </div>

                {/* Wallet Breakdown */}
                {selectedWallet && (
                  <Card className="glass-card p-4">
                    <h4 className="text-xs font-bold mb-3 flex items-center gap-1.5"><Wallet className="h-3.5 w-3.5 text-primary" /> Wallet Breakdown</h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center p-2 rounded-lg bg-secondary/50">
                        <p className="text-[10px] text-muted-foreground">Deposit</p>
                        <p className="text-sm font-bold text-primary">₹{(selectedWallet.deposit_balance ?? 0).toFixed(0)}</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-secondary/50">
                        <p className="text-[10px] text-muted-foreground">Winnings</p>
                        <p className="text-sm font-bold text-green-400">₹{(selectedWallet.winning_balance ?? 0).toFixed(0)}</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-secondary/50">
                        <p className="text-[10px] text-muted-foreground">Bonus</p>
                        <p className="text-sm font-bold text-amber-400">₹{(selectedWallet.bonus_balance ?? 0).toFixed(0)}</p>
                      </div>
                    </div>
                    <div className="mt-3 text-center">
                      <p className="text-xs text-muted-foreground">Total Balance</p>
                      <p className="text-lg font-bold text-primary">
                        ₹{((selectedWallet.deposit_balance ?? 0) + (selectedWallet.winning_balance ?? 0) + (selectedWallet.bonus_balance ?? 0)).toFixed(0)}
                      </p>
                    </div>
                  </Card>
                )}
              </TabsContent>

              {/* Teams Tab */}
              <TabsContent value="teams" className="space-y-3 mt-3">
                {liveTeams.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-destructive mb-2 flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" /> Live Match Teams
                    </h4>
                    {liveTeams.map((t: any) => (
                      <TeamCard key={t.id} team={t} onEdit={() => { setEditingTeam(t); setTeamEditOpen(true); }} />
                    ))}
                  </div>
                )}
                {upcomingTeams.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-primary mb-2">Upcoming Match Teams</h4>
                    {upcomingTeams.map((t: any) => (
                      <TeamCard key={t.id} team={t} onEdit={() => { setEditingTeam(t); setTeamEditOpen(true); }} />
                    ))}
                  </div>
                )}
                {completedTeams.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-muted-foreground mb-2">Completed Match Teams</h4>
                    {completedTeams.map((t: any) => (
                      <TeamCard key={t.id} team={t} />
                    ))}
                  </div>
                )}
                {userTeams.length === 0 && <p className="text-xs text-muted-foreground text-center py-8">No teams created</p>}
              </TabsContent>

              {/* Contests Tab */}
              <TabsContent value="contests" className="space-y-2 mt-3">
                {userContestEntries.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">No contest entries</p>
                ) : (
                  userContestEntries.map((ce: any) => (
                    <Card key={ce.id} className="glass-card p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold">{ce.contest?.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            Entry: ₹{ce.contest?.entry_fee ?? 0} • Pool: ₹{ce.contest?.prize_pool ?? 0}
                          </p>
                        </div>
                        <div className="text-right">
                          {ce.rank && <p className="text-xs font-bold">Rank #{ce.rank}</p>}
                          {ce.winnings > 0 && <p className="text-xs text-green-400 font-semibold">Won ₹{ce.winnings}</p>}
                          <Badge variant="secondary" className="text-[9px]">{ce.contest?.status}</Badge>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </TabsContent>

              {/* Transactions Tab */}
              <TabsContent value="transactions" className="space-y-2 mt-3">
                {userTransactions.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">No transactions</p>
                ) : (
                  userTransactions.map((tx: any) => (
                    <Card key={tx.id} className="glass-card p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold capitalize">{tx.type.replace(/_/g, " ")}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {tx.created_at ? formatIST(tx.created_at, "dd MMM, h:mm a") : ""}
                          </p>
                          {tx.description && <p className="text-[10px] text-muted-foreground/60 mt-0.5">{tx.description}</p>}
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-bold ${tx.type === "withdrawal" ? "text-destructive" : "text-primary"}`}>
                            {tx.type === "withdrawal" ? "-" : "+"}₹{tx.amount}
                          </p>
                          <Badge variant={tx.status === "completed" ? "default" : tx.status === "pending" ? "secondary" : "destructive"} className="text-[9px]">
                            {tx.status}
                          </Badge>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Full Team Editor Dialog */}
      <AdminTeamEditor
        open={teamEditOpen}
        onOpenChange={o => { setTeamEditOpen(o); if (!o) setEditingTeam(null); }}
        team={editingTeam}
      />
    </div>
  );
};

// Sub-component for team cards
const TeamCard = ({ team, onEdit }: { team: any; onEdit?: () => void }) => (
  <Card className="glass-card p-3 mb-2">
    <div className="flex items-center justify-between">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold">
          {team.name}
          <Badge className="text-[9px] ml-1.5">{team.match?.team1_short} vs {team.match?.team2_short}</Badge>
          {team.match?.status === "live" && <Badge variant="destructive" className="text-[9px] ml-1">LIVE</Badge>}
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {team.team_players?.length ?? 0} players • {team.total_credits} credits • {team.total_points ?? 0} pts
        </p>
        <div className="flex flex-wrap gap-1 mt-1.5">
          {(team.team_players ?? []).slice(0, 5).map((tp: any) => (
            <Badge key={tp.player_id} variant="outline" className="text-[8px] py-0 px-1.5">
              {tp.player?.name?.split(" ").pop()}
              {tp.player_id === team.captain_id && " (C)"}
              {tp.player_id === team.vice_captain_id && " (VC)"}
            </Badge>
          ))}
          {(team.team_players?.length ?? 0) > 5 && (
            <Badge variant="outline" className="text-[8px] py-0 px-1.5">+{team.team_players.length - 5} more</Badge>
          )}
        </div>
      </div>
      {onEdit && (
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  </Card>
);

export default AdminUsers;
