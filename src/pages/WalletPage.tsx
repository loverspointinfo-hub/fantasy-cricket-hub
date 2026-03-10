import { Wallet, Plus, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const WalletPage = () => (
  <div className="min-h-screen">
    <header className="sticky top-0 z-40 glass-card rounded-none border-x-0 border-t-0 px-4 py-3">
      <div className="mx-auto max-w-lg">
        <h1 className="font-display text-lg font-bold tracking-wider">Wallet</h1>
      </div>
    </header>
    <div className="mx-auto max-w-lg px-4 py-6 space-y-4">
      {/* Balance Card */}
      <div className="glass-card p-6 text-center neon-border">
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Balance</p>
        <p className="font-display text-3xl font-bold neon-glow">₹0.00</p>
        <Button className="mt-4 gradient-primary font-semibold">
          <Plus className="h-4 w-4 mr-1" /> Add Cash
        </Button>
      </div>

      {/* Tri-wallet breakdown */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Unutilized", amount: "₹0", icon: ArrowDownLeft, desc: "Deposits" },
          { label: "Winnings", amount: "₹0", icon: ArrowUpRight, desc: "Withdrawable" },
          { label: "Bonus", amount: "₹0", icon: Wallet, desc: "Promotional" },
        ].map((item) => (
          <div key={item.label} className="glass-card p-3 text-center">
            <item.icon className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className="font-display text-sm font-bold mt-1">{item.amount}</p>
          </div>
        ))}
      </div>

      <div className="glass-card p-6 flex flex-col items-center text-muted-foreground">
        <p className="text-sm">No transactions yet</p>
      </div>
    </div>
  </div>
);

export default WalletPage;
