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

    const { data, error } = await supabase.rpc("issue_arcade_challenge");

    if (error) {
      console.error("Challenge issuance RPC failed:", error.message);
      return respond(req, { error: "Could not issue challenge" }, 500);
    }

    const challenge = Array.isArray(data) ? data[0] : null;
    if (
      !challenge?.challenge_id ||
      challenge.seed === undefined ||
      !challenge.expires_at ||
      !challenge.game_rules_version
    ) {
      console.error("Challenge issuance returned an unexpected result");
      return respond(req, { error: "Invalid challenge response" }, 500);
    }

    return respond(req, { challenge });
  } catch (error) {
    console.error("Challenge issuance failed:", error);
    return respond(req, { error: "Internal server error" }, 500);
  }
});
