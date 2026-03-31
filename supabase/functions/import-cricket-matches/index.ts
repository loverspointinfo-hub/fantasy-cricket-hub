import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

    const body = await req.json();
    const matchesData = body.matches;

    if (!matchesData || !Array.isArray(matchesData) || matchesData.length === 0) {
      throw new Error("No match data provided. The client should fetch from the API and send the data here.");
    }

    let imported = 0;
    let skipped = 0;

    for (const m of matchesData) {
      // Validate required fields
      if (!m.team1_name || !m.team2_name || !m.match_time) {
        skipped++;
        continue;
      }

      // Check if match already exists (by team names + match time)
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

      const { error: insertErr } = await supabase.from("matches").insert({
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
      });

      if (insertErr) {
        console.error("Insert error:", insertErr);
        skipped++;
      } else {
        imported++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, imported, skipped, total: matchesData.length }),
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
