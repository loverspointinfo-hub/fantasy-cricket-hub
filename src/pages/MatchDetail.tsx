import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMatch } from "@/hooks/useMatches";
import { useContests, Contest } from "@/hooks/useContests";
import { useUserTeams, useDeleteTeam } from "@/hooks/useUserTeams";
import { useMyContestEntries } from "@/hooks/useContestEntries";
import {
  ArrowLeft, Clock, MapPin, Trophy, Plus, Sparkles, RefreshCw, Timer, BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { staggerContainer, item } from "@/lib/animations";
import { formatIST } from "@/lib/date-utils";
import { toast } from "sonner";
import SavedTeamCard from "@/components/team/SavedTeamCard";
import JoinContestSheet from "@/components/contest/JoinContestSheet";
import ContestCard from "@/components/contest/ContestCard";
import ContestCategoryTabs from "@/components/contest/ContestCategoryTabs";
import { MatchDetailSkeleton, ContestCardSkeleton } from "@/components/match/MatchDetailSkeleton";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useCountdown } from "@/hooks/useCountdown";

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

  const { pullDistance, isRefreshing, handlers } = usePullToRefresh({
    queryKeys: [
      ["match", matchId || ""],
      ["contests", matchId || ""],
      ["user-teams", matchId || ""],
      ["my-contest-entries", matchId || ""],
    ],
  });

  const countdown = useCountdown(match?.entry_deadline ?? "");

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
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 border-b border-border/20 px-4 py-3"
          style={{ background: "hsl(228 18% 5% / 0.97)", backdropFilter: "blur(24px)" }}
        >
          <div className="mx-auto max-w-lg flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 -ml-1 rounded-xl hover:bg-secondary/80">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex-1">
              <div className="h-4 w-28 rounded bg-secondary animate-pulse" />
              <div className="h-2.5 w-16 rounded bg-secondary/60 animate-pulse mt-1.5" />
            </div>
          </div>
        </header>
        <MatchDetailSkeleton />
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <p className="text-muted-foreground">Match not found</p>
        <Button onClick={() => navigate("/")} variant="outline" className="rounded-xl">Go Back</Button>
      </div>
    );
  }

  const matchDate = match.match_time;
  const isLive = match.status === "live";
  const isUrgent = !countdown.isExpired && countdown.days === 0 && countdown.hours === 0;
  const isTeamEditingLocked = match.status !== "upcoming" || countdown.isExpired;
  const canManageTeams = !isTeamEditingLocked;

  return (
    <div
      className="min-h-screen relative overflow-hidden bg-background"
      {...handlers}
    >
      {/* Pull to refresh indicator */}
      <div
        className="absolute left-0 right-0 z-[60] flex justify-center pointer-events-none transition-opacity duration-200"
        style={{
          top: 56,
          transform: `translateY(${pullDistance}px)`,
          opacity: pullDistance > 10 ? 1 : 0,
        }}
      >
        <div className={cn(
          "h-9 w-9 rounded-full flex items-center justify-center shadow-lg",
          "border border-border/30"
        )}
          style={{ background: "hsl(228 16% 10%)" }}
        >
          <RefreshCw className={cn(
            "h-4 w-4 text-primary transition-transform duration-300",
            isRefreshing && "animate-spin"
          )}
            style={{ transform: isRefreshing ? undefined : `rotate(${pullDistance * 3}deg)` }}
          />
        </div>
      </div>

      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none gradient-mesh opacity-60" />
      <div className="floating-orb w-80 h-80 bg-[hsl(var(--neon-green))] -top-32 -left-24" />
      <div className="floating-orb w-60 h-60 bg-[hsl(var(--neon-cyan))] top-1/3 -right-16" style={{ animationDelay: "3s" }} />
      <div className="floating-orb w-40 h-40 bg-[hsl(var(--neon-purple))] bottom-32 left-1/4" style={{ animationDelay: "5s" }} />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/20"
        style={{
          background: "linear-gradient(180deg, hsl(228 18% 5% / 0.97), hsl(228 18% 5% / 0.85))",
          backdropFilter: "blur(24px) saturate(1.5)",
        }}
      >
        <div className="mx-auto max-w-lg px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-1 rounded-xl hover:bg-secondary/80 active:scale-95 transition-all">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="font-display text-base font-bold truncate">
              {match.team1_short} <span className="text-muted-foreground/40 mx-1">vs</span> {match.team2_short}
            </p>
            <p className="text-[10px] text-muted-foreground tracking-wide">{match.league}</p>
          </div>
          {isLive ? (
            <Badge className="bg-[hsl(var(--neon-red)/0.15)] text-[hsl(var(--neon-red))] border-[hsl(var(--neon-red)/0.25)] text-[10px] font-bold gap-1 animate-pulse">
              <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--neon-red))]" /> LIVE
            </Badge>
          ) : match.status === "upcoming" && !countdown.isExpired ? (
            <div className={cn(
              "flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[10px] font-bold",
              isUrgent ? "text-[hsl(var(--neon-red))]" : "text-primary"
            )}
              style={{
                background: isUrgent ? "hsl(var(--neon-red) / 0.08)" : "hsl(var(--primary) / 0.08)",
                border: `1px solid ${isUrgent ? "hsl(var(--neon-red) / 0.15)" : "hsl(var(--primary) / 0.15)"}`,
              }}
            >
              <Timer className={cn("h-3 w-3", isUrgent && "animate-pulse")} />
              <span className="font-display tracking-wide">
                {countdown.days > 0
                  ? `${countdown.days}d ${countdown.hours}h`
                  : countdown.hours > 0
                  ? `${countdown.hours}h ${String(countdown.minutes).padStart(2, "0")}m`
                  : `${String(countdown.minutes).padStart(2, "0")}m ${String(countdown.seconds).padStart(2, "0")}s`}
              </span>
            </div>
          ) : null}
        </div>
      </header>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="mx-auto max-w-lg px-4 pt-5 pb-24 space-y-5 relative z-10"
      >
        {/* ─── Match Card ─── */}
        <motion.div variants={item} className="relative rounded-3xl overflow-hidden"
          style={{
            background: "linear-gradient(160deg, hsl(228 16% 12% / 0.95), hsl(228 20% 6% / 0.9))",
            border: "1px solid hsl(152 100% 50% / 0.12)",
            boxShadow: "0 0 60px hsl(152 100% 50% / 0.04), 0 16px 48px hsl(228 18% 3% / 0.6)",
          }}
        >
          {/* Decorative mesh inside card */}
          <div className="absolute inset-0 pointer-events-none opacity-30"
            style={{
              background: "radial-gradient(ellipse at 20% 0%, hsl(152 100% 50% / 0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 100%, hsl(195 100% 55% / 0.06) 0%, transparent 60%)",
            }}
          />
          <div className="shimmer absolute inset-0" />

          <div className="relative z-10 p-5">
            {/* Teams */}
            <div className="flex items-center justify-between">
              <div className="flex flex-col items-center flex-1 gap-2">
                <div className={cn(
                  "h-16 w-16 rounded-2xl flex items-center justify-center text-sm font-bold font-display text-white shadow-xl bg-gradient-to-br",
                  match.team1_color
                )}>
                  {match.team1_short}
                </div>
                <p className="font-display font-bold text-sm text-center leading-tight max-w-[80px]">
                  {match.team1_name}
                </p>
              </div>

              <div className="flex flex-col items-center gap-1.5 mx-2">
                <div className="h-12 w-12 rounded-full flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, hsl(228 16% 14%), hsl(228 16% 10%))",
                    border: "1px solid hsl(228 12% 20%)",
                  }}
                >
                  <span className="text-[10px] font-bold text-muted-foreground tracking-wider">VS</span>
                </div>
                {isLive ? (
                  <Badge className="bg-[hsl(var(--neon-red)/0.15)] text-[hsl(var(--neon-red))] border-[hsl(var(--neon-red)/0.25)] text-[8px] font-bold gap-0.5">
                    <span className="h-1 w-1 rounded-full bg-[hsl(var(--neon-red))]" /> LIVE
                  </Badge>
                ) : (
                  <p className="text-[10px] text-muted-foreground font-medium">
                    {formatIST(matchDate, "h:mm a")}
                  </p>
                )}
              </div>

              <div className="flex flex-col items-center flex-1 gap-2">
                <div className={cn(
                  "h-16 w-16 rounded-2xl flex items-center justify-center text-sm font-bold font-display text-white shadow-xl bg-gradient-to-br",
                  match.team2_color
                )}>
                  {match.team2_short}
                </div>
                <p className="font-display font-bold text-sm text-center leading-tight max-w-[80px]">
                  {match.team2_name}
                </p>
              </div>
            </div>

            {/* Meta info */}
            <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t border-border/10">
              <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <Clock className="h-3 w-3 text-primary/60" />
                {formatIST(matchDate, "dd MMM, h:mm a")}
              </span>
              {match.venue && (
                <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <MapPin className="h-3 w-3 text-[hsl(var(--neon-cyan)/0.6)]" />
                  {match.venue}
                </span>
              )}
            </div>
          </div>
        </motion.div>

        {/* ─── Create Team CTA ─── */}
        {match.status === "upcoming" && !countdown.isExpired && (
          <motion.div variants={item}>
            <Button
              onClick={() => navigate(`/match/${matchId}/create-team`)}
              className="w-full font-bold rounded-2xl h-14 text-base relative overflow-hidden group border-0"
              style={{
                background: "linear-gradient(135deg, hsl(152 100% 50%), hsl(195 100% 55%))",
                boxShadow: "0 4px 24px hsl(152 100% 50% / 0.25), 0 0 0 1px hsl(152 100% 50% / 0.3) inset",
              }}
            >
              <span className="shimmer absolute inset-0" />
              <span className="relative z-10 flex items-center gap-2 text-primary-foreground">
                <Plus className="h-5 w-5" />
                Create Your Team
              </span>
            </Button>
          </motion.div>
        )}

        {/* ─── Not Joined Any Contest (Live/Completed) ─── */}
        {(isLive || match.status === "completed") && myEntries.length === 0 && (
          <motion.div variants={item} className="relative rounded-2xl overflow-hidden p-5 text-center"
            style={{
              background: "linear-gradient(145deg, hsl(228 16% 10% / 0.9), hsl(228 20% 6% / 0.8))",
              border: "1px solid hsl(var(--neon-red) / 0.15)",
            }}
          >
            <div className="h-14 w-14 rounded-2xl bg-[hsl(var(--neon-red)/0.08)] flex items-center justify-center mx-auto mb-3">
              <Trophy className="h-6 w-6 text-[hsl(var(--neon-red)/0.5)]" />
            </div>
            <p className="font-display font-bold text-sm text-foreground">You didn't join any contest</p>
            <p className="text-xs text-muted-foreground mt-1">
              {isLive ? "This match is now live. Entry is closed." : "This match has ended."}
            </p>
          </motion.div>
        )}

        {/* ─── My Teams ─── */}
        {userTeams.length > 0 && (
          <motion.div variants={item}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-lg font-bold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[hsl(var(--gold))]" />
                My Teams
                <span className="text-sm font-normal text-muted-foreground">({userTeams.length})</span>
              </h2>
            </div>
            <div className="space-y-2.5">
              {userTeams.map((team) => (
                <motion.div key={team.id} variants={item}>
                  <SavedTeamCard
                    team={team}
                    onDelete={canManageTeams ? handleDeleteTeam : undefined}
                    onEdit={canManageTeams ? handleEditTeam : undefined}
                    deleting={deleteTeam.isPending}
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ─── Contests ─── */}
        <motion.div variants={item}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg font-bold flex items-center gap-2">
              <Trophy className="h-4 w-4 text-primary" />
              Contests
              <span className="text-sm font-normal text-muted-foreground">({contests.length})</span>
            </h2>
          </div>
        </motion.div>

        {contestsLoading ? (
          <div className="space-y-3">
            <ContestCardSkeleton />
            <ContestCardSkeleton />
          </div>
        ) : contests.length === 0 ? (
          <motion.div variants={item} className="glass-card flex flex-col items-center py-14 text-muted-foreground">
            <div className="h-16 w-16 rounded-2xl bg-secondary/60 flex items-center justify-center mb-4">
              <Trophy className="h-7 w-7 opacity-30" />
            </div>
            <p className="text-sm font-semibold">No contests available</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Contests will appear here soon</p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {contests.map((contest) => (
              <ContestCard
                key={contest.id}
                contest={contest}
                isJoined={joinedContestIds.has(contest.id)}
                onJoin={() => handleJoinContest(contest)}
                disabled={match.status !== "upcoming" || countdown.isExpired}
              />
            ))}
          </div>
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