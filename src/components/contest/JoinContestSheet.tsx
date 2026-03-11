import { useState } from "react";
import { Crown, Star, Check, Trophy, AlertCircle, Wallet, Sparkles } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { UserTeam } from "@/hooks/useUserTeams";
import { Contest } from "@/hooks/useContests";
import { useJoinContest } from "@/hooks/useContestEntries";
import { useWallet } from "@/hooks/useWallet";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { item } from "@/lib/animations";

interface JoinContestSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contest: Contest | null;
  teams: UserTeam[];
  joinedTeamIds: string[];
  onCreateTeam: () => void;
}

const JoinContestSheet = ({
  open,
  onOpenChange,
  contest,
  teams,
  joinedTeamIds,
  onCreateTeam,
}: JoinContestSheetProps) => {
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const joinContest = useJoinContest();
  const { data: wallet } = useWallet();

  const totalBalance = (wallet?.deposit_balance ?? 0) + (wallet?.winning_balance ?? 0) + (wallet?.bonus_balance ?? 0);
  const entryFee = contest?.entry_fee ?? 0;
  const hasInsufficientBalance = entryFee > 0 && totalBalance < entryFee;

  const handleJoin = () => {
    if (!contest || !selectedTeamId) return;
    joinContest.mutate(
      { contestId: contest.id, teamId: selectedTeamId },
      {
        onSuccess: () => {
          toast.success("Joined contest successfully!");
          onOpenChange(false);
          setSelectedTeamId(null);
        },
        onError: (err: any) => {
          toast.error(err.message || "Failed to join contest");
        },
      }
    );
  };

  if (!contest) return null;

  const availableTeams = teams.filter((t) => !joinedTeamIds.includes(t.id));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl border-t border-border/20 bg-background px-0 pb-0 max-h-[85vh]">
        {/* Handle bar */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="h-1 w-10 rounded-full bg-border/40" />
        </div>

        <SheetHeader className="px-5 pb-3">
          <SheetTitle className="font-display text-lg text-left flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Join Contest
          </SheetTitle>
        </SheetHeader>

        {/* Contest summary */}
        <div className="px-5 pb-2">
          <div className="relative rounded-2xl overflow-hidden p-4"
            style={{
              background: "linear-gradient(145deg, hsl(228 16% 12% / 0.9), hsl(228 20% 7% / 0.8))",
              border: "1px solid hsl(228 12% 18% / 0.6)",
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-display font-bold text-sm">{contest.name}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {contest.max_entries - contest.current_entries} spots left
                </p>
              </div>
              <div className="text-right">
                <p className="text-[9px] text-muted-foreground uppercase tracking-[0.15em]">Entry Fee</p>
                <p className="font-display font-bold text-xl mt-0.5">
                  {contest.entry_fee === 0 ? (
                    <span className="text-[hsl(var(--neon-green))]">FREE</span>
                  ) : (
                    <span className="text-gradient">₹{contest.entry_fee}</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Wallet balance */}
        {entryFee > 0 && (
          <div className="px-5 pb-4">
            <div className={cn(
              "rounded-xl p-3 flex items-center justify-between border transition-all",
              hasInsufficientBalance
                ? "bg-destructive/8 border-destructive/20"
                : "bg-primary/5 border-primary/15"
            )}>
              <div className="flex items-center gap-2">
                <div className={cn(
                  "h-7 w-7 rounded-lg flex items-center justify-center",
                  hasInsufficientBalance ? "bg-destructive/15" : "bg-primary/10"
                )}>
                  <Wallet className={cn("h-3.5 w-3.5", hasInsufficientBalance ? "text-destructive" : "text-primary")} />
                </div>
                <span className="text-xs font-medium">Balance</span>
              </div>
              <span className={cn(
                "font-display font-bold text-sm",
                hasInsufficientBalance ? "text-destructive" : "text-foreground"
              )}>
                ₹{totalBalance.toFixed(2)}
              </span>
            </div>
            {hasInsufficientBalance && (
              <p className="text-[11px] text-destructive mt-1.5 px-1 flex items-center gap-1">
                <AlertCircle className="h-3 w-3 shrink-0" />
                Add ₹{(entryFee - totalBalance).toFixed(2)} more to join this contest
              </p>
            )}
          </div>
        )}

        {/* Team selection */}
        <div className="px-5 overflow-y-auto flex-1" style={{ maxHeight: "calc(85vh - 300px)" }}>
          {availableTeams.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-muted-foreground">
              <div className="h-14 w-14 rounded-2xl bg-secondary/60 flex items-center justify-center mb-3">
                <AlertCircle className="h-6 w-6 opacity-30" />
              </div>
              <p className="text-sm font-semibold text-foreground/80">
                {teams.length === 0 ? "No teams created yet" : "All teams already joined"}
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1 mb-5">
                {teams.length === 0
                  ? "Create a team first to join this contest"
                  : "Create another team to join again"}
              </p>
              <Button
                onClick={() => { onOpenChange(false); onCreateTeam(); }}
                className="font-bold rounded-xl h-10 px-6 text-sm border-0"
                style={{
                  background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))",
                }}
              >
                Create Team
              </Button>
            </div>
          ) : (
            <div className="space-y-2 pb-4">
              <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-semibold px-1 mb-2">
                Select a team
              </p>
              {availableTeams.map((team) => {
                const isSelected = selectedTeamId === team.id;
                return (
                  <motion.div
                    key={team.id}
                    variants={item}
                    initial="hidden"
                    animate="show"
                    onClick={() => setSelectedTeamId(team.id)}
                    className={cn(
                      "relative rounded-xl p-3.5 flex items-center gap-3 cursor-pointer transition-all duration-300 border",
                      isSelected
                        ? "border-primary/30 bg-primary/5"
                        : "border-border/20 bg-secondary/20 hover:border-border/40"
                    )}
                    style={isSelected ? {
                      boxShadow: "0 0 20px hsl(152 100% 50% / 0.06), 0 4px 12px hsl(228 18% 3% / 0.3)",
                    } : undefined}
                  >
                    <div className={cn(
                      "h-10 w-10 rounded-xl flex items-center justify-center transition-all duration-300",
                      isSelected ? "gradient-primary shadow-lg" : "bg-secondary/80"
                    )}>
                      {isSelected ? (
                        <Check className="h-4 w-4 text-primary-foreground" />
                      ) : (
                        <span className="font-display font-bold text-xs text-muted-foreground">T</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{team.name || "Team"}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {team.captain && (
                          <span className="flex items-center gap-0.5 text-[9px] font-bold text-[hsl(var(--gold))]">
                            <Crown className="h-3 w-3" /> {team.captain.name.split(" ").pop()}
                          </span>
                        )}
                        {team.vice_captain && (
                          <span className="flex items-center gap-0.5 text-[9px] font-bold text-primary">
                            <Star className="h-3 w-3" /> {team.vice_captain.name.split(" ").pop()}
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          • {team.total_credits?.toFixed(1)} Cr
                        </span>
                      </div>
                    </div>
                    <div className="text-[10px] text-muted-foreground font-medium">
                      {team.team_players.length} players
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Join CTA */}
        {availableTeams.length > 0 && (
          <div className="px-5 py-4 border-t border-border/15 safe-bottom"
            style={{ background: "hsl(228 18% 5% / 0.8)", backdropFilter: "blur(12px)" }}
          >
            <Button
              onClick={handleJoin}
              disabled={!selectedTeamId || joinContest.isPending || hasInsufficientBalance}
              className="w-full font-bold rounded-2xl h-13 text-base disabled:opacity-30 relative overflow-hidden border-0"
              style={{
                background: (!selectedTeamId || hasInsufficientBalance)
                  ? "hsl(228 14% 15%)"
                  : "linear-gradient(135deg, hsl(152 100% 50%), hsl(195 100% 55%))",
                boxShadow: (!selectedTeamId || hasInsufficientBalance)
                  ? "none"
                  : "0 4px 24px hsl(152 100% 50% / 0.25)",
              }}
            >
              <span className="shimmer absolute inset-0" />
              <span className="relative z-10 flex items-center gap-2 text-primary-foreground">
                <Trophy className="h-5 w-5" />
                {joinContest.isPending
                  ? "Joining..."
                  : hasInsufficientBalance
                  ? "Insufficient Balance"
                  : contest.entry_fee === 0
                  ? "Join for Free"
                  : `Join for ₹${contest.entry_fee}`}
              </span>
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default JoinContestSheet;