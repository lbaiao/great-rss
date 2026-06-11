import { createClient } from "jsr:@supabase/supabase-js@2";

const secretKeysJson = Deno.env.get("SUPABASE_SECRET_KEYS");
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const secretKey = resolveDefaultSecretKey(secretKeysJson);

if (!supabaseUrl || !secretKey) {
  throw new Error("SUPABASE_URL and the default Supabase secret key are required.");
}

const supabaseAdmin = createClient(supabaseUrl, secretKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return json({ error: "Method not allowed." }, 405);
  }

  const token = getBearerToken(request);
  if (!token) {
    return json({ error: "Sign in required." }, 401);
  }

  const { data, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !data.user) {
    return json({ error: "Sign in required." }, 401);
  }

  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(data.user.id, false);
  if (deleteError) {
    return json({ error: deleteError.message }, 500);
  }

  return json({ ok: true });
});

function getBearerToken(request: Request) {
  const authHeader = request.headers.get("Authorization") ?? "";
  return authHeader.replace(/^Bearer\s+/i, "").trim();
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function resolveDefaultSecretKey(secretKeysJson: string | undefined) {
  if (!secretKeysJson) {
    return null;
  }

  try {
    const parsed = JSON.parse(secretKeysJson) as { default?: string };
    return parsed.default ?? null;
  } catch {
    return null;
  }
}
