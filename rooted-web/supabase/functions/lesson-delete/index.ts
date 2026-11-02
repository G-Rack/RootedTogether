import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Lets a creator delete one of their own course lessons. For a video it also
// removes the video from Mux (so it stops costing storage); for a PDF it
// removes the file from private storage.

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
  const lessonId = typeof payload?.lessonId === "string" ? payload.lessonId : "";
  if (!lessonId) return json({ ok: false, error: "Missing lesson." }, 400);

  const { data: lesson } = await supabase
    .from("offering_lessons")
    .select("id, creator_auth_id, kind, mux_asset_id, mux_upload_id, file_path")
    .eq("id", lessonId)
    .maybeSingle();
  if (!lesson || lesson.creator_auth_id !== userId) {
    return json({ ok: false, error: "That lesson isn't yours to delete." }, 403);
  }

  const muxId = Deno.env.get("MUX_TOKEN_ID");
  const muxSecret = Deno.env.get("MUX_TOKEN_SECRET");
  const auth = muxId && muxSecret ? "Basic " + btoa(`${muxId}:${muxSecret}`) : null;

  if (lesson.kind === "video" && auth) {
    try {
      if (lesson.mux_asset_id) {
        await fetch(`https://api.mux.com/video/v1/assets/${lesson.mux_asset_id}`, {
          method: "DELETE",
          headers: { Authorization: auth },
        });
      } else if (lesson.mux_upload_id) {
        // Upload started but no asset yet: cancel it so nothing is created later.
        await fetch(`https://api.mux.com/video/v1/uploads/${lesson.mux_upload_id}/cancel`, {
          method: "PUT",
          headers: { Authorization: auth },
        });
      }
    } catch (e) {
      console.error("Couldn't delete Mux video (continuing):", e);
    }
  }

  if (lesson.kind === "pdf" && lesson.file_path) {
    const { error: removeError } = await supabase.storage.from("course-files").remove([lesson.file_path]);
    if (removeError) console.error("Couldn't remove PDF (continuing):", removeError);
  }

  const { error } = await supabase.from("offering_lessons").delete().eq("id", lessonId);
  if (error) {
    console.error("Couldn't delete lesson:", error);
    return json({ ok: false, error: "Couldn't delete that lesson. Please try again." }, 500);
  }
  return json({ ok: true });
});
