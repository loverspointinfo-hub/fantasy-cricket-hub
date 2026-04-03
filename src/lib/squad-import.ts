import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Map CricketData.org roles to DB short codes
const mapApiRole = (role: string): string => {
  const r = (role || "").toLowerCase();
  if (r.includes("wk") || r.includes("keeper")) return "WK";
  if (r.includes("all") || r.includes("ar")) return "AR";
  if (r.includes("bowl")) return "BOWL";
  return "BAT";
};

/**
 * Assign credit value based on role & batting order heuristics.
 * Uses a tiered system similar to Dream11:
 * - WK: 8.0-9.5 (keepers who bat are premium)
 * - BAT: 7.5-10.0 (top order = expensive)  
 * - AR: 8.0-9.5 (versatile = valuable)
 * - BOWL: 7.0-9.0 (strike bowlers premium)
 * playerIndex = position in squad list (lower = more prominent/senior)
 */
const assignCreditValue = (role: string, playerIndex: number, totalInTeam: number): number => {
  // Tier: top 3 in squad listing = star, next 4 = mid, rest = budget
  const ratio = totalInTeam > 0 ? playerIndex / totalInTeam : 0.5;

  const baseCredits: Record<string, [number, number]> = {
    WK: [8.0, 9.5],
    BAT: [7.0, 10.0],
    AR: [8.0, 9.5],
    BOWL: [7.0, 9.0],
  };

  const [min, max] = baseCredits[role] || [7.0, 9.0];
  // Higher position in squad → higher credit (inverse ratio)
  const credit = max - (max - min) * ratio;
  // Round to nearest 0.5
  return Math.round(credit * 2) / 2;
};

interface SquadImportResult {
  playersCreated: number;
  playersAdded: number;
  playersSkipped: number;
}

/**
 * Fetch squad for a match from CricketData.org and import players + lineup.
 * Works client-side since edge functions can't reach cricapi.com.
 */
export const importSquadForMatch = async (
  apiKey: string,
  apiMatchId: string,
  dbMatchId: string,
  team1Short: string,
  team2Short: string,
): Promise<SquadImportResult> => {
  const result: SquadImportResult = { playersCreated: 0, playersAdded: 0, playersSkipped: 0 };

  // Fetch existing players for dedup
  const { data: existingPlayers = [] } = await supabase.from("players").select("id, name, team");
  const existingNameMap = new Map<string, string>();
  for (const p of existingPlayers) {
    existingNameMap.set(p.name.toLowerCase().trim(), p.id);
  }

  // Fetch existing match_players for this match
  const { data: existingMP = [] } = await (supabase.from("match_players" as any) as any)
    .select("player_id").eq("match_id", dbMatchId);
  const assignedIds = new Set((existingMP || []).map((mp: any) => mp.player_id));

  // Try match_squad endpoint
  let squadPlayers: { name: string; role: string; team: string; photo_url: string | null; index: number; totalInTeam: number }[] = [];

  const squadRes = await fetch(`https://api.cricapi.com/v1/match_squad?apikey=${apiKey}&id=${apiMatchId}`);
  const squadData = await squadRes.json();

  if (squadData.status === "success" && squadData.data) {
    for (const teamSquad of squadData.data) {
      const teamName = teamSquad.shortname || teamSquad.teamName || "";
      const players = teamSquad.players || [];
      players.forEach((player: any, idx: number) => {
        if (!player.name) return;
        squadPlayers.push({
          name: player.name.trim(),
          role: mapApiRole(player.role || player.battingStyle || "batsman"),
          team: teamName,
          photo_url: player.playerImg || null,
          index: idx,
          totalInTeam: players.length,
        });
      });
    }
  }

  // Fallback: try match_info
  if (squadPlayers.length === 0) {
    const infoRes = await fetch(`https://api.cricapi.com/v1/match_info?apikey=${apiKey}&id=${apiMatchId}`);
    const infoData = await infoRes.json();
    if (infoData.status === "success" && infoData.data?.teamInfo) {
      for (const team of infoData.data.teamInfo) {
        const players = team.players || [];
        players.forEach((player: any, idx: number) => {
          const name = typeof player === "string" ? player : player.name;
          if (!name) return;
          squadPlayers.push({
            name: name.trim(),
            role: mapApiRole(player?.role || "batsman"),
            team: team.shortname || team.name || "",
            photo_url: player?.playerImg || null,
            index: idx,
            totalInTeam: players.length,
          });
        });
      }
    }
  }

  if (squadPlayers.length === 0) return result;

  // Process each player
  for (const sp of squadPlayers) {
    const nameKey = sp.name.toLowerCase().trim();
    let playerId = existingNameMap.get(nameKey);

    if (!playerId) {
      // Check last name + team match
      const spLast = nameKey.split(" ").pop() || "";
      if (spLast.length > 2) {
        for (const [existingName, existingId] of existingNameMap) {
          const dbLast = existingName.split(" ").pop() || "";
          if (dbLast === spLast) {
            const existingPlayer = existingPlayers.find(p => p.id === existingId);
            if (existingPlayer?.team?.toLowerCase() === sp.team.toLowerCase()) {
              playerId = existingId;
              break;
            }
          }
        }
      }
    }

    if (!playerId) {
      // Create new player with smart credit value
      const creditValue = assignCreditValue(sp.role, sp.index, sp.totalInTeam);
      const { data: newPlayer, error } = await supabase
        .from("players")
        .insert({
          name: sp.name,
          role: sp.role,
          team: sp.team,
          credit_value: creditValue,
          photo_url: sp.photo_url,
        })
        .select("id")
        .single();

      if (error) {
        result.playersSkipped++;
        continue;
      }
      playerId = newPlayer.id;
      existingNameMap.set(nameKey, playerId);
      result.playersCreated++;
    }

    // Add to match lineup if not already there
    if (assignedIds.has(playerId)) {
      result.playersSkipped++;
      continue;
    }

    const { error: addErr } = await (supabase.from("match_players" as any) as any)
      .insert({ match_id: dbMatchId, player_id: playerId, is_playing: true });

    if (addErr) {
      result.playersSkipped++;
    } else {
      result.playersAdded++;
      assignedIds.add(playerId);
    }
  }

  return result;
};

/**
 * Find the API match ID for a given match by searching CricketData.org
 */
export const findApiMatchId = async (
  apiKey: string,
  team1Short: string,
  team2Short: string,
): Promise<string | null> => {
  const m1 = team1Short.toUpperCase();
  const m2 = team2Short.toUpperCase();

  const matchFn = (am: any) => {
    const t1 = (am.teamInfo?.[0]?.shortname || "").toUpperCase();
    const t2 = (am.teamInfo?.[1]?.shortname || "").toUpperCase();
    return (t1 === m1 && t2 === m2) || (t1 === m2 && t2 === m1);
  };

  // Try matches endpoint
  try {
    const res = await fetch(`https://api.cricapi.com/v1/matches?apikey=${apiKey}&offset=0`);
    const data = await res.json();
    if (data.status === "success" && data.data) {
      const found = data.data.find(matchFn);
      if (found) return found.id;
    }
  } catch {}

  // Try currentMatches
  try {
    const res = await fetch(`https://api.cricapi.com/v1/currentMatches?apikey=${apiKey}&offset=0`);
    const data = await res.json();
    if (data.status === "success" && data.data) {
      const found = data.data.find(matchFn);
      if (found) return found.id;
    }
  } catch {}

  return null;
};
