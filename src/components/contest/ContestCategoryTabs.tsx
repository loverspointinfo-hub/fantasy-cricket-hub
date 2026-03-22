import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Crown, Swords, Shield, Trophy, Users, Flame } from "lucide-react";

const categories = [
  { key: "all", label: "All", icon: Trophy },
  { key: "mega", label: "Mega", icon: Crown },
  { key: "h2h", label: "H2H", icon: Swords },
  { key: "winner_takes_all", label: "Winner", icon: Flame },
  { key: "practice", label: "Practice", icon: Shield },
  { key: "private", label: "Private", icon: Users },
];

interface ContestCategoryTabsProps {
  active: string;
  onChange: (key: string) => void;
  counts: Record<string, number>;
}

const ContestCategoryTabs = ({ active, onChange, counts }: ContestCategoryTabsProps) => {
  const visibleCategories = categories.filter(c => c.key === "all" || (counts[c.key] || 0) > 0);

  if (visibleCategories.length <= 2) return null; // No need for tabs if only "All" + 1 type

  return (
    <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1 -mx-4 px-4">
      {visibleCategories.map(cat => {
        const isActive = active === cat.key;
        const count = cat.key === "all" ? Object.values(counts).reduce((a, b) => a + b, 0) : counts[cat.key] || 0;
        return (
          <button
            key={cat.key}
            onClick={() => onChange(cat.key)}
            className={cn(
              "relative flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-semibold transition-all whitespace-nowrap flex-shrink-0",
              isActive ? "text-primary" : "text-muted-foreground/60 hover:text-muted-foreground"
            )}
            style={isActive ? {
              background: "linear-gradient(135deg, hsl(152 100% 50% / 0.1), hsl(195 100% 55% / 0.06))",
              border: "1px solid hsl(152 100% 50% / 0.2)",
            } : {
              background: "hsl(228 16% 10% / 0.5)",
              border: "1px solid hsl(228 12% 16% / 0.4)",
            }}
          >
            <cat.icon className="h-3 w-3" />
            {cat.label}
            <span className={cn(
              "text-[9px] rounded-full h-4 min-w-[16px] flex items-center justify-center px-1",
              isActive ? "bg-primary/20 text-primary" : "bg-secondary/60 text-muted-foreground/50"
            )}>
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default ContestCategoryTabs;
