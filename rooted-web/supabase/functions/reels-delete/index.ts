import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Lets a person delete their own reel: removes the video from Mux (so it stops
// costing storage) and the reel row (likes and comments go with it).

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed." }, 405);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData?.user) return json({ ok: false, error: "Please sign in again." }, 401);
  const userId = userData.user.id;

  let payload: any = {};
  try {
    payload = await req.json();
  } catch {
    return json({ ok: false, error: "Invalid request." }, 400);
  }
  const reelId = typeof payload?.reelId === "string" ? payload.reelId : "";
  if (!reelId) return json({ ok: false, error: "Missing reel." }, 400);

  const { data: reel } = await supabase
    .from("reels")
    .select("id, author_auth_id, mux_asset_id")
    .eq("id", reelId)
    .maybeSingle();
  if (!reel || reel.author_auth_id !== userId) {
    return json({ ok: false, error: "That reel isn't yours to delete." }, 403);
  }

  const muxId = Deno.env.get("MUX_TOKEN_ID");
  const muxSecret = Deno.env.get("MUX_TOKEN_SECRET");
  if (reel.mux_asset_id && muxId && muxSecret) {
    try {
      await fetch(`https://api.mux.com/video/v1/assets/${reel.mux_asset_id}`, {
        method: "DELETE",
        headers: { Authorization: "Basic " + btoa(`${muxId}:${muxSecret}`) },
      });
    } catch (e) {
      console.error("Couldn't delete Mux asset (continuing):", e);
    }
  }

  const { error } = await supabase.from("reels").delete().eq("id", reelId);
  if (error) {
    console.error("Couldn't delete reel:", error);
    return json({ ok: false, error: "Couldn't delete that reel. Please try again." }, 500);
  }
  return json({ ok: true });
});
