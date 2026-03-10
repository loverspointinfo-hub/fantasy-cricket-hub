import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMatch } from "@/hooks/useMatches";
import { useContests, Contest } from "@/hooks/useContests";
import { useUserTeams, useDeleteTeam } from "@/hooks/useUserTeams";
import { useMyContestEntries } from "@/hooks/useContestEntries";
import { ArrowLeft, Clock, MapPin, Trophy, Users, ChevronRight, Zap, Shield, Crown, Swords, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { staggerContainer, item } from "@/lib/animations";
import { format } from "date-fns";
import { toast } from "sonner";
import SavedTeamCard from "@/components/team/SavedTeamCard";
import JoinContestSheet from "@/components/contest/JoinContestSheet";

const typeConfig: Record<string, { label: string; color: string; icon: typeof Trophy }> = {
  mega: { label: "Mega", color: "text-neon-green", icon: Crown },
  h2h: { label: "Head to Head", color: "text-neon-cyan", icon: Swords },
  practice: { label: "Practice", color: "text-muted-foreground", icon: Shield },
  winner_takes_all: { label: "Winner Takes All", color: "text-neon-orange", icon: Trophy },
  private: { label: "Private", color: "text-neon-purple", icon: Users },
};

const ContestCard = ({ contest, onJoin, isJoined }: { contest: Contest; onJoin: () => void; isJoined: boolean }) => {
  const config = typeConfig[contest.type] || typeConfig.mega;
  const fillPercent = Math.round((contest.current_entries / contest.max_entries) * 100);

  return (
    <motion.div variants={item} className="glass-card-hover p-0 overflow-hidden cursor-pointer group" onClick={onJoin}>
      <div className="px-4 pt-3.5 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <config.icon className={cn("h-4 w-4", config.color)} />
          <span className={cn("text-xs font-bold uppercase tracking-wider", config.color)}>{config.label}</span>
        </div>
        <div className="flex items-center gap-2">
          {isJoined && (
            <Badge className="bg-primary/15 text-primary border-primary/25 text-[9px] font-bold gap-1">
              <CheckCircle2 className="h-3 w-3" /> Joined
            </Badge>
          )}
          {contest.is_guaranteed && (
            <Badge className="bg-neon-green/15 text-neon-green border-neon-green/25 text-[9px] font-bold">
              Guaranteed
            </Badge>
          )}
        </div>
      </div>

      <div className="px-4 pb-3">
        <p className="font-display text-lg font-bold">{contest.name}</p>
        <div className="flex items-center justify-between mt-2">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Prize Pool</p>
            <p className="font-display text-xl font-bold text-gradient">
              ₹{contest.prize_pool.toLocaleString()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Entry</p>
            <p className="font-display text-lg font-bold">
              {contest.entry_fee === 0 ? (
                <span className="text-neon-green">FREE</span>
              ) : (
                `₹${contest.entry_fee}`
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-4 pb-3">
        <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
          <motion.div
            className="h-full rounded-full gradient-primary"
            initial={{ width: 0 }}
            animate={{ width: `${fillPercent}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-[10px] text-muted-foreground">
            {contest.current_entries} joined
          </span>
          <span className="text-[10px] text-muted-foreground">
            {contest.max_entries - contest.current_entries} spots left
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-border/20 px-4 py-2.5 bg-secondary/20">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Users className="h-3 w-3" /> {contest.max_entries} spots
          </span>
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Trophy className="h-3 w-3" /> {contest.prize_breakdown?.length || 1} winners
          </span>
        </div>
        <div className="flex items-center gap-1 text-primary text-xs font-semibold group-hover:gap-2 transition-all">
          {isJoined ? "View" : "Join"} <ChevronRight className="h-3.5 w-3.5" />
        </div>
      </div>
    </motion.div>
  );
};

const MatchDetail = () => {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const { data: match, isLoading: matchLoading } = useMatch(matchId || "");
  const { data: contests = [], isLoading: contestsLoading } = useContests(matchId || "");
  const { data: userTeams = [] } = useUserTeams(matchId || "");
  const { data: myEntries = [] } = useMyContestEntries(matchId || "");
  const deleteTeam = useDeleteTeam();

  const [joinSheetOpen, setJoinSheetOpen] = useState(false);
  const [selectedContest, setSelectedContest] = useState<Contest | null>(null);

  const joinedContestIds = new Set(myEntries.map((e: any) => e.contest_id));
  const joinedTeamIdsForContest = (contestId: string) =>
    myEntries.filter((e: any) => e.contest_id === contestId).map((e: any) => e.team_id);

  const handleDeleteTeam = (teamId: string) => {
    deleteTeam.mutate(teamId, {
      onSuccess: () => toast.success("Team deleted"),
      onError: (err: any) => toast.error(err.message || "Failed to delete team"),
    });
  };

  const handleEditTeam = (teamId: string) => {
    navigate(`/match/${matchId}/edit-team/${teamId}`);
  };

  const handleJoinContest = (contest: Contest) => {
    setSelectedContest(contest);
    setJoinSheetOpen(true);
  };

  if (matchLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Match not found</p>
        <Button onClick={() => navigate("/")} variant="outline" className="rounded-xl">Go Back</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="floating-orb w-72 h-72 bg-neon-green -top-20 -left-20" />
      <div className="floating-orb w-64 h-64 bg-neon-cyan bottom-20 -right-10" style={{ animationDelay: "3s" }} />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/30" style={{
        background: "linear-gradient(180deg, hsl(228 18% 5% / 0.95), hsl(228 18% 5% / 0.8))",
        backdropFilter: "blur(20px)",
      }}>
        <div className="mx-auto max-w-lg px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-xl hover:bg-secondary transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="font-display text-sm font-bold truncate">{match.team1_short} vs {match.team2_short}</p>
            <p className="text-[10px] text-muted-foreground">{match.league}</p>
          </div>
          {match.status === "live" && (
            <Badge className="bg-neon-red/15 text-neon-red border-neon-red/25 text-[10px] font-bold animate-pulse-neon gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-neon-red" /> LIVE
            </Badge>
          )}
        </div>
      </header>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="mx-auto max-w-lg px-4 py-5 space-y-4 relative z-10"
      >
        {/* Match Card */}
        <motion.div variants={item} className="glass-card-premium p-5 relative overflow-hidden">
          <div className="shimmer absolute inset-0" />
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <div className={cn("flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br text-xs font-bold font-display text-white shadow-lg", match.team1_color)}>
                  {match.team1_short}
                </div>
                <div>
                  <p className="font-display font-bold text-lg">{match.team1_name}</p>
                </div>
              </div>
              <div className="flex flex-col items-center mx-3">
                <span className="text-xs font-bold text-muted-foreground/60 tracking-wider">VS</span>
              </div>
              <div className="flex items-center gap-3 flex-1 justify-end">
                <div className="text-right">
                  <p className="font-display font-bold text-lg">{match.team2_name}</p>
                </div>
                <div className={cn("flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br text-xs font-bold font-display text-white shadow-lg", match.team2_color)}>
                  {match.team2_short}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-4 mt-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" /> {format(new Date(match.match_time), "dd MMM, h:mm a")}
              </span>
              {match.venue && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {match.venue}
                </span>
              )}
            </div>
          </div>
        </motion.div>

        {/* Create Team CTA */}
        <motion.div variants={item}>
          <Button
            onClick={() => navigate(`/match/${matchId}/create-team`)}
            className="w-full gradient-primary font-bold rounded-xl h-12 text-base relative overflow-hidden"
          >
            <span className="shimmer absolute inset-0" />
            <Zap className="h-5 w-5 mr-2 relative z-10" />
            <span className="relative z-10">Create Your Team</span>
          </Button>
        </motion.div>

        {/* My Teams */}
        {userTeams.length > 0 && (
          <>
            <motion.div variants={item}>
              <h2 className="font-display text-lg font-bold mb-3">My Teams ({userTeams.length})</h2>
            </motion.div>
            {userTeams.map((team) => (
              <motion.div key={team.id} variants={item}>
                <SavedTeamCard
                  team={team}
                  onDelete={handleDeleteTeam}
                  onEdit={handleEditTeam}
                  deleting={deleteTeam.isPending}
                />
              </motion.div>
            ))}
          </>
        )}

        {/* Contests */}
        <motion.div variants={item}>
          <h2 className="font-display text-lg font-bold mb-3">Contests ({contests.length})</h2>
        </motion.div>
        {contestsLoading ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : contests.length === 0 ? (
          <motion.div variants={item} className="glass-card flex flex-col items-center py-12 text-muted-foreground">
            <Trophy className="h-10 w-10 opacity-20 mb-3" />
            <p className="text-sm font-medium">No contests yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Contests will be available soon</p>
          </motion.div>
        ) : (
          contests.map((contest) => (
            <ContestCard
              key={contest.id}
              contest={contest}
              isJoined={joinedContestIds.has(contest.id)}
              onJoin={() => handleJoinContest(contest)}
            />
          ))
        )}
      </motion.div>

      {/* Join Contest Sheet */}
      <JoinContestSheet
        open={joinSheetOpen}
        onOpenChange={setJoinSheetOpen}
        contest={selectedContest}
        teams={userTeams}
        joinedTeamIds={selectedContest ? joinedTeamIdsForContest(selectedContest.id) : []}
        onCreateTeam={() => navigate(`/match/${matchId}/create-team`)}
      />
    </div>
  );
};

export default MatchDetail;
