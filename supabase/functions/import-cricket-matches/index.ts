import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Default contest templates to auto-create for each imported match
const DEFAULT_CONTESTS = [
  { name: "Mega Contest", type: "mega", entry_fee: 49, prize_pool: 10000, max_entries: 500, is_guaranteed: true, max_teams_per_user: 5, prize_breakdown: [
    { rank: 1, prize: 3000 }, { rank: 2, prize: 1500 }, { rank: 3, prize: 750 },
    { rank_from: 4, rank_to: 10, prize: 200 }, { rank_from: 11, rank_to: 25, prize: 100 },
    { rank_from: 26, rank_to: 50, prize: 50 }
  ]},
  { name: "Head-to-Head", type: "h2h", entry_fee: 50, prize_pool: 90, max_entries: 2, is_guaranteed: false, max_teams_per_user: 1, prize_breakdown: [
    { rank: 1, prize: 90 }
  ]},
  { name: "Small League", type: "mega", entry_fee: 25, prize_pool: 500, max_entries: 25, is_guaranteed: false, max_teams_per_user: 2, prize_breakdown: [
    { rank: 1, prize: 250 }, { rank: 2, prize: 125 }, { rank: 3, prize: 75 }, { rank_from: 4, rank_to: 5, prize: 25 }
  ]},
  { name: "Winner Takes All", type: "winner_takes_all", entry_fee: 99, prize_pool: 1000, max_entries: 15, is_guaranteed: false, max_teams_per_user: 1, prize_breakdown: [
    { rank: 1, prize: 1000 }
  ]},
  { name: "Practice Contest", type: "practice", entry_fee: 0, prize_pool: 0, max_entries: 100, is_guaranteed: false, max_teams_per_user: 1, prize_breakdown: []},
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) throw new Error("Unauthorized");

    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Admin access required");

    let body;
    try {
      body = await req.json();
    } catch {
      throw new Error("Invalid request body");
    }
    const matchesData = body?.matches;
    const autoCreateContests = body?.auto_create_contests !== false; // default true

    if (!matchesData || !Array.isArray(matchesData) || matchesData.length === 0) {
      throw new Error("No match data provided");
    }

    let imported = 0;
    let skipped = 0;
    let contestsCreated = 0;

    for (const m of matchesData) {
      if (!m.team1_name || !m.team2_name || !m.match_time) {
        skipped++;
        continue;
      }

      // Check if match already exists
      const { data: existing } = await supabase
        .from("matches")
        .select("id")
        .eq("team1_name", m.team1_name)
        .eq("team2_name", m.team2_name)
        .eq("match_time", m.match_time)
        .maybeSingle();

      if (existing) {
        skipped++;
        continue;
      }

      const { data: newMatch, error: insertErr } = await supabase.from("matches").insert({
        team1_name: m.team1_name,
        team2_name: m.team2_name,
        team1_short: m.team1_short || m.team1_name.substring(0, 3).toUpperCase(),
        team2_short: m.team2_short || m.team2_name.substring(0, 3).toUpperCase(),
        team1_logo: m.team1_logo || null,
        team2_logo: m.team2_logo || null,
        league: m.league || "Cricket",
        match_time: m.match_time,
        entry_deadline: m.entry_deadline || new Date(new Date(m.match_time).getTime() - 30 * 60 * 1000).toISOString(),
        venue: m.venue || null,
        sport: "cricket",
        status: "upcoming",
        created_by: user.id,
      }).select("id").single();

      if (insertErr) {
        console.error("Insert error:", insertErr);
        skipped++;
      } else {
        imported++;

        // Auto-create default contests for this match
        if (autoCreateContests && newMatch) {
          for (const template of DEFAULT_CONTESTS) {
            const { error: contestErr } = await supabase.from("contests").insert({
              match_id: newMatch.id,
              name: template.name,
              type: template.type,
              entry_fee: template.entry_fee,
              prize_pool: template.prize_pool,
              max_entries: template.max_entries,
              is_guaranteed: template.is_guaranteed,
              max_teams_per_user: template.max_teams_per_user,
              prize_breakdown: template.prize_breakdown,
              created_by: user.id,
              status: "open",
              current_entries: 0,
            });
            if (!contestErr) contestsCreated++;
            else console.error("Contest create error:", contestErr);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, imported, skipped, contests_created: contestsCreated, total: matchesData.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Error:", err.message);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
