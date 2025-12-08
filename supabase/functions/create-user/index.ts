import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.1";

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const { email, password, name, phone, role, team_id, region_id } = body as {
      email: string; password: string; name: string; phone?: string; role: "tl" | "dsr"; team_id?: string | null; region_id?: string | null;
    };

    if (!email || !password || !name || !role) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }

    // Create auth user (confirmed immediately)
    const { data: userCreate, error: userErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name, phone }
    });
    if (userErr) throw userErr;

    const userId = userCreate.user.id;

    // Create profile
    const { error: profileErr } = await supabase.from("profiles").insert({ user_id: userId, full_name: name, phone, team_id: team_id ?? null });
    if (profileErr) throw profileErr;

    // Assign role
    const appRole = role === "tl" ? "team_leader" : "dsr";
    const { error: roleErr } = await supabase.from("user_roles").insert({ user_id: userId, role: appRole });
    if (roleErr) throw roleErr;

    // Note: dsrs table doesn't exist in schema, DSR is determined by user_roles table

    return new Response(JSON.stringify({ ok: true, user_id: userId }), { headers: { "Content-Type": "application/json" } });
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
