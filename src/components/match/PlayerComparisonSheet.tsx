import { useState } from "react";
import { BarChart3, ArrowLeftRight } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MatchPlayer } from "@/hooks/useMatchPlayers";

interface PlayerComparisonSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  players: MatchPlayer[];
}

const ROLE_LABELS: Record<string, string> = { WK: "Wicket-Keeper", BAT: "Batsman", AR: "All-Rounder", BOWL: "Bowler" };

const PlayerComparisonSheet = ({ open, onOpenChange, players }: PlayerComparisonSheetProps) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [step, setStep] = useState<"select" | "compare">("select");

  const togglePlayer = (id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) return prev.filter(p => p !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  };

  const selectedPlayers = players.filter(p => selectedIds.includes(p.player_id));

  const handleCompare = () => {
    if (selectedIds.length < 2) return;
    setStep("compare");
  };

  const handleReset = () => {
    setSelectedIds([]);
    setStep("select");
  };

  const stats = [
    { label: "Credit Value", key: "credit_value" },
    { label: "Fantasy Pts", key: "fantasy_points" },
    { label: "Selected By", key: "selected_by_percent" },
    { label: "Role", key: "role" },
    { label: "Team", key: "team" },
  ];

  return (
    <Sheet open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) handleReset(); }}>
      <SheetContent side="bottom" className="rounded-t-3xl border-t border-border/20 bg-background px-0 pb-0 max-h-[85vh]">
        <div className="flex justify-center pt-2 pb-1">
          <div className="h-1 w-10 rounded-full bg-border/40" />
        </div>
        <SheetHeader className="px-5 pb-3">
          <SheetTitle className="font-display text-lg text-left flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4 text-primary" />
            Compare Players
          </SheetTitle>
        </SheetHeader>

        {step === "select" ? (
          <div className="px-5 overflow-y-auto" style={{ maxHeight: "calc(85vh - 180px)" }}>
            <p className="text-xs text-muted-foreground mb-3">Select 2-3 players to compare</p>
            <div className="space-y-1.5 pb-4">
              {players.map(mp => {
                const isSelected = selectedIds.includes(mp.player_id);
                return (
                  <div
                    key={mp.player_id}
                    onClick={() => togglePlayer(mp.player_id)}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border",
                      isSelected
                        ? "border-primary/30 bg-primary/5"
                        : "border-border/15 bg-secondary/20 hover:border-border/30"
                    )}
                  >
                    <div className={cn(
                      "h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                      isSelected ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                    )}>
                      {mp.player.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{mp.player.name}</p>
                      <p className="text-[10px] text-muted-foreground">{mp.player.team} • {ROLE_LABELS[mp.player.role] || mp.player.role}</p>
                    </div>
                    <span className="text-xs font-bold text-primary">{mp.player.credit_value} Cr</span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="px-5 overflow-y-auto pb-4" style={{ maxHeight: "calc(85vh - 180px)" }}>
            {/* Player headers */}
            <div className="flex gap-2 mb-4">
              {selectedPlayers.map(mp => (
                <div key={mp.player_id} className="flex-1 text-center rounded-xl p-3 border border-border/20" style={{ background: "hsl(228 16% 10%)" }}>
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-1.5 text-sm font-bold text-primary">
                    {mp.player.name.charAt(0)}
                  </div>
                  <p className="text-xs font-bold truncate">{mp.player.name}</p>
                  <p className="text-[9px] text-muted-foreground">{mp.player.team}</p>
                </div>
              ))}
            </div>

            {/* Stats comparison */}
            <div className="space-y-0">
              {stats.map(stat => {
                const values = selectedPlayers.map(mp => {
                  if (stat.key === "credit_value") return String(mp.player.credit_value);
                  if (stat.key === "role") return mp.player.role;
                  if (stat.key === "team") return mp.player.team;
                  if (stat.key === "fantasy_points") return String(mp.fantasy_points ?? 0);
                  if (stat.key === "selected_by_percent") return String(mp.selected_by_percent ?? 0);
                  return "0";
                });

                return (
                  <div key={stat.key} className="flex items-center border-b border-border/10 py-3">
                    <span className="text-[10px] text-muted-foreground w-20 shrink-0">{stat.label}</span>
                    <div className="flex-1 flex gap-2">
                      {values.map((val, i) => (
                        <div key={i} className="flex-1 text-center">
                          <span className="text-sm font-bold text-foreground">
                            {val}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <Button variant="outline" onClick={handleReset} className="w-full mt-4 rounded-xl">
              Compare Other Players
            </Button>
          </div>
        )}

        {/* Compare CTA */}
        {step === "select" && (
          <div className="px-5 py-4 border-t border-border/15 safe-bottom" style={{ background: "hsl(228 18% 5% / 0.8)" }}>
            <Button
              onClick={handleCompare}
              disabled={selectedIds.length < 2}
              className="w-full font-bold rounded-2xl h-12 text-sm disabled:opacity-30 border-0"
              style={{
                background: selectedIds.length < 2 ? "hsl(228 14% 15%)" : "linear-gradient(135deg, hsl(152 100% 50%), hsl(195 100% 55%))",
              }}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Compare {selectedIds.length} Player{selectedIds.length !== 1 ? "s" : ""}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default PlayerComparisonSheet;
