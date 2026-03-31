import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Trophy } from "lucide-react";

interface PrizeRow {
  rank?: number;
  rank_from?: number;
  rank_to?: number;
  prize: number;
}

interface Props {
  value: PrizeRow[];
  onChange: (rows: PrizeRow[]) => void;
}

const PrizeBreakdownEditor = ({ value, onChange }: Props) => {
  const [mode, setMode] = useState<"single" | "range">("single");

  const addRow = () => {
    const lastRank = value.length > 0
      ? (value[value.length - 1].rank || value[value.length - 1].rank_to || 0)
      : 0;
    if (mode === "single") {
      onChange([...value, { rank: lastRank + 1, prize: 0 }]);
    } else {
      onChange([...value, { rank_from: lastRank + 1, rank_to: lastRank + 5, prize: 0 }]);
    }
  };

  const updateRow = (idx: number, updates: Partial<PrizeRow>) => {
    const next = [...value];
    next[idx] = { ...next[idx], ...updates };
    onChange(next);
  };

  const removeRow = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  const totalPrize = value.reduce((s, r) => {
    if (r.rank_from && r.rank_to) {
      return s + r.prize * (r.rank_to - r.rank_from + 1);
    }
    return s + r.prize;
  }, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-bold flex items-center gap-1.5">
          <Trophy className="h-3.5 w-3.5 text-primary" /> Prize Breakdown
        </Label>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setMode("single")}
            className={`text-[10px] px-2 py-1 rounded-md font-semibold transition-colors ${
              mode === "single" ? "bg-primary/20 text-primary" : "bg-secondary/50 text-muted-foreground"
            }`}
          >
            Single Rank
          </button>
          <button
            type="button"
            onClick={() => setMode("range")}
            className={`text-[10px] px-2 py-1 rounded-md font-semibold transition-colors ${
              mode === "range" ? "bg-primary/20 text-primary" : "bg-secondary/50 text-muted-foreground"
            }`}
          >
            Range
          </button>
        </div>
      </div>

      {value.length > 0 && (
        <div className="space-y-2">
          {value.map((row, idx) => (
            <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/20 border border-border/20">
              {row.rank != null ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground font-medium">Rank</span>
                  <Input
                    type="number"
                    min={1}
                    value={row.rank}
                    onChange={(e) => updateRow(idx, { rank: parseInt(e.target.value) || 1 })}
                    className="w-16 h-7 text-xs text-center"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground font-medium">Rank</span>
                  <Input
                    type="number"
                    min={1}
                    value={row.rank_from}
                    onChange={(e) => updateRow(idx, { rank_from: parseInt(e.target.value) || 1 })}
                    className="w-14 h-7 text-xs text-center"
                  />
                  <span className="text-[10px] text-muted-foreground">to</span>
                  <Input
                    type="number"
                    min={row.rank_from || 1}
                    value={row.rank_to}
                    onChange={(e) => updateRow(idx, { rank_to: parseInt(e.target.value) || 1 })}
                    className="w-14 h-7 text-xs text-center"
                  />
                </div>
              )}
              <div className="flex items-center gap-1.5 ml-auto">
                <span className="text-[10px] text-muted-foreground font-medium">₹</span>
                <Input
                  type="number"
                  min={0}
                  value={row.prize}
                  onChange={(e) => updateRow(idx, { prize: parseFloat(e.target.value) || 0 })}
                  className="w-20 h-7 text-xs text-center font-bold"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive"
                  onClick={() => removeRow(idx)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <Button type="button" variant="outline" size="sm" className="gap-1 text-xs h-7" onClick={addRow}>
          <Plus className="h-3 w-3" /> Add {mode === "range" ? "Range" : "Rank"}
        </Button>
        {value.length > 0 && (
          <span className="text-[10px] font-bold text-muted-foreground">
            Total: <span className="text-primary">₹{totalPrize}</span>
          </span>
        )}
      </div>
    </div>
  );
};

export default PrizeBreakdownEditor;
