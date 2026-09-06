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

function isRateLimitError(message: string) {
  return /rate limit|over_email_send_rate_limit|429/i.test(message || "");
}

function isAlreadyRegisteredError(message: string) {
  return /already|registered|exists/i.test(message || "");
}

async function findAuthUserIdByEmail(
  admin: ReturnType<typeof createClient>,
  email: string,
): Promise<string | null> {
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) throw error;
    const found = (data.users || []).find(
      (u) => (u.email || "").toLowerCase() === email,
    );
    if (found) return found.id;
    if (!data.users || data.users.length < 200) break;
  }
  return null;
}

async function ensureAuthUser(
  admin: ReturnType<typeof createClient>,
  email: string,
  firstName: string | null,
  lastName: string | null,
): Promise<{ userId: string; created: boolean }> {
  const existingId = await findAuthUserIdByEmail(admin, email);
  if (existingId) return { userId: existingId, created: false };

  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: {
      first_name: firstName,
      last_name: lastName,
    },
  });

  if (error) {
    if (isAlreadyRegisteredError(error.message || "")) {
      const id = await findAuthUserIdByEmail(admin, email);
      if (id) return { userId: id, created: false };
    }
    throw error;
  }

  const userId = data.user?.id;
  if (!userId) throw new Error("Auth uporabnik ni bil ustvarjen.");
  return { userId, created: true };
}

async function makeActionLink(
  admin: ReturnType<typeof createClient>,
  email: string,
  redirectTo: string,
  type: "invite" | "recovery",
) {
  const { data, error } = await admin.auth.admin.generateLink({
    type,
    email,
    options: { redirectTo },
  });
  if (error) throw error;
  return data.properties?.action_link || null;
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
  let emailed = false;
  let invited = false;
  let resent = false;
  let actionLink: string | null = null;
  let rateLimited = false;

  try {
    if (!authUserId) {
      const { data: invitedUser, error: inviteError } = await admin.auth.admin
        .inviteUserByEmail(email, {
          data: {
            first_name: trainer.first_name,
            last_name: trainer.last_name,
          },
          redirectTo,
        });

      if (!inviteError && invitedUser.user?.id) {
        authUserId = invitedUser.user.id;
        invited = true;
        emailed = true;
      } else {
        const msg = inviteError?.message || "";
        if (inviteError && !isAlreadyRegisteredError(msg) && !isRateLimitError(msg)) {
          return json({ error: msg }, 400);
        }
        if (isRateLimitError(msg)) rateLimited = true;

        const ensured = await ensureAuthUser(
          admin,
          email,
          trainer.first_name,
          trainer.last_name,
        );
        authUserId = ensured.userId;
      }

      const { error: linkError } = await admin
        .from("trainers")
        .update({ user_id: authUserId, email })
        .eq("id", trainerId);

      if (linkError) {
        return json({
          error:
            "Račun je ustvarjen, povezava v trainers pa ni uspela: " +
            linkError.message,
        }, 500);
      }
    }

    if (!emailed) {
      const { error: resetError } = await admin.auth.resetPasswordForEmail(
        email,
        { redirectTo },
      );
      if (!resetError) {
        emailed = true;
        resent = true;
      } else if (isRateLimitError(resetError.message || "")) {
        rateLimited = true;
      }
    }

    if (!emailed) {
      actionLink = await makeActionLink(admin, email, redirectTo, "recovery");
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (isRateLimitError(message)) {
      rateLimited = true;
    } else {
      return json({ error: message }, 400);
    }
  }

  if (!emailed && !actionLink) {
    try {
      actionLink = await makeActionLink(admin, email, redirectTo, "recovery");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return json({
        error: rateLimited
          ? "Preveč e-pošt v kratkem času (Supabase omejitev). Počakajte približno 1 uro in poskusite znova."
          : message,
        rateLimited,
      }, 400);
    }
  }

  const message = emailed
    ? (invited
      ? `Povabilo je poslano na ${email}. Trener nastavi geslo prek povezave v e-pošti.`
      : `Na ${email} smo poslali povezavo za geslo.`)
    : (rateLimited
      ? `E-pošta je začasno omejena (preveč pošiljanj). Račun je pripravljen — spodaj kopirajte povezavo in jo pošljite trenerju (npr. WhatsApp).`
      : `Račun je pripravljen. Spodaj kopirajte povezavo in jo pošljite na ${email}.`);

  return json({
    ok: true,
    email,
    invited,
    resent,
    emailed,
    rateLimited,
    actionLink,
    message,
  });
});
