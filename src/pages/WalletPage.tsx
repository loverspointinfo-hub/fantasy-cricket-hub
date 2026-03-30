import { useState, useEffect } from "react";
import { Wallet, Plus, ArrowDownLeft, ArrowUpRight, History, TrendingUp, Gift, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { staggerContainer, item } from "@/lib/animations";
import { useWallet, useTransactions } from "@/hooks/useWallet";
import { useAuth } from "@/hooks/useAuth";
import { formatIST } from "@/lib/date-utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { sendTelegramNotification } from "@/lib/telegram";
import { Badge } from "@/components/ui/badge";

const QUICK_AMOUNTS = [100, 250, 500, 1000];

const WalletPage = () => {
  const { user } = useAuth();
  const { data: wallet } = useWallet();
  const { data: transactions = [] } = useTransactions();
  const qc = useQueryClient();

  const [addCashOpen, setAddCashOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const totalBalance = wallet
    ? wallet.deposit_balance + wallet.winning_balance + wallet.bonus_balance
    : 0;

  const handleAddCash = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }
    if (!user) { toast.error("Please login first"); return; }
    setSubmitting(true);
    try {
      // Create deposit request
      const { data: req, error: reqErr } = await (supabase.from("deposit_requests") as any).insert({
        user_id: user.id,
        amount: amt,
      }).select().single();
      if (reqErr) throw reqErr;

      // Also create transaction record
      const { error } = await (supabase.from("transactions") as any).insert({
        user_id: user.id,
        type: "deposit",
        amount: amt,
        description: `Add cash ₹${amt}`,
        status: "pending",
        reference_id: req.id,
      });
      if (error) throw error;

      // Send Telegram notification with approve/reject buttons
      const { data: profile } = await (supabase.from("profiles") as any)
        .select("username").eq("id", user.id).single();
      sendTelegramNotification('deposit_request', {
        username: profile?.username || user.email,
        email: user.email,
        amount: amt,
        request_id: req.id,
      });

      toast.success("Deposit request submitted! It will be credited after admin approval.");
      qc.invalidateQueries({ queryKey: ["transactions"] });
      setAddCashOpen(false);
      setAmount("");
    } catch (e: any) {
      toast.error(e.message || "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdraw = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }
    if (!user) { toast.error("Please login first"); return; }
    const winnings = wallet?.winning_balance ?? 0;
    if (amt > winnings) { toast.error(`You can only withdraw up to ₹${winnings} from winnings`); return; }

    // KYC check for withdrawals over ₹10,000
    if (amt > 10000) {
      const { data: profile } = await (supabase.from("profiles") as any)
        .select("kyc_status").eq("id", user.id).single();
      if (profile?.kyc_status !== "verified") {
        toast.error("KYC verification required for withdrawals above ₹10,000. Please complete your KYC first.");
        return;
      }
    }
    setSubmitting(true);
    try {
      const { error } = await (supabase.from("transactions") as any).insert({
        user_id: user.id,
        type: "withdrawal",
        amount: amt,
        description: `Withdraw ₹${amt}`,
        status: "pending",
      });
      if (error) throw error;
      // Send Telegram notification
      const { data: profile } = await (supabase.from("profiles") as any)
        .select("username").eq("id", user.id).single();
      sendTelegramNotification('withdrawal', {
        username: profile?.username || user.email,
        email: user.email,
        amount: amt,
      });
      toast.success("Withdrawal request submitted! It will be processed after admin approval.");
      qc.invalidateQueries({ queryKey: ["transactions"] });
      setWithdrawOpen(false);
      setAmount("");
    } catch (e: any) {
      toast.error(e.message || "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="floating-orb w-64 h-64 bg-neon-green -top-10 right-0" />
      <div className="floating-orb w-48 h-48 bg-neon-purple bottom-40 -left-10" style={{ animationDelay: "4s" }} />

      <header className="sticky top-0 z-40 border-b border-border/30" style={{
        background: "linear-gradient(180deg, hsl(228 18% 5% / 0.95), hsl(228 18% 5% / 0.8))",
        backdropFilter: "blur(20px)",
      }}>
        <div className="mx-auto max-w-lg px-4 py-3">
          <h1 className="font-display text-xl font-bold">Wallet</h1>
        </div>
      </header>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="mx-auto max-w-lg px-4 py-6 space-y-5 relative z-10"
      >
        <motion.div variants={item} className="glass-card-premium p-6 text-center relative overflow-hidden">
          <div className="shimmer absolute inset-0" />
          <div className="relative z-10">
            <p className="text-[10px] text-muted-foreground uppercase tracking-[0.25em] font-semibold mb-2">Total Balance</p>
            <p className="font-display text-4xl font-bold text-gradient neon-glow">
              ₹{totalBalance.toFixed(2)}
            </p>
            <div className="flex gap-3 mt-5 justify-center">
              <motion.div whileTap={{ scale: 0.95 }}>
                <Button
                  className="gradient-primary font-bold rounded-xl px-6 h-11 text-sm relative overflow-hidden"
                  onClick={() => { setAmount(""); setAddCashOpen(true); }}
                >
                  <span className="shimmer absolute inset-0" />
                  <Plus className="h-4 w-4 mr-1.5 relative z-10" />
                  <span className="relative z-10">Add Cash</span>
                </Button>
              </motion.div>
              <motion.div whileTap={{ scale: 0.95 }}>
                <Button
                  variant="outline"
                  className="border-primary/30 text-primary rounded-xl px-6 h-11 text-sm font-bold hover:bg-primary/10"
                  onClick={() => { setAmount(""); setWithdrawOpen(true); }}
                >
                  <ArrowUpRight className="h-4 w-4 mr-1.5" /> Withdraw
                </Button>
              </motion.div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Deposits", amount: `₹${wallet?.deposit_balance?.toFixed(0) || "0"}`, icon: ArrowDownLeft, color: "text-neon-cyan", desc: "Unutilized" },
            { label: "Winnings", amount: `₹${wallet?.winning_balance?.toFixed(0) || "0"}`, icon: TrendingUp, color: "text-neon-green", desc: "Withdrawable" },
            { label: "Bonus", amount: `₹${wallet?.bonus_balance?.toFixed(0) || "0"}`, icon: Wallet, color: "text-neon-orange", desc: "Promotional" },
          ].map((w) => (
            <motion.div key={w.label} variants={item} className="glass-card p-4 text-center group hover:border-border/50 transition-all">
              <div className={`mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-secondary ${w.color}`}>
                <w.icon className="h-4 w-4" />
              </div>
              <p className="font-display text-lg font-bold">{w.amount}</p>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-0.5">{w.desc}</p>
            </motion.div>
          ))}
        </div>

        <motion.div variants={item} className="glass-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <History className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-display text-sm font-bold uppercase tracking-wider">Recent Transactions</h3>
          </div>
          {transactions.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-muted-foreground">
              <div className="relative mb-3">
                <Wallet className="h-10 w-10 opacity-15" />
                <div className="absolute inset-0 blur-xl bg-primary/10 rounded-full" />
              </div>
              <p className="text-sm font-medium">No transactions yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Add cash to start playing</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map(t => (
                <div key={t.id} className="flex items-center justify-between py-2 border-b border-border/20 last:border-0">
                  <div>
                    <p className="text-sm font-medium capitalize">{t.type.replace("_", " ")}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatIST(t.created_at, "dd MMM, h:mm a")}
                      {t.status === "pending" && <span className="ml-1.5 text-amber-400 font-semibold">• Pending</span>}
                    </p>
                  </div>
                  <p className={`font-display font-bold text-sm ${t.type === "deposit" || t.type === "contest_winning" || t.type === "bonus" || t.type === "admin_credit" ? "text-neon-green" : "text-neon-red"}`}>
                    {t.type === "deposit" || t.type === "contest_winning" || t.type === "bonus" || t.type === "admin_credit" ? "+" : "-"}₹{Math.abs(t.amount)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* Add Cash Dialog */}
      <Dialog open={addCashOpen} onOpenChange={setAddCashOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Cash</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-3">
            <div>
              <Label className="text-xs">Amount (₹)</Label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="text-lg font-bold h-12"
              />
            </div>
            <div className="flex gap-2">
              {QUICK_AMOUNTS.map(qa => (
                <Button
                  key={qa}
                  variant={amount === String(qa) ? "default" : "outline"}
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => setAmount(String(qa))}
                >
                  ₹{qa}
                </Button>
              ))}
            </div>
            <Button onClick={handleAddCash} disabled={submitting} className="w-full h-11 font-bold">
              {submitting ? "Submitting..." : `Add ₹${parseFloat(amount) > 0 ? amount : "0"}`}
            </Button>
            <p className="text-[10px] text-muted-foreground text-center">Amount will be credited after admin approval</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Withdraw Dialog */}
      <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Withdraw</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-3">
            <p className="text-xs text-muted-foreground">
              Withdrawable balance: <span className="font-bold text-foreground">₹{wallet?.winning_balance?.toFixed(0) ?? 0}</span>
            </p>
            <div>
              <Label className="text-xs">Amount (₹)</Label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="text-lg font-bold h-12"
              />
            </div>
            <Button onClick={handleWithdraw} disabled={submitting} className="w-full h-11 font-bold">
              {submitting ? "Submitting..." : `Withdraw ₹${parseFloat(amount) > 0 ? amount : "0"}`}
            </Button>
            <p className="text-[10px] text-muted-foreground text-center">Withdrawal will be processed after admin approval</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WalletPage;
