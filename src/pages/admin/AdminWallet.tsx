import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check, X, Search, Plus, Trash2, Gift } from "lucide-react";
import { toast } from "sonner";
import { formatIST } from "@/lib/date-utils";

const AdminWallet = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [cashbackDialogOpen, setCashbackDialogOpen] = useState(false);
  const [cbForm, setCbForm] = useState({ name: "", description: "", min_deposit: "100", cashback_percent: "10", max_cashback: "50" });

  // Cashback offers
  const { data: cashbackOffers = [] } = useQuery({
    queryKey: ["admin-cashback-offers"],
    queryFn: async () => {
      const { data } = await (supabase.from("cashback_offers" as any) as any).select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const saveCashback = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase.from("cashback_offers" as any) as any).insert({
        name: cbForm.name, description: cbForm.description,
        min_deposit: parseFloat(cbForm.min_deposit), cashback_percent: parseFloat(cbForm.cashback_percent),
        max_cashback: parseFloat(cbForm.max_cashback), is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-cashback-offers"] }); setCashbackDialogOpen(false); setCbForm({ name: "", description: "", min_deposit: "100", cashback_percent: "10", max_cashback: "50" }); toast.success("Cashback offer created"); },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleCashback = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await (supabase.from("cashback_offers" as any) as any).update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-cashback-offers"] }); toast.success("Updated"); },
  });

  const deleteCashback = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("cashback_offers" as any) as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-cashback-offers"] }); toast.success("Deleted"); },
  });

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["admin-transactions"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("transactions") as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["admin-profiles-map"],
    queryFn: async () => {
      const { data } = await (supabase.from("profiles") as any).select("id, username, full_name");
      return data ?? [];
    },
  });

  const getUser = (userId: string) => profiles.find((p: any) => p.id === userId);

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, userId, amount, type }: { id: string; status: string; userId: string; amount: number; type: string }) => {
      const { error } = await (supabase.from("transactions") as any).update({ status }).eq("id", id);
      if (error) throw error;

      // If approving a deposit, add to wallet
      if (status === "completed" && type === "deposit") {
        const { data: wallet } = await (supabase.from("wallets") as any).select("deposit_balance").eq("user_id", userId).single();
        if (wallet) {
          await (supabase.from("wallets") as any).update({ deposit_balance: (wallet.deposit_balance ?? 0) + amount }).eq("user_id", userId);
        }
        // Process referral bonus on first deposit
        await (supabase.rpc as any)("process_referral_bonus", { p_user_id: userId });
      }
      // If approving a withdrawal, deduct from winning_balance
      if (status === "completed" && type === "withdrawal") {
        const { data: wallet } = await (supabase.from("wallets") as any).select("winning_balance").eq("user_id", userId).single();
        if (wallet) {
          await (supabase.from("wallets") as any).update({ winning_balance: Math.max(0, (wallet.winning_balance ?? 0) - amount) }).eq("user_id", userId);
        }
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-transactions"] }); toast.success("Transaction updated"); },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = transactions.filter((t: any) => {
    const user = getUser(t.user_id);
    const matchesSearch = !search || (user?.username || "").toLowerCase().includes(search.toLowerCase()) || t.type.includes(search.toLowerCase());
    const matchesTab = tab === "all" || t.status === tab || t.type === tab;
    return matchesSearch && matchesTab;
  });

  const statusColor = (s: string) => {
    if (s === "completed") return "default";
    if (s === "pending") return "secondary";
    if (s === "rejected") return "destructive";
    return "outline";
  };

  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-bold">Wallet & Transactions</h1>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by username or type..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="deposit">Deposits</TabsTrigger>
          <TabsTrigger value="withdrawal">Withdrawals</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? <p className="text-muted-foreground text-sm">Loading...</p> : (
        <div className="space-y-2">
          {filtered.length === 0 && <p className="text-center text-muted-foreground text-sm py-8">No transactions found</p>}
          {filtered.map((t: any) => {
            const user = getUser(t.user_id);
            return (
              <Card key={t.id} className="glass-card p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{user?.username || t.user_id.slice(0, 8)}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.type} • ₹{t.amount} • {t.created_at ? formatIST(t.created_at, "dd MMM h:mm a") : ""}
                    </p>
                    {t.description && <p className="text-[10px] text-muted-foreground/60 mt-0.5">{t.description}</p>}
                  </div>
                  <Badge variant={statusColor(t.status) as any} className="text-[10px]">{t.status}</Badge>
                  {t.status === "pending" && (
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-primary"
                        onClick={() => updateStatus.mutate({ id: t.id, status: "completed", userId: t.user_id, amount: t.amount, type: t.type })}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive"
                        onClick={() => updateStatus.mutate({ id: t.id, status: "rejected", userId: t.user_id, amount: t.amount, type: t.type })}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Cashback Offers Section */}
      <div className="border-t border-border/20 pt-5 mt-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-lg font-bold flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" /> Cashback Offers
          </h2>
          <Button size="sm" onClick={() => setCashbackDialogOpen(true)} className="gap-1">
            <Plus className="h-4 w-4" /> Add Offer
          </Button>
        </div>
        {cashbackOffers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No cashback offers created</p>
        ) : (
          <div className="space-y-2">
            {cashbackOffers.map((offer: any) => (
              <Card key={offer.id} className="glass-card p-4 flex items-center justify-between gap-3">
                <div className="flex-1">
                  <p className="text-sm font-bold">{offer.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {offer.cashback_percent}% cashback (max ₹{offer.max_cashback}) on deposits ≥ ₹{offer.min_deposit}
                  </p>
                </div>
                <Badge variant={offer.is_active ? "default" : "secondary"} className="text-[10px] cursor-pointer"
                  onClick={() => toggleCashback.mutate({ id: offer.id, is_active: !offer.is_active })}>
                  {offer.is_active ? "Active" : "Inactive"}
                </Badge>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteCashback.mutate(offer.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Cashback Dialog */}
      <Dialog open={cashbackDialogOpen} onOpenChange={setCashbackDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Cashback Offer</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-3">
            <div><Label className="text-xs">Offer Name</Label><Input value={cbForm.name} onChange={e => setCbForm(p => ({ ...p, name: e.target.value }))} placeholder="IPL Season Cashback" /></div>
            <div><Label className="text-xs">Description</Label><Input value={cbForm.description} onChange={e => setCbForm(p => ({ ...p, description: e.target.value }))} placeholder="Get extra bonus on deposits" /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-xs">Min Deposit (₹)</Label><Input type="number" value={cbForm.min_deposit} onChange={e => setCbForm(p => ({ ...p, min_deposit: e.target.value }))} /></div>
              <div><Label className="text-xs">Cashback %</Label><Input type="number" value={cbForm.cashback_percent} onChange={e => setCbForm(p => ({ ...p, cashback_percent: e.target.value }))} /></div>
              <div><Label className="text-xs">Max Cashback (₹)</Label><Input type="number" value={cbForm.max_cashback} onChange={e => setCbForm(p => ({ ...p, max_cashback: e.target.value }))} /></div>
            </div>
            <Button onClick={() => saveCashback.mutate()} disabled={saveCashback.isPending || !cbForm.name.trim()} className="w-full">
              {saveCashback.isPending ? "Creating..." : "Create Offer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminWallet;
