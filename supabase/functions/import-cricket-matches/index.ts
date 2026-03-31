import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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

    // Get API key - prefer body, fallback to secret
    let apiKey: string | null = null;
    try {
      const body = await req.json();
      apiKey = body.apiKey || null;
    } catch {}
    if (!apiKey) {
      apiKey = Deno.env.get("CRICKETDATA_API_KEY") || null;
    }
    if (!apiKey) throw new Error("Cricket API key not configured");

    // Fetch upcoming matches from CricketData.org
    const apiUrl = `https://api.cricapi.com/v1/matches?apikey=${apiKey}&offset=0`;
    const apiRes = await fetch(apiUrl);
    const apiData = await apiRes.json();

    if (apiData.status !== "success" || !apiData.data) {
      throw new Error(apiData.info || "Failed to fetch matches from CricketData API");
    }

    const matches = apiData.data;
    let imported = 0;
    let skipped = 0;

    for (const m of matches) {
      // Only import cricket matches that haven't started
      if (!m.dateTimeGMT || m.matchStarted === true) {
        skipped++;
        continue;
      }

      const team1Name = m.teamInfo?.[0]?.name || m.teams?.[0] || "TBD";
      const team2Name = m.teamInfo?.[1]?.name || m.teams?.[1] || "TBD";
      const team1Short = m.teamInfo?.[0]?.shortname || team1Name.substring(0, 3).toUpperCase();
      const team2Short = m.teamInfo?.[1]?.shortname || team2Name.substring(0, 3).toUpperCase();
      const team1Logo = m.teamInfo?.[0]?.img || null;
      const team2Logo = m.teamInfo?.[1]?.img || null;

      const matchTime = new Date(m.dateTimeGMT).toISOString();
      // Entry deadline = 30 minutes before match
      const deadlineDate = new Date(new Date(m.dateTimeGMT).getTime() - 30 * 60 * 1000);
      const entryDeadline = deadlineDate.toISOString();

      const league = m.series_id ? (m.name?.split(",")[0] || "Cricket") : "Cricket";
      const venue = m.venue || null;

      // Check if match already exists (by team names + match time)
      const { data: existing } = await supabase
        .from("matches")
        .select("id")
        .eq("team1_name", team1Name)
        .eq("team2_name", team2Name)
        .eq("match_time", matchTime)
        .maybeSingle();

      if (existing) {
        skipped++;
        continue;
      }

      const { error: insertErr } = await supabase.from("matches").insert({
        team1_name: team1Name,
        team2_name: team2Name,
        team1_short: team1Short,
        team2_short: team2Short,
        team1_logo: team1Logo,
        team2_logo: team2Logo,
        league: league,
        match_time: matchTime,
        entry_deadline: entryDeadline,
        venue: venue,
        sport: "cricket",
        status: "upcoming",
        created_by: user.id,
      });

      if (insertErr) {
        console.error("Insert error:", insertErr);
        skipped++;
      } else {
        imported++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, imported, skipped, total: matches.length }),
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
