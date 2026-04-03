import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Search, Users, Plus, X, UserCheck, UserX, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { importSquadForMatch, findApiMatchId } from "@/lib/squad-import";

interface Props {
  match: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const roleColors: Record<string, string> = {
  batsman: "default",
  bowler: "secondary",
  "all-rounder": "outline",
  "wicket-keeper": "destructive",
};

// Map CricketData.org roles to our DB short codes
const mapApiRole = (role: string): string => {
  const r = (role || "").toLowerCase();
  if (r.includes("wk") || r.includes("keeper")) return "WK";
  if (r.includes("all") || r.includes("ar")) return "AR";
  if (r.includes("bowl")) return "BOWL";
  return "BAT";
};

// Map DB short codes to display roles used in UI
const shortToDisplay: Record<string, string> = {
  BAT: "batsman",
  BOWL: "bowler",
  AR: "all-rounder",
  WK: "wicket-keeper",
};

const MatchLineupManager = ({ match, open, onOpenChange }: Props) => {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterTeam, setFilterTeam] = useState<"all" | "team1" | "team2">("all");
  const [importingLineup, setImportingLineup] = useState(false);

  // Fetch all players
  const { data: allPlayers = [] } = useQuery({
    queryKey: ["admin-players"],
    queryFn: async () => {
      const { data, error } = await supabase.from("players").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  // Fetch match_players for this match
  const { data: matchPlayers = [], isLoading } = useQuery({
    queryKey: ["admin-match-players", match?.id],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("match_players" as any) as any)
        .select("*, player:players(*)")
        .eq("match_id", match.id);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!match?.id,
  });

  const assignedPlayerIds = new Set(matchPlayers.map((mp: any) => mp.player_id));

  // Add player to match
  const addPlayer = useMutation({
    mutationFn: async (playerId: string) => {
      const { error } = await (supabase.from("match_players" as any) as any)
        .insert({ match_id: match.id, player_id: playerId, is_playing: true });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-match-players", match.id] });
      toast.success("Player added to lineup");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Remove player from match
  const removePlayer = useMutation({
    mutationFn: async (matchPlayerId: string) => {
      const { error } = await (supabase.from("match_players" as any) as any)
        .delete()
        .eq("id", matchPlayerId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-match-players", match.id] });
      toast.success("Player removed from lineup");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Toggle is_playing
  const togglePlaying = useMutation({
    mutationFn: async ({ id, is_playing }: { id: string; is_playing: boolean }) => {
      const { error } = await (supabase.from("match_players" as any) as any)
        .update({ is_playing })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-match-players", match.id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Add all filtered unassigned players at once
  const addAll = useMutation({
    mutationFn: async (playerIds: string[]) => {
      const rows = playerIds.map((pid) => ({ match_id: match.id, player_id: pid, is_playing: true }));
      const { error } = await (supabase.from("match_players" as any) as any).insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-match-players", match.id] });
      toast.success("All players added to lineup");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // ── Import Lineup from CricketData.org API (using shared utility) ──
  const importLineupFromAPI = async () => {
    if (!match) return;
    setImportingLineup(true);
    try {
      const { data: settingsData } = await (supabase.from("site_settings" as any) as any)
        .select("value").eq("key", "cricket_api_key").maybeSingle();
      const apiKey = settingsData?.value || "";
      if (!apiKey) throw new Error("API key not configured. Go to Settings → API Keys.");

      toast.info("Searching for match squads from API...");
      const apiMatchId = await findApiMatchId(apiKey, match.team1_short, match.team2_short);
      if (!apiMatchId) {
        throw new Error(`No match found for ${match.team1_short} vs ${match.team2_short} in API.`);
      }

      toast.info("Fetching squad details...");
      const result = await importSquadForMatch(apiKey, apiMatchId, match.id, match.team1_short, match.team2_short);

      qc.invalidateQueries({ queryKey: ["admin-match-players", match.id] });
      qc.invalidateQueries({ queryKey: ["admin-players"] });

      if (result.playersAdded === 0 && result.playersCreated === 0) {
        toast.info("No new players found to import. Squad may not be announced yet.");
      } else {
        toast.success(`✅ ${result.playersAdded} players added to lineup, ${result.playersCreated} new players created, ${result.playersSkipped} skipped`);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to import lineup");
    } finally {
      setImportingLineup(false);
    }
  };

  // Filter available players by team names
  const availablePlayers = match ? allPlayers.filter((p: any) => {
    if (assignedPlayerIds.has(p.id)) return false;
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.team.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (filterTeam === "team1") return p.team.toLowerCase() === match.team1_name?.toLowerCase() || p.team.toLowerCase() === match.team1_short?.toLowerCase();
    if (filterTeam === "team2") return p.team.toLowerCase() === match.team2_name?.toLowerCase() || p.team.toLowerCase() === match.team2_short?.toLowerCase();
    return true;
  }) : [];

  // Group lineup by role
  const lineupByRole = matchPlayers.reduce((acc: Record<string, any[]>, mp: any) => {
    const role = mp.player?.role || "unknown";
    if (!acc[role]) acc[role] = [];
    acc[role].push(mp);
    return acc;
  }, {});

  const roleOrder = ["WK", "BAT", "AR", "BOWL", "wicket-keeper", "batsman", "all-rounder", "bowler"];

  if (!match) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Lineup — {match.team1_short} vs {match.team2_short}
          </SheetTitle>
        </SheetHeader>

        {/* Import from API Button */}
        <div className="mt-3 mb-2">
          <Button
            onClick={importLineupFromAPI}
            disabled={importingLineup}
            variant="outline"
            className="w-full gap-2 rounded-xl border-primary/30 text-primary hover:bg-primary/10"
          >
            {importingLineup ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Importing Squad from API...</>
            ) : (
              <><Download className="h-4 w-4" /> Import Players & Lineup from API</>
            )}
          </Button>
          <p className="text-[10px] text-muted-foreground mt-1 text-center">
            Auto-fetches squad from CricketData.org, creates missing players & adds to lineup
          </p>
        </div>

        {/* Current Lineup */}
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">
              Current Lineup ({matchPlayers.length} players)
            </h3>
            <div className="flex gap-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><UserCheck className="h-3 w-3 text-green-500" /> Playing</span>
              <span className="flex items-center gap-1 ml-2"><UserX className="h-3 w-3 text-red-500" /> Benched</span>
            </div>
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : matchPlayers.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No players in lineup yet. Import from API or add manually below.</p>
          ) : (
            <div className="space-y-3">
              {roleOrder.map((role) => {
                const players = lineupByRole[role];
                if (!players?.length) return null;
                return (
                  <div key={role}>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{role} ({players.length})</p>
                    <div className="space-y-1">
                      {players.map((mp: any) => (
                        <Card key={mp.id} className="p-2.5 flex items-center gap-2">
                          {mp.player?.photo_url && (
                            <img src={mp.player.photo_url} alt="" className="h-8 w-8 rounded-full object-cover shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{mp.player?.name}</p>
                            <p className="text-xs text-muted-foreground">{mp.player?.team} • ₹{mp.player?.credit_value} Cr</p>
                          </div>
                          <Badge variant={roleColors[mp.player?.role] as any || "default"} className="text-[10px] capitalize shrink-0">
                            {mp.player?.role}
                          </Badge>
                          <Switch
                            checked={mp.is_playing}
                            onCheckedChange={(checked) => togglePlaying.mutate({ id: mp.id, is_playing: checked })}
                            className="shrink-0"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive shrink-0"
                            onClick={() => removePlayer.mutate(mp.id)}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="border-t my-4" />

        {/* Add Players Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Add Players Manually</h3>
            {availablePlayers.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-7"
                onClick={() => addAll.mutate(availablePlayers.map((p: any) => p.id))}
                disabled={addAll.isPending}
              >
                Add All ({availablePlayers.length})
              </Button>
            )}
          </div>

          {/* Filter by team */}
          <div className="flex gap-1.5">
            {(["all", "team1", "team2"] as const).map((f) => (
              <Button
                key={f}
                size="sm"
                variant={filterTeam === f ? "default" : "outline"}
                className="text-xs h-7"
                onClick={() => setFilterTeam(f)}
              >
                {f === "all" ? "All Teams" : f === "team1" ? match.team1_short : match.team2_short}
              </Button>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search players..." className="pl-9 h-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          {/* Available Players List */}
          <div className="space-y-1 max-h-[40vh] overflow-auto">
            {availablePlayers.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No available players found</p>
            ) : (
              availablePlayers.map((p: any) => (
                <Card key={p.id} className="p-2.5 flex items-center gap-2">
                  {p.photo_url && (
                    <img src={p.photo_url} alt="" className="h-8 w-8 rounded-full object-cover shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.team} • ₹{p.credit_value} Cr</p>
                  </div>
                  <Badge variant={roleColors[p.role] as any || "default"} className="text-[10px] capitalize shrink-0">
                    {p.role}
                  </Badge>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-7 w-7 shrink-0"
                    onClick={() => addPlayer.mutate(p.id)}
                    disabled={addPlayer.isPending}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </Card>
              ))
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MatchLineupManager;
