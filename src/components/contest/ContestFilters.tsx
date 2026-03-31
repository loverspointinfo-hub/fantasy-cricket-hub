import { useState } from "react";
import { Filter, X, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Contest } from "@/hooks/useContests";

interface ContestFiltersProps {
  contests: Contest[];
  onFiltered: (filtered: Contest[]) => void;
}

const FEE_RANGES = [
  { label: "Free", min: 0, max: 0 },
  { label: "₹1-49", min: 1, max: 49 },
  { label: "₹50-99", min: 50, max: 99 },
  { label: "₹100+", min: 100, max: Infinity },
];

const SPOTS_FILTERS = [
  { label: "Available", filter: (c: Contest) => c.current_entries < c.max_entries },
  { label: "Almost Full", filter: (c: Contest) => (c.current_entries / c.max_entries) >= 0.75 && c.current_entries < c.max_entries },
];

const ContestFilters = ({ contests, onFiltered }: ContestFiltersProps) => {
  const [search, setSearch] = useState("");
  const [selectedFee, setSelectedFee] = useState<number | null>(null);
  const [spotsFilter, setSpotsFilter] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const hasActive = search || selectedFee !== null || spotsFilter;

  const applyFilters = (s: string, fee: number | null, spots: string | null) => {
    let result = [...contests];
    if (s) result = result.filter(c => c.name.toLowerCase().includes(s.toLowerCase()));
    if (fee !== null) {
      const range = FEE_RANGES[fee];
      result = result.filter(c => c.entry_fee >= range.min && c.entry_fee <= range.max);
    }
    if (spots) {
      const sf = SPOTS_FILTERS.find(f => f.label === spots);
      if (sf) result = result.filter(sf.filter);
    }
    onFiltered(result);
  };

  const updateSearch = (v: string) => { setSearch(v); applyFilters(v, selectedFee, spotsFilter); };
  const toggleFee = (idx: number) => {
    const next = selectedFee === idx ? null : idx;
    setSelectedFee(next);
    applyFilters(search, next, spotsFilter);
  };
  const toggleSpots = (label: string) => {
    const next = spotsFilter === label ? null : label;
    setSpotsFilter(next);
    applyFilters(search, selectedFee, next);
  };
  const clearAll = () => {
    setSearch(""); setSelectedFee(null); setSpotsFilter(null);
    onFiltered(contests);
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search contests..."
            value={search}
            onChange={(e) => updateSearch(e.target.value)}
            className="pl-8 h-8 text-xs rounded-xl"
          />
        </div>
        <Button
          variant={showFilters ? "default" : "outline"}
          size="sm"
          className="h-8 gap-1 text-xs rounded-xl"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="h-3 w-3" />
          {hasActive && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
        </Button>
        {hasActive && (
          <Button variant="ghost" size="sm" className="h-8 text-xs text-destructive" onClick={clearAll}>
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {showFilters && (
        <div className="p-3 rounded-xl space-y-2.5" style={{ background: "hsl(228 16% 10%)", border: "1px solid hsl(228 12% 16%)" }}>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Entry Fee</p>
            <div className="flex flex-wrap gap-1.5">
              {FEE_RANGES.map((r, i) => (
                <button
                  key={r.label}
                  onClick={() => toggleFee(i)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all",
                    selectedFee === i
                      ? "bg-primary/20 text-primary border-primary/30"
                      : "bg-secondary/30 text-muted-foreground border-border/20 hover:border-border/40"
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Spots</p>
            <div className="flex flex-wrap gap-1.5">
              {SPOTS_FILTERS.map((f) => (
                <button
                  key={f.label}
                  onClick={() => toggleSpots(f.label)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all",
                    spotsFilter === f.label
                      ? "bg-primary/20 text-primary border-primary/30"
                      : "bg-secondary/30 text-muted-foreground border-border/20 hover:border-border/40"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContestFilters;
