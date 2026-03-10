import { Wallet, Plus, ArrowDownLeft, ArrowUpRight, History, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

import { staggerContainer, item } from "@/lib/animations";

const WalletPage = () => (
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
      {/* Balance Card */}
      <motion.div variants={item} className="glass-card-premium p-6 text-center relative overflow-hidden">
        <div className="shimmer absolute inset-0" />
        <div className="relative z-10">
          <p className="text-[10px] text-muted-foreground uppercase tracking-[0.25em] font-semibold mb-2">
            Total Balance
          </p>
          <p className="font-display text-4xl font-bold text-gradient neon-glow">₹0.00</p>
          <div className="flex gap-3 mt-5 justify-center">
            <motion.div whileTap={{ scale: 0.95 }}>
              <Button className="gradient-primary font-bold rounded-xl px-6 h-11 text-sm relative overflow-hidden">
                <span className="shimmer absolute inset-0" />
                <Plus className="h-4 w-4 mr-1.5 relative z-10" />
                <span className="relative z-10">Add Cash</span>
              </Button>
            </motion.div>
            <motion.div whileTap={{ scale: 0.95 }}>
              <Button variant="outline" className="border-primary/30 text-primary rounded-xl px-6 h-11 text-sm font-bold hover:bg-primary/10">
                <ArrowUpRight className="h-4 w-4 mr-1.5" /> Withdraw
              </Button>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Tri-wallet */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Deposits", amount: "₹0", icon: ArrowDownLeft, color: "text-neon-cyan", desc: "Unutilized" },
          { label: "Winnings", amount: "₹0", icon: TrendingUp, color: "text-neon-green", desc: "Withdrawable" },
          { label: "Bonus", amount: "₹0", icon: Wallet, color: "text-neon-orange", desc: "Promotional" },
        ].map((w, i) => (
          <motion.div key={w.label} variants={item} className="glass-card p-4 text-center group hover:border-border/50 transition-all">
            <div className={`mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-secondary ${w.color}`}>
              <w.icon className="h-4 w-4" />
            </div>
            <p className="font-display text-lg font-bold">{w.amount}</p>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-0.5">{w.desc}</p>
          </motion.div>
        ))}
      </div>

      {/* Transactions */}
      <motion.div variants={item} className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <History className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-display text-sm font-bold uppercase tracking-wider">Recent Transactions</h3>
        </div>
        <div className="flex flex-col items-center py-8 text-muted-foreground">
          <div className="relative mb-3">
            <Wallet className="h-10 w-10 opacity-15" />
            <div className="absolute inset-0 blur-xl bg-primary/10 rounded-full" />
          </div>
          <p className="text-sm font-medium">No transactions yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Add cash to start playing</p>
        </div>
      </motion.div>
    </motion.div>
  </div>
);

export default WalletPage;
