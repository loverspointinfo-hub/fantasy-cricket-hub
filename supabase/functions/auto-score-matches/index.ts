import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Fantasy scoring rules (Dream11-style)
const SCORING_RULES = {
  // Batting
  run: 1,
  boundary_bonus: 1,        // per 4
  six_bonus: 2,             // per 6
  half_century: 8,
  century: 16,
  duck: -2,                 // 0 runs (BAT/WK/AR only)

  // Bowling
  wicket: 25,
  lbw_bowled_bonus: 8,      // bonus for LBW/Bowled
  three_wicket_haul: 4,
  four_wicket_haul: 8,
  five_wicket_haul: 16,
  maiden_over: 12,

  // Fielding
  catch: 8,
  stumping: 12,
  run_out_direct: 12,
  run_out_indirect: 6,

  // Economy rate bonuses (min 2 overs)
  economy_below_5: 6,
  economy_5_to_6: 4,
  economy_6_to_7: 2,
  economy_10_to_11: -2,
  economy_11_to_12: -4,
  economy_above_12: -6,

  // Strike rate bonuses (min 10 balls, BAT/WK/AR)
  sr_above_170: 6,
  sr_150_to_170: 4,
  sr_130_to_150: 2,
  sr_60_to_70: -2,
  sr_50_to_60: -4,
  sr_below_50: -6,

  // Starting XI
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
  dismissal?: string; // "lbw", "bowled", etc.
}

function calculateFantasyPoints(stats: PlayerScorecard, role: string): number {
  let points = SCORING_RULES.playing; // base for playing

  // Batting points
  const runs = stats.runs ?? 0;
  const ballsFaced = stats.balls_faced ?? 0;
  const fours = stats.fours ?? 0;
  const sixes = stats.sixes ?? 0;

  points += runs * SCORING_RULES.run;
  points += fours * SCORING_RULES.boundary_bonus;
  points += sixes * SCORING_RULES.six_bonus;

  if (runs >= 100) points += SCORING_RULES.century;
  else if (runs >= 50) points += SCORING_RULES.half_century;

  // Duck penalty (only for BAT, WK, AR who batted)
  if (runs === 0 && ballsFaced > 0 && ["BAT", "WK", "AR"].includes(role)) {
    points += SCORING_RULES.duck;
  }

  // Strike rate bonus (min 10 balls, BAT/WK/AR)
  if (ballsFaced >= 10 && ["BAT", "WK", "AR"].includes(role)) {
    const sr = (runs / ballsFaced) * 100;
    if (sr > 170) points += SCORING_RULES.sr_above_170;
    else if (sr >= 150) points += SCORING_RULES.sr_150_to_170;
    else if (sr >= 130) points += SCORING_RULES.sr_130_to_150;
    else if (sr >= 60 && sr < 70) points += SCORING_RULES.sr_60_to_70;
    else if (sr >= 50 && sr < 60) points += SCORING_RULES.sr_50_to_60;
    else if (sr < 50) points += SCORING_RULES.sr_below_50;
  }

  // Bowling points
  const wickets = stats.wickets ?? 0;
  const oversBowled = stats.overs_bowled ?? 0;
  const runsConceded = stats.runs_conceded ?? 0;
  const maidens = stats.maidens ?? 0;

  points += wickets * SCORING_RULES.wicket;
  points += maidens * SCORING_RULES.maiden_over;

  if (wickets >= 5) points += SCORING_RULES.five_wicket_haul;
  else if (wickets >= 4) points += SCORING_RULES.four_wicket_haul;
  else if (wickets >= 3) points += SCORING_RULES.three_wicket_haul;

  // Economy rate bonus (min 2 overs)
  if (oversBowled >= 2) {
    const economy = runsConceded / oversBowled;
    if (economy < 5) points += SCORING_RULES.economy_below_5;
    else if (economy < 6) points += SCORING_RULES.economy_5_to_6;
    else if (economy < 7) points += SCORING_RULES.economy_6_to_7;
    else if (economy >= 10 && economy < 11) points += SCORING_RULES.economy_10_to_11;
    else if (economy >= 11 && economy < 12) points += SCORING_RULES.economy_11_to_12;
    else if (economy >= 12) points += SCORING_RULES.economy_above_12;
  }

  // Fielding
  points += (stats.catches ?? 0) * SCORING_RULES.catch;
  points += (stats.stumpings ?? 0) * SCORING_RULES.stumping;
  points += (stats.run_outs ?? 0) * SCORING_RULES.run_out_direct;

  return points;
}

// Parse overs string like "4.0" to number
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

    // Get API key from site_settings
    const { data: apiKeySetting } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "cricketdata_api_key")
      .single();

    const apiKey = apiKeySetting?.value || Deno.env.get("CRICKETDATA_API_KEY");
    if (!apiKey) {
      throw new Error("CricketData API key not configured");
    }

    // Optional: accept specific match_id for manual trigger
    let targetMatchId: string | null = null;
    try {
      const body = await req.json();
      targetMatchId = body?.match_id || null;
    } catch { /* cron calls with no body */ }

    // Get live matches
    let matchQuery = supabase.from("matches").select("*").eq("status", "live");
    if (targetMatchId) {
      matchQuery = supabase.from("matches").select("*").eq("id", targetMatchId);
    }
    const { data: liveMatches, error: matchErr } = await matchQuery;
    if (matchErr) throw matchErr;
    if (!liveMatches || liveMatches.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No live matches to score", updated: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let totalUpdated = 0;
    let teamsRecalculated = 0;
    const errors: string[] = [];

    for (const match of liveMatches) {
      try {
        // Search for the match in CricketData API
        const searchUrl = `https://api.cricapi.com/v1/currentMatches?apikey=${apiKey}&offset=0`;
        const searchRes = await fetch(searchUrl);
        const searchData = await searchRes.json();

        if (searchData.status !== "success" || !searchData.data) {
          errors.push(`API error for ${match.team1_short} vs ${match.team2_short}: ${searchData.info || "Unknown"}`);
          continue;
        }

        // Find matching live match from API
        const apiMatch = searchData.data.find((am: any) => {
          const t1 = (am.teamInfo?.[0]?.shortname || "").toUpperCase();
          const t2 = (am.teamInfo?.[1]?.shortname || "").toUpperCase();
          const m1 = match.team1_short.toUpperCase();
          const m2 = match.team2_short.toUpperCase();
          return (t1 === m1 && t2 === m2) || (t1 === m2 && t2 === m1);
        });

        if (!apiMatch) {
          // Try scorecard endpoint with match name search
          errors.push(`No API match found for ${match.team1_short} vs ${match.team2_short}`);
          continue;
        }

        // Fetch detailed scorecard
        const scorecardUrl = `https://api.cricapi.com/v1/match_scorecard?apikey=${apiKey}&id=${apiMatch.id}`;
        const scRes = await fetch(scorecardUrl);
        const scData = await scRes.json();

        if (scData.status !== "success" || !scData.data) {
          errors.push(`Scorecard error for ${match.team1_short} vs ${match.team2_short}`);
          continue;
        }

        const scorecard = scData.data;

        // Get match players from our DB
        const { data: matchPlayers } = await supabase
          .from("match_players")
          .select("*, players!match_players_player_id_fkey(name, role, team)")
          .eq("match_id", match.id);

        if (!matchPlayers || matchPlayers.length === 0) continue;

        // Build player stats from scorecard
        const playerStats: Record<string, PlayerScorecard> = {};

        // Parse batting scorecard from all innings
        const allScores = scorecard.score || [];
        const scoreData = scorecard.scorecard || scorecard.batting || [];

        // Process each innings scorecard
        if (Array.isArray(scoreData)) {
          for (const innings of scoreData) {
            // Batting data
            const battingData = innings.batting || [];
            for (const bat of battingData) {
              const name = bat.batsman?.name || bat.name || "";
              if (!name) continue;
              if (!playerStats[name]) playerStats[name] = { name };
              playerStats[name].runs = (bat.r ?? bat.runs ?? 0);
              playerStats[name].balls_faced = (bat.b ?? bat.balls ?? 0);
              playerStats[name].fours = (bat.fours ?? bat["4s"] ?? 0);
              playerStats[name].sixes = (bat.sixes ?? bat["6s"] ?? 0);
              playerStats[name].dismissal = bat.dismissal || bat["dismissal-text"] || "";
            }

            // Bowling data
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

            // Catching/fielding from dismissal texts
            const catchPattern = /c\s+(.+?)\s+b\s+/i;
            const stumpPattern = /st\s+(.+?)\s+b\s+/i;
            const runOutPattern = /run out\s*\((.+?)\)/i;

            for (const bat of battingData) {
              const dismissal = bat.dismissal || bat["dismissal-text"] || "";

              const catchMatch = dismissal.match(catchPattern);
              if (catchMatch) {
                const fielder = catchMatch[1].trim();
                if (!playerStats[fielder]) playerStats[fielder] = { name: fielder };
                playerStats[fielder].catches = (playerStats[fielder].catches || 0) + 1;
              }

              const stumpMatch = dismissal.match(stumpPattern);
              if (stumpMatch) {
                const keeper = stumpMatch[1].trim();
                if (!playerStats[keeper]) playerStats[keeper] = { name: keeper };
                playerStats[keeper].stumpings = (playerStats[keeper].stumpings || 0) + 1;
              }

              const runOutMatch = dismissal.match(runOutPattern);
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

        // Match our DB players with scorecard data using fuzzy name matching
        for (const mp of matchPlayers) {
          const dbName = (mp.players?.name || "").toLowerCase().trim();
          const role = mp.players?.role || "BAT";

          // Try exact match first, then partial
          let stats: PlayerScorecard | null = null;
          for (const [apiName, s] of Object.entries(playerStats)) {
            const apiLower = apiName.toLowerCase().trim();
            if (apiLower === dbName || apiLower.includes(dbName) || dbName.includes(apiLower)) {
              stats = s;
              break;
            }
            // Try last name match
            const dbLast = dbName.split(" ").pop() || "";
            const apiLast = apiLower.split(" ").pop() || "";
            if (dbLast.length > 2 && apiLast.length > 2 && (dbLast === apiLast)) {
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
          p_match_id: match.id,
        });
        teamsRecalculated += recalcCount || 0;

        // Check if match completed
        if (apiMatch.matchEnded || apiMatch.status?.toLowerCase().includes("won") ||
            apiMatch.status?.toLowerCase().includes("drawn") || apiMatch.status?.toLowerCase().includes("tied")) {
          // Don't auto-complete, just log - admin should manually complete & distribute
          console.log(`Match ${match.team1_short} vs ${match.team2_short} appears finished: ${apiMatch.status}`);
        }

      } catch (matchError: any) {
        errors.push(`Error processing ${match.team1_short} vs ${match.team2_short}: ${matchError.message}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        matches_processed: liveMatches.length,
        players_updated: totalUpdated,
        teams_recalculated: teamsRecalculated,
        errors: errors.length > 0 ? errors : undefined,
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
