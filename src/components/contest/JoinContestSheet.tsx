import { useState } from "react";
import { Crown, Star, Check, Trophy, AlertCircle, Wallet } from "lucide-react";
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
      <SheetContent side="bottom" className="rounded-t-3xl border-t border-border/30 bg-background px-0 pb-0 max-h-[85vh]">
        <SheetHeader className="px-5 pb-3">
          <SheetTitle className="font-display text-lg text-left">Join Contest</SheetTitle>
        </SheetHeader>

        {/* Contest summary */}
        <div className="px-5 pb-4">
          <div className="glass-card p-4 flex items-center justify-between">
            <div>
              <p className="font-display font-bold text-sm">{contest.name}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {contest.max_entries - contest.current_entries} spots left
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Entry Fee</p>
              <p className="font-display font-bold text-lg">
                {contest.entry_fee === 0 ? (
                  <span className="text-primary">FREE</span>
                ) : (
                  <span>₹{contest.entry_fee}</span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Team selection */}
        <div className="px-5 overflow-y-auto flex-1" style={{ maxHeight: "calc(85vh - 260px)" }}>
          {availableTeams.length === 0 ? (
            <div className="glass-card flex flex-col items-center py-10 text-muted-foreground">
              <AlertCircle className="h-8 w-8 opacity-20 mb-2" />
              <p className="text-sm font-medium">
                {teams.length === 0 ? "No teams created yet" : "All teams already joined"}
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1 mb-4">
                {teams.length === 0
                  ? "Create a team first to join this contest"
                  : "Create another team to join again"}
              </p>
              <Button
                onClick={() => { onOpenChange(false); onCreateTeam(); }}
                className="gradient-primary font-bold rounded-xl h-10 px-6 text-sm"
              >
                Create Team
              </Button>
            </div>
          ) : (
            <div className="space-y-2 pb-4">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold px-1 mb-2">
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
                      "glass-card p-3.5 flex items-center gap-3 cursor-pointer transition-all",
                      isSelected && "border-primary/40 bg-primary/5"
                    )}
                  >
                    <div className={cn(
                      "h-10 w-10 rounded-xl flex items-center justify-center",
                      isSelected ? "gradient-primary" : "bg-secondary"
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
                    <div className="text-[10px] text-muted-foreground">
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
          <div className="px-5 py-4 border-t border-border/20 safe-bottom">
            <Button
              onClick={handleJoin}
              disabled={!selectedTeamId || joinContest.isPending}
              className="w-full gradient-primary font-bold rounded-xl h-12 text-base disabled:opacity-40 relative overflow-hidden"
            >
              <span className="shimmer absolute inset-0" />
              <span className="relative z-10 flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                {joinContest.isPending
                  ? "Joining..."
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
