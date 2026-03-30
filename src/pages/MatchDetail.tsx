import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMatch } from "@/hooks/useMatches";
import { useContests, Contest } from "@/hooks/useContests";
import { useUserTeams, useDeleteTeam, UserTeam } from "@/hooks/useUserTeams";
import { useMyContestEntries } from "@/hooks/useContestEntries";
import { useMatchPlayers } from "@/hooks/useMatchPlayers";
import {
  ArrowLeft, Clock, MapPin, Trophy, Plus, Sparkles, RefreshCw, Timer, BarChart3, HelpCircle, Lock, ArrowLeftRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { staggerContainer, item } from "@/lib/animations";
import { formatIST, formatMatchTime } from "@/lib/date-utils";
import { toast } from "sonner";
import SavedTeamCard from "@/components/team/SavedTeamCard";
import CloneTeamSheet from "@/components/team/CloneTeamSheet";
import JoinContestSheet from "@/components/contest/JoinContestSheet";
import JoinPrivateContestSheet from "@/components/contest/JoinPrivateContestSheet";
import ContestCard from "@/components/contest/ContestCard";
import ContestCategoryTabs from "@/components/contest/ContestCategoryTabs";
import { MatchDetailSkeleton, ContestCardSkeleton } from "@/components/match/MatchDetailSkeleton";
import LiveScoreTracker from "@/components/match/LiveScoreTracker";
import PlayerComparisonSheet from "@/components/match/PlayerComparisonSheet";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useCountdown } from "@/hooks/useCountdown";

type DetailTab = "contest" | "my_contest" | "team";

const MatchDetail = () => {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const { data: match, isLoading: matchLoading } = useMatch(matchId || "");
  const { data: contests = [], isLoading: contestsLoading } = useContests(matchId || "");
  const { data: userTeams = [] } = useUserTeams(matchId || "");
  const { data: myEntries = [] } = useMyContestEntries(matchId || "");
  const { data: matchPlayers = [] } = useMatchPlayers(matchId || "");
  const deleteTeam = useDeleteTeam();

  const [joinSheetOpen, setJoinSheetOpen] = useState(false);
  const [selectedContest, setSelectedContest] = useState<Contest | null>(null);
  const [contestCategory, setContestCategory] = useState("all");
  const [activeTab, setActiveTab] = useState<DetailTab>("contest");
  const [cloneSheetOpen, setCloneSheetOpen] = useState(false);
  const [cloneTeam, setCloneTeam] = useState<UserTeam | null>(null);
  const [privateContestOpen, setPrivateContestOpen] = useState(false);
  const [comparisonOpen, setComparisonOpen] = useState(false);

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

  const joinedContests = contests.filter(c => joinedContestIds.has(c.id));

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
          style={{ background: "hsl(228 18% 5% / 0.97)", backdropFilter: "blur(24px)" }}>
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

  const detailTabs: { key: DetailTab; label: string; count?: number }[] = [
    { key: "contest", label: "Contest" },
    { key: "my_contest", label: "My Contest", count: joinedContests.length },
    { key: "team", label: "Team", count: userTeams.length },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden bg-background" {...handlers}>
      {/* Pull to refresh */}
      <div className="absolute left-0 right-0 z-[60] flex justify-center pointer-events-none transition-opacity duration-200"
        style={{ top: 56, transform: `translateY(${pullDistance}px)`, opacity: pullDistance > 10 ? 1 : 0 }}>
        <div className={cn("h-9 w-9 rounded-full flex items-center justify-center shadow-lg", "border border-border/30")}
          style={{ background: "hsl(228 16% 10%)" }}>
          <RefreshCw className={cn("h-4 w-4 text-primary transition-transform duration-300", isRefreshing && "animate-spin")}
            style={{ transform: isRefreshing ? undefined : `rotate(${pullDistance * 3}deg)` }} />
        </div>
      </div>

      {/* Background */}
      <div className="fixed inset-0 pointer-events-none gradient-mesh opacity-40" />

      {/* Header */}
      <header className="sticky top-0 z-50" style={{
        background: "linear-gradient(180deg, hsl(228 18% 5% / 0.97), hsl(228 18% 5% / 0.9))",
        backdropFilter: "blur(24px) saturate(1.5)",
      }}>
        {/* Top bar with back button and league */}
        <div className="mx-auto max-w-lg px-4 pt-3 pb-1 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-1 rounded-xl hover:bg-secondary/80 active:scale-95 transition-all">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0 text-center">
            <p className="text-xs font-semibold text-muted-foreground tracking-wide truncate">{match.league}</p>
          </div>
          <button className="h-8 w-8 rounded-xl flex items-center justify-center" style={{
            background: "hsl(228 16% 11%)", border: "1px solid hsl(228 12% 18% / 0.5)",
          }}>
            <HelpCircle className="h-4 w-4 text-muted-foreground/60" />
          </button>
        </div>

        {/* Team VS Team with countdown */}
        <div className="mx-auto max-w-lg px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Team 1 */}
            <div className="flex flex-col items-center gap-1.5 flex-1">
              {match.team1_logo ? (
                <img src={match.team1_logo} alt={match.team1_short} className="h-14 w-14 rounded-full object-cover border-2 border-border/30" />
              ) : (
                <div className="h-14 w-14 rounded-full flex items-center justify-center text-lg font-bold font-display border-2 border-border/30"
                  style={{ background: `linear-gradient(135deg, ${match.team1_color || 'hsl(220, 70%, 50%)'})` }}>
                  {match.team1_short?.charAt(0)}
                </div>
              )}
              <span className="text-sm font-bold font-display tracking-wide">{match.team1_short}</span>
              <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">{match.team1_name}</span>
            </div>

            {/* Center - VS & Countdown */}
            <div className="flex flex-col items-center gap-1 px-2">
              {isLive ? (
                <Badge className="bg-[hsl(var(--neon-red)/0.15)] text-[hsl(var(--neon-red))] border-[hsl(var(--neon-red)/0.25)] text-xs font-bold gap-1.5 animate-pulse px-3 py-1">
                  <span className="h-2 w-2 rounded-full bg-[hsl(var(--neon-red))]" /> LIVE
                </Badge>
              ) : !countdown.isExpired ? (
                <>
                  <div className="flex items-center gap-1 mb-1">
                    {[
                      { val: countdown.hours + countdown.days * 24, unit: "h" },
                      { val: countdown.minutes, unit: "m" },
                      { val: countdown.seconds, unit: "s" },
                    ].map((t, i) => (
                      <div key={i} className="flex items-center">
                        {i > 0 && <span className="text-muted-foreground/40 text-xs mx-0.5">:</span>}
                        <div className="flex flex-col items-center">
                          <span className={cn(
                            "font-display font-bold text-lg tabular-nums leading-none",
                            isUrgent ? "text-[hsl(var(--neon-red))]" : "text-primary"
                          )}>
                            {String(t.val).padStart(2, "0")}
                          </span>
                          <span className="text-[8px] text-muted-foreground/50 uppercase">{t.unit}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <span className="text-[10px] text-muted-foreground">{formatMatchTime(match.match_time)}</span>
                </>
              ) : (
                <span className="text-xs text-muted-foreground font-semibold">Closed</span>
              )}
            </div>

            {/* Team 2 */}
            <div className="flex flex-col items-center gap-1.5 flex-1">
              {match.team2_logo ? (
                <img src={match.team2_logo} alt={match.team2_short} className="h-14 w-14 rounded-full object-cover border-2 border-border/30" />
              ) : (
                <div className="h-14 w-14 rounded-full flex items-center justify-center text-lg font-bold font-display border-2 border-border/30"
                  style={{ background: `linear-gradient(135deg, ${match.team2_color || 'hsl(0, 70%, 50%)'})` }}>
                  {match.team2_short?.charAt(0)}
                </div>
              )}
              <span className="text-sm font-bold font-display tracking-wide">{match.team2_short}</span>
              <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">{match.team2_name}</span>
            </div>
          </div>

          {/* Venue info */}
          {match.venue && (
            <div className="flex items-center justify-center gap-1.5 mt-2 pt-2 border-t border-border/10">
              <MapPin className="h-3 w-3 text-muted-foreground/50" />
              <span className="text-[10px] text-muted-foreground/60 truncate max-w-[250px]">{match.venue}</span>
            </div>
          )}
        </div>

        {/* Detail tabs - Contest / My Contest / Team */}
        <div className="mx-auto max-w-lg px-4 pb-0">
          <div className="flex border-b border-border/10">
            {detailTabs.map(tab => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "relative flex-1 py-3 text-sm font-semibold text-center transition-all",
                    isActive ? "text-primary" : "text-muted-foreground/50 hover:text-muted-foreground"
                  )}
                >
                  <span className="flex items-center justify-center gap-1.5">
                    {tab.label}
                    {tab.count != null && tab.count > 0 && (
                      <span className={cn(
                        "text-[9px] rounded-full h-4 min-w-[16px] flex items-center justify-center px-1",
                        isActive ? "bg-primary/20 text-primary" : "bg-secondary/60 text-muted-foreground/40"
                      )}>
                        {tab.count}
                      </span>
                    )}
                  </span>
                  {isActive && (
                    <motion.div
                      layoutId="detail-tab"
                      className="absolute bottom-0 left-0 right-0 h-[2px]"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      style={{ background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)))" }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="mx-auto max-w-lg px-4 pt-4 pb-28 space-y-4 relative z-10"
      >
        {/* ── CONTEST TAB ── */}
        {activeTab === "contest" && (
          <>
            {/* Sort/filter chips */}
            {(() => {
              const counts: Record<string, number> = {};
              contests.forEach(c => { counts[c.type] = (counts[c.type] || 0) + 1; });
              return (
                <motion.div variants={item}>
                  <ContestCategoryTabs active={contestCategory} onChange={setContestCategory} counts={counts} />
                </motion.div>
              );
            })()}

            {/* Not joined banner for live/completed */}
            {(isLive || match.status === "completed") && myEntries.length === 0 && (
              <motion.div variants={item} className="glass-card p-4 text-center">
                <p className="font-display font-bold text-sm text-foreground">You didn't join any contest</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {isLive ? "This match is now live. Entry is closed." : "This match has ended."}
                </p>
              </motion.div>
            )}

            {contestsLoading ? (
              <div className="space-y-3"><ContestCardSkeleton /><ContestCardSkeleton /></div>
            ) : contests.length === 0 ? (
              <motion.div variants={item} className="glass-card flex flex-col items-center py-14 text-muted-foreground">
                <div className="h-14 w-14 rounded-2xl bg-secondary/60 flex items-center justify-center mb-3">
                  <Trophy className="h-6 w-6 opacity-30" />
                </div>
                <p className="text-sm font-semibold">No contests available</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Contests will appear here soon</p>
              </motion.div>
            ) : (() => {
              const filtered = contests.filter(c => contestCategory === "all" || c.type === contestCategory);
              const typeLabels: Record<string, string> = {
                mega: "GRAND LEAGUE", h2h: "HEAD TO HEAD", winner_takes_all: "WINNER TAKES ALL",
                practice: "PRACTICE", private: "PRIVATE CONTESTS",
              };
              if (contestCategory === "all") {
                const grouped: Record<string, typeof filtered> = {};
                filtered.forEach(c => { if (!grouped[c.type]) grouped[c.type] = []; grouped[c.type].push(c); });
                return (
                  <div className="space-y-5">
                    {Object.entries(grouped).map(([type, typeContests]) => (
                      <div key={type} className="space-y-2.5">
                        <h3 className="text-[11px] font-bold text-muted-foreground/50 uppercase tracking-[0.15em] px-1">
                          {typeLabels[type] || type.toUpperCase()}
                        </h3>
                        {typeContests.map(contest => (
                          <ContestCard key={contest.id} contest={contest} isJoined={joinedContestIds.has(contest.id)}
                            onJoin={() => handleJoinContest(contest)}
                            onViewLeaderboard={() => navigate(`/contest/${contest.id}/leaderboard`)}
                            disabled={match.status !== "upcoming" || countdown.isExpired} />
                        ))}
                      </div>
                    ))}
                  </div>
                );
              }
              return (
                <div className="space-y-3">
                  {filtered.map(contest => (
                    <ContestCard key={contest.id} contest={contest} isJoined={joinedContestIds.has(contest.id)}
                      onJoin={() => handleJoinContest(contest)}
                      onViewLeaderboard={() => navigate(`/contest/${contest.id}/leaderboard`)}
                      disabled={match.status !== "upcoming" || countdown.isExpired} />
                  ))}
                </div>
              );
            })()}
          </>
        )}

        {/* ── MY CONTEST TAB ── */}
        {activeTab === "my_contest" && (
          <>
            {joinedContests.length === 0 ? (
              <motion.div variants={item} className="glass-card flex flex-col items-center py-14 text-muted-foreground">
                <div className="h-14 w-14 rounded-2xl bg-secondary/60 flex items-center justify-center mb-3">
                  <Trophy className="h-6 w-6 opacity-30" />
                </div>
                <p className="text-sm font-semibold text-foreground/70">No contests joined</p>
                <p className="text-xs text-muted-foreground/50 mt-1">Join a contest to see it here</p>
              </motion.div>
            ) : (
              <div className="space-y-3">
                {joinedContests.map(contest => (
                  <ContestCard key={contest.id} contest={contest} isJoined={true}
                    onJoin={() => handleJoinContest(contest)}
                    onViewLeaderboard={() => navigate(`/contest/${contest.id}/leaderboard`)}
                    disabled={match.status !== "upcoming" || countdown.isExpired} />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── TEAM TAB ── */}
        {activeTab === "team" && (
          <>
            {userTeams.length === 0 ? (
              <motion.div variants={item} className="glass-card flex flex-col items-center py-14 text-muted-foreground">
                <div className="h-14 w-14 rounded-2xl bg-secondary/60 flex items-center justify-center mb-3">
                  <Sparkles className="h-6 w-6 opacity-30" />
                </div>
                <p className="text-sm font-semibold text-foreground/70">No teams created</p>
                <p className="text-xs text-muted-foreground/50 mt-1">Create a team to join contests</p>
                {canManageTeams && (
                  <Button onClick={() => navigate(`/match/${matchId}/create-team`)}
                    className="gradient-primary font-bold rounded-xl px-6 h-10 mt-4 text-sm">
                    <Plus className="h-4 w-4 mr-1.5" /> Create Team
                  </Button>
                )}
              </motion.div>
            ) : (
              <div className="space-y-2.5">
                {userTeams.map((team) => (
                  <motion.div key={team.id} variants={item}>
                    <SavedTeamCard
                      team={team}
                      onDelete={canManageTeams ? handleDeleteTeam : undefined}
                      onEdit={canManageTeams ? handleEditTeam : undefined}
                      deleting={deleteTeam.isPending}
                      team1Short={match.team1_short}
                      team2Short={match.team2_short}
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}
      </motion.div>

      {/* Floating Create Team button */}
      {match.status === "upcoming" && !countdown.isExpired && (
        <div className="fixed bottom-24 left-0 right-0 z-40 flex justify-center pointer-events-none">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="pointer-events-auto"
          >
            <Button
              onClick={() => navigate(`/match/${matchId}/create-team`)}
              className="font-bold rounded-2xl h-12 px-6 text-sm relative overflow-hidden shadow-xl"
              style={{
                background: "linear-gradient(135deg, hsl(152 100% 50%), hsl(195 100% 55%))",
                boxShadow: "0 4px 24px hsl(152 100% 50% / 0.3), 0 0 0 1px hsl(152 100% 50% / 0.3) inset",
              }}
            >
              <span className="shimmer absolute inset-0" />
              <span className="relative z-10 flex items-center gap-2 text-primary-foreground">
                <Plus className="h-5 w-5" />
                Create Team
              </span>
            </Button>
          </motion.div>
        </div>
      )}

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
