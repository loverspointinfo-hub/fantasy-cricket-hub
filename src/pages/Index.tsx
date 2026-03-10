import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, ChevronRight, Zap, Clock, Users } from "lucide-react";
import { cn } from "@/lib/utils";

type MatchStatus = "upcoming" | "live" | "completed";

interface Match {
  id: string;
  team1: string;
  team2: string;
  team1Short: string;
  team2Short: string;
  league: string;
  time: string;
  status: MatchStatus;
  contestCount: number;
}

const DEMO_MATCHES: Match[] = [
  { id: "1", team1: "India", team2: "Australia", team1Short: "IND", team2Short: "AUS", league: "ICC T20 World Cup", time: "Today, 7:30 PM", status: "upcoming", contestCount: 24 },
  { id: "2", team1: "England", team2: "Pakistan", team1Short: "ENG", team2Short: "PAK", league: "ICC ODI Series", time: "Live", status: "live", contestCount: 18 },
  { id: "3", team1: "South Africa", team2: "New Zealand", team1Short: "SA", team2Short: "NZ", league: "Test Championship", time: "Tomorrow, 2:00 PM", status: "upcoming", contestCount: 12 },
  { id: "4", team1: "Sri Lanka", team2: "Bangladesh", team1Short: "SL", team2Short: "BAN", league: "Asia Cup", time: "Completed", status: "completed", contestCount: 15 },
];

const BANNERS = [
  { title: "MEGA CONTEST", subtitle: "₹25 Lakhs Prize Pool", color: "gradient-primary" },
  { title: "FIRST DEPOSIT", subtitle: "Get 100% Bonus up to ₹1000", color: "gradient-live" },
];

const Index = () => {
  const [activeTab, setActiveTab] = useState<MatchStatus>("upcoming");
  const tabs: { key: MatchStatus; label: string }[] = [
    { key: "upcoming", label: "Upcoming" },
    { key: "live", label: "Live" },
    { key: "completed", label: "Completed" },
  ];

  const filteredMatches = DEMO_MATCHES.filter((m) => m.status === activeTab);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 glass-card rounded-none border-x-0 border-t-0 px-4 py-3">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <h1 className="font-display text-lg font-bold tracking-wider">
            FANTASY<span className="text-accent">11</span>
          </h1>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-primary/30 text-primary text-xs">
              🏏 Cricket
            </Badge>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 py-4 space-y-5">
        {/* Banner Carousel */}
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
          {BANNERS.map((b, i) => (
            <div
              key={i}
              className={cn("min-w-[260px] rounded-xl p-4 flex-shrink-0", b.color)}
            >
              <p className="font-display text-xs font-bold uppercase tracking-wider text-primary-foreground/80">
                {b.title}
              </p>
              <p className="mt-1 font-display text-lg font-bold text-primary-foreground">
                {b.subtitle}
              </p>
              <Button size="sm" variant="secondary" className="mt-3 text-xs font-semibold">
                Join Now <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>

        {/* Match Tabs */}
        <div className="flex gap-1 rounded-xl bg-secondary/50 p-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                activeTab === tab.key
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.key === "live" && (
                <span className="mr-1 inline-block h-2 w-2 animate-pulse-neon rounded-full bg-neon-red" />
              )}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Matches */}
        <div className="space-y-3">
          {filteredMatches.length === 0 && (
            <div className="glass-card flex flex-col items-center py-12 text-muted-foreground">
              <Trophy className="mb-3 h-10 w-10 opacity-30" />
              <p className="text-sm">No {activeTab} matches right now</p>
            </div>
          )}
          {filteredMatches.map((match) => (
            <div key={match.id} className="glass-card-hover p-4 animate-slide-up cursor-pointer">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted-foreground font-medium">{match.league}</span>
                {match.status === "live" && (
                  <Badge className="bg-neon-red/20 text-neon-red border-neon-red/30 text-[10px] font-bold uppercase animate-pulse-neon">
                    <Zap className="mr-1 h-3 w-3" /> Live
                  </Badge>
                )}
                {match.status === "upcoming" && (
                  <Badge variant="outline" className="border-primary/30 text-primary text-[10px]">
                    <Clock className="mr-1 h-3 w-3" /> {match.time}
                  </Badge>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-xs font-bold font-display">
                    {match.team1Short}
                  </div>
                  <span className="text-sm font-semibold">{match.team1}</span>
                </div>
                <span className="text-xs font-bold text-muted-foreground">VS</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold">{match.team2}</span>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-xs font-bold font-display">
                    {match.team2Short}
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-border/30 pt-3">
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="h-3 w-3" /> {match.contestCount} Contests
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Index;
