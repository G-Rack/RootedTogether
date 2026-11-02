import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Receives Mux's notifications and keeps the reels and course-lessons tables up to date:
//   video.upload.asset_created -> reel is 'processing' (we learn the asset id)
//   video.asset.ready          -> reel is 'ready' (playback id, length, shape)
//   video.asset.errored / video.upload.errored / video.upload.cancelled -> 'errored'
// Reels longer than MAX_SECONDS are removed (the app also checks this up front).
//
// Setup: in Mux (Settings > Webhooks) add this function's URL and copy the
// "signing secret" into the Supabase secret MUX_WEBHOOK_SECRET.
// This function must be deployed with JWT verification OFF (Mux can't send a Supabase JWT);
// every request is instead verified with the Mux signature below.

const MAX_SECONDS = 95;
const TOLERANCE_SECONDS = 5 * 60;

function hex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function verifySignature(rawBody: string, header: string | null, secret: string): Promise<boolean> {
  if (!header) return false;
  const parts = Object.fromEntries(
    header.split(",").map((p) => {
      const i = p.indexOf("=");
      return [p.slice(0, i).trim(), p.slice(i + 1).trim()];
    }),
  );
  const t = parts["t"];
  const v1 = parts["v1"];
  if (!t || !v1) return false;
  if (Math.abs(Date.now() / 1000 - Number(t)) > TOLERANCE_SECONDS) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${rawBody}`)));
  return safeEqual(sig, v1);
}

async function deleteMuxAsset(assetId: string) {
  const id = Deno.env.get("MUX_TOKEN_ID");
  const secret = Deno.env.get("MUX_TOKEN_SECRET");
  if (!id || !secret) return;
  try {
    await fetch(`https://api.mux.com/video/v1/assets/${assetId}`, {
      method: "DELETE",
      headers: { Authorization: "Basic " + btoa(`${id}:${secret}`) },
    });
  } catch (e) {
    console.error("Couldn't delete Mux asset:", e);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed.", { status: 405 });

  const secret = Deno.env.get("MUX_WEBHOOK_SECRET");
  if (!secret) {
    console.error("MUX_WEBHOOK_SECRET is not set.");
    return new Response("Not configured.", { status: 500 });
  }

  const raw = await req.text();
  const ok = await verifySignature(raw, req.headers.get("mux-signature"), secret);
  if (!ok) return new Response("Bad signature.", { status: 400 });

  let event: any;
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response("Bad JSON.", { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const type: string = event?.type || "";
  const data = event?.data || {};

  // Reels and course lessons both use Mux. Lessons are tagged "lesson:<id>" in
  // the passthrough; anything else is a reel. Events that carry no passthrough
  // (upload events, errors) are applied to both tables by Mux id.
  const LESSON_PREFIX = "lesson:";
  const BOTH = ["reels", "offering_lessons"];

  try {
    if (type === "video.upload.asset_created") {
      for (const table of BOTH) {
        const { error } = await supabase
          .from(table)
          .update({ mux_asset_id: data.asset_id, status: "processing" })
          .eq("mux_upload_id", data.id)
          .eq("status", "uploading");
        if (error) throw error;
      }
    } else if (type === "video.asset.ready") {
      const duration = Number(data.duration) || 0;
      const playbackId = data.playback_ids?.[0]?.id || null;
      const passthrough = typeof data.passthrough === "string" ? data.passthrough : null;

      if (passthrough && passthrough.startsWith(LESSON_PREFIX)) {
        const lessonId = passthrough.slice(LESSON_PREFIX.length);
        const { error } = await supabase
          .from("offering_lessons")
          .update({
            status: playbackId ? "ready" : "errored",
            mux_asset_id: data.id,
            mux_playback_id: playbackId,
            duration_seconds: duration || null,
          })
          .eq("id", lessonId);
        if (error) throw error;
      } else {
        const reelId = passthrough;
        const tooLong = duration > MAX_SECONDS;
        const patch = tooLong
          ? { status: "removed", mux_asset_id: data.id }
          : {
              status: playbackId ? "ready" : "errored",
              mux_asset_id: data.id,
              mux_playback_id: playbackId,
              duration_seconds: duration || null,
              aspect_ratio: data.aspect_ratio || null,
              ready_at: new Date().toISOString(),
            };
        let q = supabase.from("reels").update(patch).neq("status", "removed");
        q = reelId ? q.eq("id", reelId) : q.eq("mux_asset_id", data.id);
        const { error } = await q;
        if (error) throw error;
        if (tooLong) await deleteMuxAsset(data.id);
      }
    } else if (type === "video.asset.errored") {
      for (const table of BOTH) {
        const { error } = await supabase
          .from(table)
          .update({ status: "errored" })
          .eq("mux_asset_id", data.id)
          .neq("status", "removed");
        if (error) throw error;
      }
    } else if (type === "video.upload.errored" || type === "video.upload.cancelled") {
      for (const table of BOTH) {
        const { error } = await supabase
          .from(table)
          .update({ status: "errored" })
          .eq("mux_upload_id", data.id)
          .in("status", ["uploading", "processing"]);
        if (error) throw error;
      }
    }
  } catch (e) {
    console.error("Webhook handling failed:", type, e);
    // Non-2xx so Mux retries delivery.
    return new Response("Failed.", { status: 500 });
  }

  return new Response("ok", { status: 200 });
});
