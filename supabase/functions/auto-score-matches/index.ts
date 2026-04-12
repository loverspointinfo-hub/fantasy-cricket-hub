import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ScoringRules {
  [key: string]: number;
}

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

interface ApiResult {
  provider: string;
  scorecard: any;
  matchEnded: boolean;
  success: boolean;
  error?: string;
}

const DEFAULT_RULES: ScoringRules = {
  run: 1, boundary_bonus: 1, six_bonus: 2, half_century: 8, century: 16, duck: -2,
  wicket: 25, lbw_bowled_bonus: 8, three_wicket_haul: 4, four_wicket_haul: 8,
  five_wicket_haul: 16, maiden_over: 12, catch_points: 8, stumping: 12,
  run_out_direct: 12, run_out_indirect: 6,
  economy_below_5: 6, economy_5_to_6: 4, economy_6_to_7: 2,
  economy_10_to_11: -2, economy_11_to_12: -4, economy_above_12: -6,
  sr_above_170: 6, sr_150_to_170: 4, sr_130_to_150: 2,
  sr_60_to_70: -2, sr_50_to_60: -4, sr_below_50: -6,
  playing: 4,
};

async function fetchScoringRules(supabase: any): Promise<ScoringRules> {
  const { data, error } = await supabase.from("scoring_rules").select("rule_key, value");
  if (error || !data || data.length === 0) return DEFAULT_RULES;
  const rules: ScoringRules = {};
  for (const row of data) rules[row.rule_key] = Number(row.value);
  return rules;
}

function calculateFantasyPoints(stats: PlayerScorecard, role: string, R: ScoringRules): number {
  let points = R.playing ?? 4;
  const runs = stats.runs ?? 0;
  const ballsFaced = stats.balls_faced ?? 0;
  const fours = stats.fours ?? 0;
  const sixes = stats.sixes ?? 0;

  points += runs * (R.run ?? 1);
  points += fours * (R.boundary_bonus ?? 1);
  points += sixes * (R.six_bonus ?? 2);
  if (runs >= 100) points += R.century ?? 16;
  else if (runs >= 50) points += R.half_century ?? 8;
  if (runs === 0 && ballsFaced > 0 && ["BAT", "WK", "AR"].includes(role)) points += R.duck ?? -2;

  if (ballsFaced >= 10 && ["BAT", "WK", "AR"].includes(role)) {
    const sr = (runs / ballsFaced) * 100;
    if (sr > 170) points += R.sr_above_170 ?? 6;
    else if (sr >= 150) points += R.sr_150_to_170 ?? 4;
    else if (sr >= 130) points += R.sr_130_to_150 ?? 2;
    else if (sr >= 60 && sr < 70) points += R.sr_60_to_70 ?? -2;
    else if (sr >= 50 && sr < 60) points += R.sr_50_to_60 ?? -4;
    else if (sr < 50) points += R.sr_below_50 ?? -6;
  }

  const wickets = stats.wickets ?? 0;
  const oversBowled = stats.overs_bowled ?? 0;
  const runsConceded = stats.runs_conceded ?? 0;
  const maidens = stats.maidens ?? 0;
  points += wickets * (R.wicket ?? 25);
  points += maidens * (R.maiden_over ?? 12);
  if (wickets >= 5) points += R.five_wicket_haul ?? 16;
  else if (wickets >= 4) points += R.four_wicket_haul ?? 8;
  else if (wickets >= 3) points += R.three_wicket_haul ?? 4;

  if (oversBowled >= 2) {
    const economy = runsConceded / oversBowled;
    if (economy < 5) points += R.economy_below_5 ?? 6;
    else if (economy < 6) points += R.economy_5_to_6 ?? 4;
    else if (economy < 7) points += R.economy_6_to_7 ?? 2;
    else if (economy >= 10 && economy < 11) points += R.economy_10_to_11 ?? -2;
    else if (economy >= 11 && economy < 12) points += R.economy_11_to_12 ?? -4;
    else if (economy >= 12) points += R.economy_above_12 ?? -6;
  }

  points += (stats.catches ?? 0) * (R.catch_points ?? 8);
  points += (stats.stumpings ?? 0) * (R.stumping ?? 12);
  points += (stats.run_outs ?? 0) * (R.run_out_direct ?? 12);
  return points;
}

function parseOvers(overs: string | number | undefined): number {
  if (!overs) return 0;
  const str = String(overs);
  const parts = str.split(".");
  return (parseInt(parts[0]) || 0) + (parseInt(parts[1]) || 0) / 6;
}

// ─── MULTI-API PROVIDERS ───────────────────────────────────────

// Provider 1: CricketData (Primary)
async function fetchFromCricketData(apiMatchId: string, apiKey: string): Promise<ApiResult> {
  try {
    const url = `https://api.cricapi.com/v1/match_scorecard?apikey=${apiKey}&id=${apiMatchId}`;
    const resp = await fetch(url);
    if (!resp.ok) {
      return { provider: "CricketData", scorecard: null, matchEnded: false, success: false, error: `HTTP ${resp.status}` };
    }
    const json = await resp.json();
    if (json.status !== "success") {
      return { provider: "CricketData", scorecard: null, matchEnded: false, success: false, error: `API status: ${json.status}` };
    }
    const data = json.data;
    const matchEnded = !!(data?.matchEnded || data?.status?.toLowerCase().includes("won") || data?.status?.toLowerCase().includes("drawn"));
    const scorecard = data?.scorecard || data?.score || [];
    if (!scorecard || (Array.isArray(scorecard) && scorecard.length === 0)) {
      return { provider: "CricketData", scorecard: null, matchEnded, success: false, error: "Empty scorecard data" };
    }
    return { provider: "CricketData", scorecard: { scorecard }, matchEnded, success: true };
  } catch (e: any) {
    return { provider: "CricketData", scorecard: null, matchEnded: false, success: false, error: e.message };
  }
}

// Provider 2: CricAPI Backup
async function fetchFromCricAPIBackup(apiMatchId: string, apiKey: string): Promise<ApiResult> {
  try {
    const url = `https://api.cricapi.com/v1/match_scorecard?apikey=${apiKey}&id=${apiMatchId}`;
    const resp = await fetch(url);
    if (!resp.ok) {
      return { provider: "CricAPI-Backup", scorecard: null, matchEnded: false, success: false, error: `HTTP ${resp.status}` };
    }
    const json = await resp.json();
    if (json.status !== "success") {
      return { provider: "CricAPI-Backup", scorecard: null, matchEnded: false, success: false, error: `API status: ${json.status}` };
    }
    const data = json.data;
    const matchEnded = !!(data?.matchEnded || data?.status?.toLowerCase().includes("won") || data?.status?.toLowerCase().includes("drawn"));
    const scorecard = data?.scorecard || data?.score || [];
    if (!scorecard || (Array.isArray(scorecard) && scorecard.length === 0)) {
      return { provider: "CricAPI-Backup", scorecard: null, matchEnded, success: false, error: "Empty scorecard" };
    }
    return { provider: "CricAPI-Backup", scorecard: { scorecard }, matchEnded, success: true };
  } catch (e: any) {
    return { provider: "CricAPI-Backup", scorecard: null, matchEnded: false, success: false, error: e.message };
  }
}

// Provider 3: SportMonks
async function fetchFromSportMonks(apiMatchId: string, apiKey: string): Promise<ApiResult> {
  try {
    const url = `https://cricket.sportmonks.com/api/v2.0/fixtures/${apiMatchId}?api_token=${apiKey}&include=scoreboards,batting,bowling`;
    const resp = await fetch(url);
    if (!resp.ok) {
      return { provider: "SportMonks", scorecard: null, matchEnded: false, success: false, error: `HTTP ${resp.status}` };
    }
    const json = await resp.json();
    const fixture = json.data;
    if (!fixture) {
      return { provider: "SportMonks", scorecard: null, matchEnded: false, success: false, error: "No fixture data" };
    }
    
    const matchEnded = fixture.status === "Finished" || fixture.status === "Aban.";
    
    // Transform SportMonks format to our standard scorecard format
    const batting = fixture.batting?.data || [];
    const bowling = fixture.bowling?.data || [];
    
    if (batting.length === 0 && bowling.length === 0) {
      return { provider: "SportMonks", scorecard: null, matchEnded, success: false, error: "Empty scorecard" };
    }
    
    // Group by innings
    const inningsMap: Record<number, { batting: any[]; bowling: any[] }> = {};
    for (const b of batting) {
      const inn = b.scoreboard || 1;
      if (!inningsMap[inn]) inningsMap[inn] = { batting: [], bowling: [] };
      inningsMap[inn].batting.push({
        name: b.batsman?.fullname || b.batsman?.lastname || "",
        r: b.score ?? 0,
        b: b.ball ?? 0,
        fours: b.four_x ?? 0,
        sixes: b.six_x ?? 0,
        dismissal: b.catch_stump_player_id ? `c ${b.catching?.fullname || ""} b ${b.bowler?.fullname || ""}` : "",
      });
    }
    for (const b of bowling) {
      const inn = b.scoreboard || 1;
      if (!inningsMap[inn]) inningsMap[inn] = { batting: [], bowling: [] };
      inningsMap[inn].bowling.push({
        name: b.bowler?.fullname || b.bowler?.lastname || "",
        w: b.wickets ?? 0,
        o: b.overs ?? 0,
        r: b.runs ?? 0,
        m: b.medians ?? 0,
      });
    }
    
    const scorecard = Object.values(inningsMap);
    return { provider: "SportMonks", scorecard: { scorecard }, matchEnded, success: true };
  } catch (e: any) {
    return { provider: "SportMonks", scorecard: null, matchEnded: false, success: false, error: e.message };
  }
}

// Main fallback orchestrator
async function fetchScorecardWithFallback(
  apiMatchId: string,
  keys: { cricketdata: string; cricapiBackup: string; sportmonks: string }
): Promise<ApiResult> {
  const attempts: { provider: string; error: string }[] = [];

  // Try Provider 1: CricketData (primary)
  if (keys.cricketdata) {
    const result = await fetchFromCricketData(apiMatchId, keys.cricketdata);
    if (result.success) {
      console.log(`✅ ${result.provider} returned data successfully`);
      return result;
    }
    console.warn(`⚠️ ${result.provider} failed: ${result.error}`);
    attempts.push({ provider: result.provider, error: result.error || "unknown" });
  }

  // Try Provider 2: CricAPI Backup
  if (keys.cricapiBackup) {
    const result = await fetchFromCricAPIBackup(apiMatchId, keys.cricapiBackup);
    if (result.success) {
      console.log(`✅ ${result.provider} returned data successfully (fallback)`);
      return result;
    }
    console.warn(`⚠️ ${result.provider} failed: ${result.error}`);
    attempts.push({ provider: result.provider, error: result.error || "unknown" });
  }

  // Try Provider 3: SportMonks
  if (keys.sportmonks) {
    const result = await fetchFromSportMonks(apiMatchId, keys.sportmonks);
    if (result.success) {
      console.log(`✅ ${result.provider} returned data successfully (fallback)`);
      return result;
    }
    console.warn(`⚠️ ${result.provider} failed: ${result.error}`);
    attempts.push({ provider: result.provider, error: result.error || "unknown" });
  }

  console.error(`❌ All API providers failed:`, JSON.stringify(attempts));
  return { provider: "none", scorecard: null, matchEnded: false, success: false, error: `All providers failed: ${JSON.stringify(attempts)}` };
}

// ─── POINT EVENTS ───────────────────────────────────────────────

function generatePointEvents(
  stats: PlayerScorecard,
  role: string,
  R: ScoringRules
): { description: string; event_type: string; points: number }[] {
  const events: { description: string; event_type: string; points: number }[] = [];
  const runs = stats.runs ?? 0;
  const sixes = stats.sixes ?? 0;
  const fours = stats.fours ?? 0;
  const wickets = stats.wickets ?? 0;
  const catches = stats.catches ?? 0;

  if (runs >= 100) events.push({ description: `💯 Century! (${runs} runs)`, event_type: "century", points: (R.century ?? 16) + runs * (R.run ?? 1) });
  else if (runs >= 50) events.push({ description: `🔥 Half Century! (${runs} runs)`, event_type: "half_century", points: (R.half_century ?? 8) + runs * (R.run ?? 1) });
  else if (runs > 0) events.push({ description: `${runs} runs scored`, event_type: "runs", points: runs * (R.run ?? 1) });

  if (sixes > 0) events.push({ description: `${sixes} Six${sixes > 1 ? 'es' : ''} hit! 🔥`, event_type: "six", points: sixes * (R.six_bonus ?? 2) });
  if (fours > 0) events.push({ description: `${fours} Four${fours > 1 ? 's' : ''} hit! 💥`, event_type: "four", points: fours * (R.boundary_bonus ?? 1) });
  if (wickets > 0) events.push({ description: `${wickets} wicket${wickets > 1 ? 's' : ''} taken! 🎯`, event_type: "wicket", points: wickets * (R.wicket ?? 25) });
  if (catches > 0) events.push({ description: `${catches} catch${catches > 1 ? 'es' : ''} taken! 🧤`, event_type: "catch", points: catches * (R.catch_points ?? 8) });

  if (runs === 0 && (stats.balls_faced ?? 0) > 0 && ["BAT", "WK", "AR"].includes(role)) {
    events.push({ description: "Duck 🦆", event_type: "duck", points: R.duck ?? -2 });
  }

  return events;
}

// ─── SCORECARD PARSER ───────────────────────────────────────────

function parseScorecardToStats(scorecardData: any): Record<string, PlayerScorecard> {
  const playerStats: Record<string, PlayerScorecard> = {};
  const scoreData = scorecardData?.scorecard || scorecardData?.batting || [];

  if (!Array.isArray(scoreData)) return playerStats;

  for (const innings of scoreData) {
    const battingData = innings.batting || [];
    for (const bat of battingData) {
      const name = bat.batsman?.name || bat.name || "";
      if (!name) continue;
      if (!playerStats[name]) playerStats[name] = { name };
      playerStats[name].runs = bat.r ?? bat.runs ?? 0;
      playerStats[name].balls_faced = bat.b ?? bat.balls ?? 0;
      playerStats[name].fours = bat.fours ?? bat["4s"] ?? 0;
      playerStats[name].sixes = bat.sixes ?? bat["6s"] ?? 0;
    }
    const bowlingData = innings.bowling || [];
    for (const bowl of bowlingData) {
      const name = bowl.bowler?.name || bowl.name || "";
      if (!name) continue;
      if (!playerStats[name]) playerStats[name] = { name };
      playerStats[name].wickets = bowl.w ?? bowl.wickets ?? 0;
      playerStats[name].overs_bowled = parseOvers(bowl.o ?? bowl.overs);
      playerStats[name].runs_conceded = bowl.r ?? bowl.runs ?? 0;
      playerStats[name].maidens = bowl.m ?? bowl.maidens ?? 0;
    }
    // Parse fielding from dismissals
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

  return playerStats;
}

// ─── PROCESS MATCH ──────────────────────────────────────────────

async function processMatch(
  supabase: any,
  matchId: string,
  RULES: ScoringRules,
  apiKeys: { cricketdata: string; cricapiBackup: string; sportmonks: string },
  scorecardData?: any
) {
  const { data: matchInfo } = await supabase.from("matches").select("cricket_api_match_id").eq("id", matchId).single();

  let usedProvider = "manual";

  // If no scorecard data provided, fetch from APIs with fallback
  if (!scorecardData && matchInfo?.cricket_api_match_id) {
    const startTime = Date.now();
    const apiResult = await fetchScorecardWithFallback(matchInfo.cricket_api_match_id, apiKeys);
    const responseTime = Date.now() - startTime;

    // Log API health to api_health_log table
    try {
      await supabase.from("api_health_log").insert({
        match_id: matchId,
        provider: apiResult.provider,
        status: apiResult.success ? "success" : "failed",
        response_time_ms: responseTime,
        error_message: apiResult.error || null,
      });
    } catch (logErr: any) {
      console.warn("Failed to log API health:", logErr.message);
    }

    if (apiResult.success) {
      scorecardData = apiResult.scorecard;
      usedProvider = apiResult.provider;
      if (apiResult.matchEnded) {
        console.log(`Match ${matchId} appears completed (via ${usedProvider})`);
      }
    } else {
      console.warn(`No scorecard data available for match ${matchId}: ${apiResult.error}`);
    }
  }

  const { data: matchPlayers, error: mpErr } = await supabase
    .from("match_players")
    .select("*, players!match_players_player_id_fkey(name, role, team)")
    .eq("match_id", matchId);

  if (mpErr) throw mpErr;
  if (!matchPlayers || matchPlayers.length === 0) return { players_updated: 0, events_created: 0, provider: usedProvider };

  const playerStats = parseScorecardToStats(scorecardData);

  let totalUpdated = 0;
  const pointEvents: any[] = [];

  for (const mp of matchPlayers) {
    const dbName = (mp.players?.name || "").toLowerCase().trim();
    const role = mp.players?.role || "BAT";
    const playerTeam = mp.players?.team || "";

    let stats: PlayerScorecard | null = null;
    for (const [apiName, s] of Object.entries(playerStats)) {
      const apiLower = apiName.toLowerCase().trim();
      if (apiLower === dbName || apiLower.includes(dbName) || dbName.includes(apiLower)) { stats = s; break; }
      const dbLast = dbName.split(" ").pop() || "";
      const apiLast = apiLower.split(" ").pop() || "";
      if (dbLast.length > 2 && apiLast.length > 2 && dbLast === apiLast) { stats = s; break; }
    }

    if (stats) {
      const oldPoints = mp.fantasy_points || 0;
      const fantasyPoints = calculateFantasyPoints(stats, role, RULES);

      const { error: updateErr } = await supabase
        .from("match_players")
        .update({ fantasy_points: fantasyPoints })
        .eq("id", mp.id);
      if (!updateErr) totalUpdated++;

      if (fantasyPoints !== oldPoints) {
        const events = generatePointEvents(stats, role, RULES);
        for (const ev of events) {
          pointEvents.push({
            match_id: matchId,
            player_name: mp.players?.name || "Unknown",
            player_team: playerTeam,
            event_type: ev.event_type,
            description: ev.description,
            points_change: ev.points,
          });
        }
      }
    }
  }

  if (pointEvents.length > 0) {
    await supabase
      .from("point_events")
      .delete()
      .eq("match_id", matchId)
      .lt("created_at", new Date(Date.now() - 10 * 60 * 1000).toISOString());

    await supabase.from("point_events").insert(pointEvents);
  }

  await supabase.rpc("recalculate_team_points", { p_match_id: matchId });

  return { players_updated: totalUpdated, events_created: pointEvents.length, provider: usedProvider };
}

// ─── MAIN SERVER ────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    let body: any;
    try { body = await req.json(); } catch { body = {}; }

    const matchId = body?.match_id;
    const scorecardData = body?.scorecard_data;

    const RULES = await fetchScoringRules(supabase);

    // Gather all API keys (primary + backups)
    const { data: apiKeySetting } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "cricketdata_api_key")
      .single();

    const apiKeys = {
      cricketdata: apiKeySetting?.value || Deno.env.get("CRICKETDATA_API_KEY") || "",
      cricapiBackup: Deno.env.get("CRICAPI_BACKUP_KEY") || "",
      sportmonks: Deno.env.get("SPORTMONKS_API_KEY") || "",
    };

    const configuredProviders = [
      apiKeys.cricketdata ? "CricketData" : null,
      apiKeys.cricapiBackup ? "CricAPI-Backup" : null,
      apiKeys.sportmonks ? "SportMonks" : null,
    ].filter(Boolean);
    console.log(`🔑 Configured API providers: ${configuredProviders.join(", ") || "none"}`);

    // If no match_id provided, auto-discover all live matches
    if (!matchId) {
      const { data: liveMatches, error: liveErr } = await supabase
        .from("matches")
        .select("id, cricket_api_match_id")
        .eq("status", "live");

      if (liveErr) throw liveErr;
      if (!liveMatches || liveMatches.length === 0) {
        return new Response(
          JSON.stringify({ success: true, message: "No live matches found", matches_processed: 0, providers: configuredProviders }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const totalResults = { matches_processed: 0, total_players_updated: 0, total_events: 0, providers_used: [] as string[] };
      for (const m of liveMatches) {
        try {
          const result = await processMatch(supabase, m.id, RULES, apiKeys);
          totalResults.matches_processed++;
          totalResults.total_players_updated += result.players_updated;
          totalResults.total_events += result.events_created;
          if (result.provider && !totalResults.providers_used.includes(result.provider)) {
            totalResults.providers_used.push(result.provider);
          }
        } catch (e: any) {
          console.error(`Error processing match ${m.id}:`, e.message);
        }
      }

      return new Response(
        JSON.stringify({ success: true, ...totalResults, configured_providers: configuredProviders }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Single match mode
    const result = await processMatch(supabase, matchId, RULES, apiKeys, scorecardData);

    return new Response(
      JSON.stringify({
        success: true,
        players_updated: result.players_updated,
        events_created: result.events_created,
        provider_used: result.provider,
        configured_providers: configuredProviders,
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
