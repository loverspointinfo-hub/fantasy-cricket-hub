import { cn } from "@/lib/utils";
import { ArrowUpDown, Crown, Swords, Shield, Trophy, Users, Flame, Filter } from "lucide-react";

const categories = [
  { key: "all", label: "View All", icon: Filter },
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
  if (visibleCategories.length <= 2) return null;

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-4 px-4">
      {visibleCategories.map(cat => {
        const isActive = active === cat.key;
        return (
          <button
            key={cat.key}
            onClick={() => onChange(cat.key)}
            className={cn(
              "relative flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-semibold transition-all whitespace-nowrap flex-shrink-0",
              isActive ? "text-foreground" : "text-muted-foreground/50 hover:text-muted-foreground"
            )}
            style={isActive ? {
              background: "linear-gradient(135deg, hsl(228 16% 14%), hsl(228 16% 10%))",
              border: "1px solid hsl(228 12% 22%)",
              boxShadow: "0 2px 8px hsl(228 18% 3% / 0.3)",
            } : {
              background: "transparent",
              border: "1px solid hsl(228 12% 16% / 0.3)",
            }}
          >
            <cat.icon className="h-3 w-3" />
            {cat.label}
          </button>
        );
      })}
    </div>
  );
};

export default ContestCategoryTabs;
