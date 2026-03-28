import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const BREVO_API_URL = "https://api.brevo.com/v3/contacts";
const MAX_ATTEMPTS = 5;
const BACKOFF_BASE_MS = 30_000; // 30 seconds

Deno.serve(async (_req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const brevoApiKey = Deno.env.get("BREVO_API_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("[brevo-sync] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return new Response(JSON.stringify({ error: "Server misconfigured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!brevoApiKey) {
    console.error("[brevo-sync] BREVO_API_KEY not set");
    return new Response(JSON.stringify({ error: "BREVO_API_KEY not set" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Fetch pending/failed items ready for processing
  const now = new Date().toISOString();
  const { data: pending, error: fetchErr } = await supabase
    .from("brevo_sync_log")
    .select("*")
    .in("status", ["pending", "failed"])
    .lt("attempts", MAX_ATTEMPTS)
    .or(`next_retry_at.is.null,next_retry_at.lte.${now}`)
    .order("created_at", { ascending: true })
    .limit(10);

  if (fetchErr) {
    console.error("[brevo-sync] Failed to fetch pending items:", fetchErr.message);
    return new Response(JSON.stringify({ error: fetchErr.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!pending || pending.length === 0) {
    return new Response(JSON.stringify({ processed: 0, message: "No pending items" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  let processed = 0;
  let failed = 0;

  for (const item of pending) {
    try {
      // Step 1: Try creating/updating contact in Brevo
      const createRes = await fetch(BREVO_API_URL, {
        method: "POST",
        headers: {
          "api-key": brevoApiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: item.email,
          listIds: [item.list_id],
          attributes: item.attributes || {},
          updateEnabled: true,
        }),
      });

      // Success: 201 (created) or 204 (updated)
      if (createRes.ok || createRes.status === 204) {
        await supabase
          .from("brevo_sync_log")
          .update({
            status: "success",
            attempts: item.attempts + 1,
            processed_at: new Date().toISOString(),
            brevo_response: { status: createRes.status },
          })
          .eq("id", item.id);
        processed++;
        continue;
      }

      // Step 2: Handle duplicate contact (400 "Contact already exist")
      if (createRes.status === 400) {
        const body = await createRes.json().catch(() => null);

        if (body?.message?.includes("Contact already exist")) {
          const addToListRes = await fetch(
            `https://api.brevo.com/v3/contacts/lists/${item.list_id}/contacts/add`,
            {
              method: "POST",
              headers: {
                "api-key": brevoApiKey,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ emails: [item.email] }),
            }
          );

          if (addToListRes.ok) {
            await supabase
              .from("brevo_sync_log")
              .update({
                status: "success",
                attempts: item.attempts + 1,
                processed_at: new Date().toISOString(),
                brevo_response: {
                  status: 200,
                  note: "added_to_list_existing_contact",
                },
              })
              .eq("id", item.id);
            processed++;
            continue;
          }

          // Fall through to retry logic if adding to list also failed
          const addErr = await addToListRes.text().catch(() => "unknown");
          console.error(`[brevo-sync] Failed to add existing contact ${item.email} to list:`, addErr);
        }
      }

      // Step 3: Handle failure — retry or dead-letter
      const newAttempts = item.attempts + 1;
      const errText = await createRes.text().catch(() => "unknown");
      console.error(`[brevo-sync] Item ${item.id} failed (attempt ${newAttempts}): HTTP ${createRes.status} — ${errText}`);

      if (newAttempts >= MAX_ATTEMPTS) {
        await supabase
          .from("brevo_sync_log")
          .update({
            status: "dead_letter",
            attempts: newAttempts,
            last_error: `HTTP ${createRes.status}: ${errText.substring(0, 500)}`,
            processed_at: new Date().toISOString(),
          })
          .eq("id", item.id);
      } else {
        const nextRetry = new Date(
          Date.now() + BACKOFF_BASE_MS * Math.pow(2, newAttempts)
        );
        await supabase
          .from("brevo_sync_log")
          .update({
            status: "failed",
            attempts: newAttempts,
            last_error: `HTTP ${createRes.status}: ${errText.substring(0, 500)}`,
            next_retry_at: nextRetry.toISOString(),
          })
          .eq("id", item.id);
      }
      failed++;
    } catch (networkErr: unknown) {
      const errMsg = networkErr instanceof Error ? networkErr.message : "Unknown network error";
      const newAttempts = item.attempts + 1;
      console.error(`[brevo-sync] Item ${item.id} network error (attempt ${newAttempts}):`, errMsg);

      if (newAttempts >= MAX_ATTEMPTS) {
        await supabase
          .from("brevo_sync_log")
          .update({
            status: "dead_letter",
            attempts: newAttempts,
            last_error: `Network error: ${errMsg}`,
            processed_at: new Date().toISOString(),
          })
          .eq("id", item.id);
      } else {
        const nextRetry = new Date(
          Date.now() + BACKOFF_BASE_MS * Math.pow(2, newAttempts)
        );
        await supabase
          .from("brevo_sync_log")
          .update({
            status: "failed",
            attempts: newAttempts,
            last_error: `Network error: ${errMsg}`,
            next_retry_at: nextRetry.toISOString(),
          })
          .eq("id", item.id);
      }
      failed++;
    }
  }

  console.log(`[brevo-sync] Processed: ${processed}, Failed: ${failed}`);

  return new Response(
    JSON.stringify({ processed, failed, total: pending.length }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});
