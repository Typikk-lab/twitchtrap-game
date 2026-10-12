import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function allowedOrigins(): Set<string> {
  const configured = Deno.env.get("ARCADE_ALLOWED_ORIGINS");
  return new Set(
    (configured
      ? configured.split(",")
      : ["http://localhost:5173", "http://127.0.0.1:5173"])
      .map((origin) => origin.trim())
      .filter(Boolean),
  );
}

function respond(
  req: Request,
  body: Record<string, unknown>,
  status = 200,
): Response {
  const origin = req.headers.get("origin");
  const headers = new Headers(corsHeaders);

  if (origin && allowedOrigins().has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Vary", "Origin");
  }

  return new Response(JSON.stringify(body), { status, headers });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    const origin = req.headers.get("origin");
    if (origin && !allowedOrigins().has(origin)) {
      return respond(req, { error: "Origin not allowed" }, 403);
    }
    return new Response(null, {
      status: 204,
      headers: {
        ...corsHeaders,
        ...(origin ? { "Access-Control-Allow-Origin": origin, "Vary": "Origin" } : {}),
      },
    });
  }

  if (req.method !== "POST") {
    return respond(req, { error: "Method not allowed" }, 405);
  }

  const origin = req.headers.get("origin");
  if (origin && !allowedOrigins().has(origin)) {
    return respond(req, { error: "Origin not allowed" }, 403);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return respond(req, { error: "Request body must be valid JSON" }, 400);
  }

  const challengeId =
    typeof body === "object" && body !== null && "challenge_id" in body
      ? (body as Record<string, unknown>).challenge_id
      : null;

  if (
    typeof challengeId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(challengeId)
  ) {
    return respond(req, { error: "A valid challenge_id is required" }, 400);
  }

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !serviceKey) {
    console.error("Missing server-side Supabase environment configuration");
    return respond(req, { error: "Server configuration unavailable" }, 500);
  }

  try {
    const supabase = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await supabase.rpc("activate_arcade_challenge", {
      p_challenge_id: challengeId,
    });

    if (error) {
      console.error("Challenge activation RPC failed:", error.message);
      return respond(req, { error: "Could not activate challenge" }, 400);
    }

    const challenge = Array.isArray(data) ? data[0] : null;
    if (
      !challenge?.challenge_id ||
      !challenge.activated_at ||
      !challenge.expires_at ||
      !challenge.game_rules_version
    ) {
      console.error("Challenge activation returned an unexpected result");
      return respond(req, { error: "Invalid activation response" }, 500);
    }

    return respond(req, { challenge });
  } catch (error) {
    console.error("Challenge activation failed:", error);
    return respond(req, { error: "Internal server error" }, 500);
  }
});
