import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Search, Users, Plus, X, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";

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

const MatchLineupManager = ({ match, open, onOpenChange }: Props) => {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterTeam, setFilterTeam] = useState<"all" | "team1" | "team2">("all");

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

  // Filter available players by team names
  const availablePlayers = allPlayers.filter((p: any) => {
    if (assignedPlayerIds.has(p.id)) return false;
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.team.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (filterTeam === "team1") return p.team.toLowerCase() === match.team1_name?.toLowerCase() || p.team.toLowerCase() === match.team1_short?.toLowerCase();
    if (filterTeam === "team2") return p.team.toLowerCase() === match.team2_name?.toLowerCase() || p.team.toLowerCase() === match.team2_short?.toLowerCase();
    return true;
  });

  // Group lineup by role
  const lineupByRole = matchPlayers.reduce((acc: Record<string, any[]>, mp: any) => {
    const role = mp.player?.role || "unknown";
    if (!acc[role]) acc[role] = [];
    acc[role].push(mp);
    return acc;
  }, {});

  const roleOrder = ["wicket-keeper", "batsman", "all-rounder", "bowler"];

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
            <p className="text-sm text-muted-foreground py-4 text-center">No players in lineup yet. Add players below.</p>
          ) : (
            <div className="space-y-3">
              {roleOrder.map((role) => {
                const players = lineupByRole[role];
                if (!players?.length) return null;
                return (
                  <div key={role}>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 capitalize">{role}s ({players.length})</p>
                    <div className="space-y-1">
                      {players.map((mp: any) => (
                        <Card key={mp.id} className="p-2.5 flex items-center gap-2">
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
            <h3 className="text-sm font-semibold text-foreground">Add Players</h3>
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
