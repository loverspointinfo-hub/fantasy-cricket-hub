import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Fantasy scoring rules (Dream11-style)
const SCORING_RULES = {
  run: 1,
  boundary_bonus: 1,
  six_bonus: 2,
  half_century: 8,
  century: 16,
  duck: -2,
  wicket: 25,
  lbw_bowled_bonus: 8,
  three_wicket_haul: 4,
  four_wicket_haul: 8,
  five_wicket_haul: 16,
  maiden_over: 12,
  catch_points: 8,
  stumping: 12,
  run_out_direct: 12,
  run_out_indirect: 6,
  economy_below_5: 6,
  economy_5_to_6: 4,
  economy_6_to_7: 2,
  economy_10_to_11: -2,
  economy_11_to_12: -4,
  economy_above_12: -6,
  sr_above_170: 6,
  sr_150_to_170: 4,
  sr_130_to_150: 2,
  sr_60_to_70: -2,
  sr_50_to_60: -4,
  sr_below_50: -6,
  playing: 4,
};

interface PlayerScorecard {
  name: string;
  runs?: number;
  balls_faced?: number;
  fours?: number;
  sixes?: number;
  wickets?: number;
  overs_bowled?: number;
  runs_conceded?: number;
  maidens?: number;
  catches?: number;
  stumpings?: number;
  run_outs?: number;
}

function calculateFantasyPoints(stats: PlayerScorecard, role: string): number {
  let points = SCORING_RULES.playing;

  const runs = stats.runs ?? 0;
  const ballsFaced = stats.balls_faced ?? 0;
  const fours = stats.fours ?? 0;
  const sixes = stats.sixes ?? 0;

  points += runs * SCORING_RULES.run;
  points += fours * SCORING_RULES.boundary_bonus;
  points += sixes * SCORING_RULES.six_bonus;

  if (runs >= 100) points += SCORING_RULES.century;
  else if (runs >= 50) points += SCORING_RULES.half_century;

  if (runs === 0 && ballsFaced > 0 && ["BAT", "WK", "AR"].includes(role)) {
    points += SCORING_RULES.duck;
  }

  if (ballsFaced >= 10 && ["BAT", "WK", "AR"].includes(role)) {
    const sr = (runs / ballsFaced) * 100;
    if (sr > 170) points += SCORING_RULES.sr_above_170;
    else if (sr >= 150) points += SCORING_RULES.sr_150_to_170;
    else if (sr >= 130) points += SCORING_RULES.sr_130_to_150;
    else if (sr >= 60 && sr < 70) points += SCORING_RULES.sr_60_to_70;
    else if (sr >= 50 && sr < 60) points += SCORING_RULES.sr_50_to_60;
    else if (sr < 50) points += SCORING_RULES.sr_below_50;
  }

  const wickets = stats.wickets ?? 0;
  const oversBowled = stats.overs_bowled ?? 0;
  const runsConceded = stats.runs_conceded ?? 0;
  const maidens = stats.maidens ?? 0;

  points += wickets * SCORING_RULES.wicket;
  points += maidens * SCORING_RULES.maiden_over;

  if (wickets >= 5) points += SCORING_RULES.five_wicket_haul;
  else if (wickets >= 4) points += SCORING_RULES.four_wicket_haul;
  else if (wickets >= 3) points += SCORING_RULES.three_wicket_haul;

  if (oversBowled >= 2) {
    const economy = runsConceded / oversBowled;
    if (economy < 5) points += SCORING_RULES.economy_below_5;
    else if (economy < 6) points += SCORING_RULES.economy_5_to_6;
    else if (economy < 7) points += SCORING_RULES.economy_6_to_7;
    else if (economy >= 10 && economy < 11) points += SCORING_RULES.economy_10_to_11;
    else if (economy >= 11 && economy < 12) points += SCORING_RULES.economy_11_to_12;
    else if (economy >= 12) points += SCORING_RULES.economy_above_12;
  }

  points += (stats.catches ?? 0) * SCORING_RULES.catch_points;
  points += (stats.stumpings ?? 0) * SCORING_RULES.stumping;
  points += (stats.run_outs ?? 0) * SCORING_RULES.run_out_direct;

  return points;
}

function parseOvers(overs: string | number | undefined): number {
  if (!overs) return 0;
  const str = String(overs);
  const parts = str.split(".");
  const fullOvers = parseInt(parts[0]) || 0;
  const balls = parseInt(parts[1]) || 0;
  return fullOvers + balls / 6;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    let body: any;
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const matchId = body?.match_id;
    const scorecardData = body?.scorecard_data;

    if (!matchId) {
      throw new Error("match_id is required");
    }

    // Get match players from DB
    const { data: matchPlayers, error: mpErr } = await supabase
      .from("match_players")
      .select("*, players!match_players_player_id_fkey(name, role, team)")
      .eq("match_id", matchId);

    if (mpErr) throw mpErr;
    if (!matchPlayers || matchPlayers.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No players in lineup", players_updated: 0, teams_recalculated: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build player stats from scorecard data (passed from client)
    const playerStats: Record<string, PlayerScorecard> = {};

    if (scorecardData) {
      const scoreData = scorecardData.scorecard || scorecardData.batting || [];

      if (Array.isArray(scoreData)) {
        for (const innings of scoreData) {
          const battingData = innings.batting || [];
          for (const bat of battingData) {
            const name = bat.batsman?.name || bat.name || "";
            if (!name) continue;
            if (!playerStats[name]) playerStats[name] = { name };
            playerStats[name].runs = (bat.r ?? bat.runs ?? 0);
            playerStats[name].balls_faced = (bat.b ?? bat.balls ?? 0);
            playerStats[name].fours = (bat.fours ?? bat["4s"] ?? 0);
            playerStats[name].sixes = (bat.sixes ?? bat["6s"] ?? 0);
          }

          const bowlingData = innings.bowling || [];
          for (const bowl of bowlingData) {
            const name = bowl.bowler?.name || bowl.name || "";
            if (!name) continue;
            if (!playerStats[name]) playerStats[name] = { name };
            playerStats[name].wickets = (bowl.w ?? bowl.wickets ?? 0);
            playerStats[name].overs_bowled = parseOvers(bowl.o ?? bowl.overs);
            playerStats[name].runs_conceded = (bowl.r ?? bowl.runs ?? 0);
            playerStats[name].maidens = (bowl.m ?? bowl.maidens ?? 0);
          }

          // Parse fielding from dismissal text
          for (const bat of battingData) {
            const dismissal = bat.dismissal || bat["dismissal-text"] || "";
            const catchMatch = dismissal.match(/c\s+(.+?)\s+b\s+/i);
            if (catchMatch) {
              const fielder = catchMatch[1].trim();
              if (!playerStats[fielder]) playerStats[fielder] = { name: fielder };
              playerStats[fielder].catches = (playerStats[fielder].catches || 0) + 1;
            }
            const stumpMatch = dismissal.match(/st\s+(.+?)\s+b\s+/i);
            if (stumpMatch) {
              const keeper = stumpMatch[1].trim();
              if (!playerStats[keeper]) playerStats[keeper] = { name: keeper };
              playerStats[keeper].stumpings = (playerStats[keeper].stumpings || 0) + 1;
            }
            const runOutMatch = dismissal.match(/run out\s*\((.+?)\)/i);
            if (runOutMatch) {
              const fielders = runOutMatch[1].split("/");
              for (const f of fielders) {
                const fielder = f.trim();
                if (!playerStats[fielder]) playerStats[fielder] = { name: fielder };
                playerStats[fielder].run_outs = (playerStats[fielder].run_outs || 0) + 1;
              }
            }
          }
        }
      }
    }

    let totalUpdated = 0;

    // Match DB players with scorecard using fuzzy name matching
    for (const mp of matchPlayers) {
      const dbName = (mp.players?.name || "").toLowerCase().trim();
      const role = mp.players?.role || "BAT";

      let stats: PlayerScorecard | null = null;
      for (const [apiName, s] of Object.entries(playerStats)) {
        const apiLower = apiName.toLowerCase().trim();
        if (apiLower === dbName || apiLower.includes(dbName) || dbName.includes(apiLower)) {
          stats = s;
          break;
        }
        const dbLast = dbName.split(" ").pop() || "";
        const apiLast = apiLower.split(" ").pop() || "";
        if (dbLast.length > 2 && apiLast.length > 2 && dbLast === apiLast) {
          stats = s;
          break;
        }
      }

      if (stats) {
        const fantasyPoints = calculateFantasyPoints(stats, role);
        const { error: updateErr } = await supabase
          .from("match_players")
          .update({ fantasy_points: fantasyPoints })
          .eq("id", mp.id);
        if (!updateErr) totalUpdated++;
      }
    }

    // Recalculate team points
    const { data: recalcCount } = await supabase.rpc("recalculate_team_points", {
      p_match_id: matchId,
    });

    return new Response(
      JSON.stringify({
        success: true,
        players_updated: totalUpdated,
        teams_recalculated: recalcCount || 0,
        scorecard_players_found: Object.keys(playerStats).length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Auto-score error:", err.message);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
