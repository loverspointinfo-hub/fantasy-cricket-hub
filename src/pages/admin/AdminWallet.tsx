import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, X, Search } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const AdminWallet = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");

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
    </div>
  );
};

export default AdminWallet;
