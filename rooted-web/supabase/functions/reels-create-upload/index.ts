import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Starts a reel upload. The app calls this (signed in), gets back a one-time
// Mux upload address, and sends the video straight to Mux. The reel row is
// created here as 'uploading'; mux-webhook flips it to 'ready' once Mux has
// processed the video.
//
// Secrets needed: MUX_TOKEN_ID, MUX_TOKEN_SECRET (Mux dashboard > Settings > API Access Tokens).

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

const MAX_UPLOADS_PER_HOUR = 10;

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
    payload = {};
  }
  const caption = typeof payload?.caption === "string" ? payload.caption.trim().slice(0, 500) : "";

  const muxId = Deno.env.get("MUX_TOKEN_ID");
  const muxSecret = Deno.env.get("MUX_TOKEN_SECRET");
  if (!muxId || !muxSecret) {
    console.error("MUX_TOKEN_ID / MUX_TOKEN_SECRET are not set.");
    return json({ ok: false, error: "Reels aren't set up yet. Please try again later." }, 500);
  }

  // Simple rate limit so one account can't flood uploads.
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("reels")
    .select("id", { count: "exact", head: true })
    .eq("author_auth_id", userId)
    .gte("created_at", since);
  if ((count ?? 0) >= MAX_UPLOADS_PER_HOUR) {
    return json({ ok: false, error: "You've uploaded a lot of reels in the last hour. Please try again later." }, 429);
  }

  const reelId = crypto.randomUUID();

  let upload: { id: string; url: string };
  try {
    const res = await fetch("https://api.mux.com/video/v1/uploads", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + btoa(`${muxId}:${muxSecret}`),
      },
      body: JSON.stringify({
        cors_origin: "*",
        new_asset_settings: {
          playback_policy: ["public"],
          video_quality: "basic",
          passthrough: reelId,
        },
      }),
    });
    const body = await res.json();
    if (!res.ok || !body?.data?.id || !body?.data?.url) {
      console.error("Mux upload creation failed:", res.status, JSON.stringify(body));
      return json({ ok: false, error: "Couldn't start the upload. Please try again." }, 502);
    }
    upload = { id: body.data.id, url: body.data.url };
  } catch (e) {
    console.error("Mux request error:", e);
    return json({ ok: false, error: "Couldn't start the upload. Please try again." }, 502);
  }

  const { error: insertError } = await supabase.from("reels").insert({
    id: reelId,
    author_auth_id: userId,
    caption: caption || null,
    mux_upload_id: upload.id,
    status: "uploading",
  });
  if (insertError) {
    console.error("Couldn't save reel:", insertError);
    return json({ ok: false, error: "Something went wrong. Please try again." }, 500);
  }

  return json({ ok: true, reelId, uploadUrl: upload.url });
});
