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

    // Fetch pending scheduled notifications that are due
    const { data: pending, error: fetchErr } = await supabase
      .from("scheduled_notifications")
      .select("*")
      .eq("is_sent", false)
      .lte("scheduled_at", new Date().toISOString())
      .limit(20);

    if (fetchErr) throw fetchErr;
    if (!pending || pending.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let processed = 0;

    for (const notif of pending) {
      // Get target users based on segment
      let userIds: string[] = [];
      const segment = notif.target_segment || "all";

      if (segment === "all") {
        const { data: profiles } = await supabase.from("profiles").select("id");
        userIds = (profiles || []).map((p: any) => p.id);
      } else if (segment === "active") {
        // Users who joined a contest in the last 7 days
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const { data: entries } = await supabase
          .from("contest_entries")
          .select("user_id")
          .gte("created_at", sevenDaysAgo);
        userIds = [...new Set((entries || []).map((e: any) => e.user_id))];
      } else if (segment === "new") {
        // Users who joined in the last 30 days
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id")
          .gte("created_at", thirtyDaysAgo);
        userIds = (profiles || []).map((p: any) => p.id);
      } else if (segment === "whale") {
        // Users with deposit_balance > 500
        const { data: wallets } = await supabase
          .from("wallets")
          .select("user_id")
          .gt("deposit_balance", 500);
        userIds = (wallets || []).map((w: any) => w.user_id);
      } else if (segment === "inactive") {
        // Users who haven't joined any contest in the last 14 days
        const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
        const { data: allProfiles } = await supabase.from("profiles").select("id");
        const { data: activeEntries } = await supabase
          .from("contest_entries")
          .select("user_id")
          .gte("created_at", fourteenDaysAgo);
        const activeSet = new Set((activeEntries || []).map((e: any) => e.user_id));
        userIds = (allProfiles || []).filter((p: any) => !activeSet.has(p.id)).map((p: any) => p.id);
      }

      if (userIds.length > 0) {
        // Insert notifications in batches
        const batchSize = 100;
        for (let i = 0; i < userIds.length; i += batchSize) {
          const batch = userIds.slice(i, i + batchSize).map(uid => ({
            user_id: uid,
            title: notif.title,
            message: notif.message,
            type: notif.type,
          }));
          await supabase.from("notifications").insert(batch);
        }
      }

      // Mark as sent
      await supabase
        .from("scheduled_notifications")
        .update({ is_sent: true })
        .eq("id", notif.id);

      processed++;
    }

    return new Response(
      JSON.stringify({ processed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Error:", err.message);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
