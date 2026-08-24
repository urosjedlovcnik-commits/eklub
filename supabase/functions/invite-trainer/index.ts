import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isAllowedRedirect(url: string) {
  try {
    const u = new URL(url);
    if (!u.pathname.endsWith("/reset-password.html")) return false;
    return (
      u.hostname === "eklub.vercel.app" ||
      u.hostname === "localhost" ||
      u.hostname.endsWith(".vercel.app")
    );
  } catch {
    return false;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Uporabite POST." }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const authHeader = req.headers.get("Authorization") ?? "";

  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return json({ error: "Manjka prijava." }, 401);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) {
    return json({ error: "Neveljavna seja." }, 401);
  }

  const { data: caller, error: callerError } = await userClient
    .from("trainers")
    .select("id, role")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (callerError || caller?.role !== "super_admin") {
    return json({ error: "Samo super admin lahko pošlje povabilo." }, 403);
  }

  let payload: { trainerId?: string; redirectTo?: string } = {};
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Neveljavno telo zahteve." }, 400);
  }

  const trainerId = String(payload.trainerId || "").trim();
  if (!trainerId) {
    return json({ error: "Manjka trainerId." }, 400);
  }

  const redirectTo = isAllowedRedirect(payload.redirectTo || "")
    ? payload.redirectTo!
    : "https://eklub.vercel.app/reset-password.html";

  const admin = createClient(supabaseUrl, serviceKey);

  const { data: trainer, error: trainerError } = await admin
    .from("trainers")
    .select("id, email, first_name, last_name, user_id, is_deleted")
    .eq("id", trainerId)
    .maybeSingle();

  if (trainerError || !trainer) {
    return json({ error: "Trener ni najden." }, 404);
  }
  if (trainer.is_deleted) {
    return json({ error: "Izbrisanega trenerja ni mogoče povabiti." }, 400);
  }

  const email = String(trainer.email || "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return json({ error: "Trener nima veljavnega e-poštnega naslova." }, 400);
  }

  let authUserId = trainer.user_id as string | null;
  let invited = false;
  let resent = false;

  if (!authUserId) {
    const { data: invitedUser, error: inviteError } = await admin.auth.admin
      .inviteUserByEmail(email, {
        data: {
          first_name: trainer.first_name,
          last_name: trainer.last_name,
        },
        redirectTo,
      });

    if (inviteError) {
      const already =
        /already|registered|exists/i.test(inviteError.message || "");
      if (!already) {
        return json({ error: inviteError.message }, 400);
      }

      const { data: list, error: listError } = await admin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      if (listError) {
        return json({ error: listError.message }, 400);
      }
      const existing = list.users.find(
        (u) => (u.email || "").toLowerCase() === email,
      );
      if (!existing) {
        return json({
          error: "Račun že obstaja, a ga ni bilo mogoče najti. Poskusite znova.",
        }, 400);
      }
      authUserId = existing.id;
    } else {
      authUserId = invitedUser.user?.id ?? null;
      invited = true;
    }

    if (!authUserId) {
      return json({ error: "Auth uporabnik ni bil ustvarjen." }, 500);
    }

    const { error: linkError } = await admin
      .from("trainers")
      .update({ user_id: authUserId, email })
      .eq("id", trainerId);

    if (linkError) {
      return json({ error: "Račun je ustvarjen, povezava v trainers pa ni uspela: " + linkError.message }, 500);
    }
  }

  if (!invited) {
    const { error: resetError } = await admin.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    if (resetError) {
      return json({
        error: "Račun je povezan, pošiljanje e-pošte pa ni uspelo: " + resetError.message,
        linked: true,
      }, 400);
    }
    resent = true;
  }

  return json({
    ok: true,
    email,
    invited,
    resent,
    message: invited
      ? `Povabilo je poslano na ${email}. Trener nastavi geslo prek povezave v e-pošti.`
      : `Račun je že obstajal — na ${email} smo poslali povezavo za geslo.`,
  });
});
