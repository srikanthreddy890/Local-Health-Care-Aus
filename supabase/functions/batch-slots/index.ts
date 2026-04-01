import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * Supabase Edge Function: batch-slots
 *
 * Fetches appointment slots for multiple doctors in a single request.
 * Replaces the Next.js API route — callable from both web and mobile.
 *
 * Request body:
 *   { configId, clinicId, doctorIds: string[], date: string }
 *
 * Response:
 *   { results: Record<doctorId, { slots: object[], error?: string }> }
 */

// ── CORS helpers ───────────────────────────────────────────────────────────

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
  "Content-Type": "application/json",
};

function corsResponse(body: string | object, status = 200): Response {
  const json = typeof body === "string" ? body : JSON.stringify(body);
  return new Response(json, { status, headers: CORS_HEADERS });
}

// ── Encryption (Node.js compat — exact same KDF as the Next.js server) ────
// Deno supports Node built-ins via "node:" prefix. Using the same scryptSync +
// AES-256-GCM as lib/customApi/encryption.ts ensures identical key derivation.

import { createDecipheriv, scryptSync } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const SALT = "lhc-api-key-enc-v1";

function getDerivedKey(): Buffer {
  const secret = Deno.env.get("API_KEY_ENCRYPTION_SECRET");
  if (!secret || secret.length < 32) {
    throw new Error("API_KEY_ENCRYPTION_SECRET must be set and at least 32 characters");
  }
  return scryptSync(secret, SALT, 32);
}

function decryptApiKey(ciphertext: string): string | null {
  try {
    const key = getDerivedKey();
    const combined = Buffer.from(ciphertext, "base64");

    const iv = combined.subarray(0, IV_LENGTH);
    const tag = combined.subarray(combined.length - TAG_LENGTH);
    const encrypted = combined.subarray(IV_LENGTH, combined.length - TAG_LENGTH);

    const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString("utf8");
  } catch {
    return null;
  }
}

function isEncryptedValue(value: string): boolean {
  if (!value || value === "[ENCRYPTED]") return false;
  try {
    const buf = Buffer.from(value, "base64");
    return buf.length >= IV_LENGTH + 1 + TAG_LENGTH && value === buf.toString("base64");
  } catch {
    return false;
  }
}

// ── SSRF Protection ────────────────────────────────────────────────────────

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p))) return true;
  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 169 && b === 254)
  );
}

async function validateNotPrivate(hostname: string): Promise<void> {
  // Check if hostname is already an IP
  const ipv4Regex = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
  if (ipv4Regex.test(hostname)) {
    if (isPrivateIPv4(hostname)) throw new Error("Cannot access private/internal addresses");
    return;
  }

  // Resolve DNS using Deno
  try {
    const ips = await Deno.resolveDns(hostname, "A");
    if (ips.length === 0) throw new Error("Could not resolve hostname");
    if (ips.some(isPrivateIPv4)) throw new Error("Cannot access private/internal addresses");
  } catch (e) {
    if (e instanceof Error && e.message.includes("private")) throw e;
    // If DNS resolution fails entirely, allow (external API may use IPv6 only)
  }
}

// ── Build External API Request ─────────────────────────────────────────────

interface ApiConfig {
  endpoint_config: Record<string, Record<string, unknown>> | null;
  field_mappings: Record<string, unknown> | null;
  custom_auth_headers: Record<string, Record<string, string>> | null;
  api_key_encrypted: string | null;
}

interface ExternalApiRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
}

function formatDatetime(date: string, time: string, format: string): string {
  const [y, mo, d] = date.split("-");
  const [h, mi, s] = (time || "00:00:00").split(":");
  return format
    .replace("yyyy", y)
    .replace("MM", mo)
    .replace("dd", d)
    .replace("HH", h)
    .replace("mm", mi)
    .replace("ss", s || "00");
}

function buildExternalApiRequest(
  config: ApiConfig,
  endpointKey: string,
  params: Record<string, unknown> = {},
  decryptedApiKey: string | null = null,
): ExternalApiRequest {
  const endpointConfig = config.endpoint_config;
  if (!endpointConfig?.[endpointKey]) {
    throw new Error(`Endpoint ${endpointKey} not configured`);
  }

  const endpoint = endpointConfig[endpointKey];
  const url = endpoint.url as string;
  const method = (endpoint.method as string) || "GET";
  const auth = endpoint.auth as {
    type?: string; token?: string; header?: string; username?: string; password?: string;
  } | null;
  const headers: Record<string, string> = { ...(endpoint.headers as Record<string, string> || {}) };
  const urlParameters = endpoint.urlParameters as {
    name: string; paramLocation: string; type?: string; defaultValue?: string;
    source?: string; defaultTime?: string; datetimeFormat?: string;
  }[] | null;

  const customAuthHeaders = config.custom_auth_headers;

  // Decrypt API key if not already provided
  let apiKeyDecrypted = decryptedApiKey;
  if (!apiKeyDecrypted && config.api_key_encrypted && isEncryptedValue(config.api_key_encrypted)) {
    apiKeyDecrypted = decryptApiKey(config.api_key_encrypted);
    if (!apiKeyDecrypted) {
      throw new Error("Failed to decrypt API key");
    }
  }

  // Merge custom auth headers
  if (customAuthHeaders?.[endpointKey]) {
    for (const [headerName, headerValue] of Object.entries(customAuthHeaders[endpointKey])) {
      headers[headerName] = headerValue;
    }
  }

  // Reconstruct auth header
  if (auth) {
    if (auth.token === "[ENCRYPTED]" && apiKeyDecrypted) {
      if (auth.type === "bearer") {
        headers["Authorization"] = `Bearer ${apiKeyDecrypted}`;
      } else if (auth.type === "api_key") {
        headers[auth.header || "X-API-Key"] = apiKeyDecrypted;
      }
    } else if (auth.token && auth.token !== "[ENCRYPTED]") {
      throw new Error("Plaintext API tokens are not allowed");
    }
    if (auth.type === "basic" && auth.username) {
      headers["Authorization"] = `Basic ${btoa(`${auth.username}:${auth.password || ""}`)}`;
    }
  }

  // Replace [ENCRYPTED] header values
  for (const [key, value] of Object.entries(headers)) {
    if (value === "[ENCRYPTED]" && apiKeyDecrypted) {
      headers[key] = apiKeyDecrypted;
    }
  }

  // Build URL with parameters
  let finalUrl = url;
  const parsedUrl = new URL(finalUrl);

  if (urlParameters?.length) {
    for (const param of urlParameters) {
      if (!param.name) continue;
      let value = param.defaultValue ?? "";

      const doctorIdValue = params.doctorId ?? params.doctor_id;
      if (param.source === "doctor_id" && doctorIdValue) {
        value = String(doctorIdValue);
      } else if (param.source === "start_date" && params.date) {
        const time = param.defaultTime || "07:00:00";
        value = formatDatetime(String(params.date), time, param.datetimeFormat || "yyyy-MM-dd HH:mm:ss");
      } else if (param.source === "end_date" && params.date) {
        const time = param.defaultTime || "20:00:00";
        value = formatDatetime(String(params.date), time, param.datetimeFormat || "yyyy-MM-dd HH:mm:ss");
      }

      if (!value) continue;

      if (param.paramLocation === "path" && finalUrl.includes(`{${param.name}}`)) {
        finalUrl = finalUrl.replace(`{${param.name}}`, encodeURIComponent(value));
      } else if (!parsedUrl.searchParams.has(param.name)) {
        parsedUrl.searchParams.set(param.name, value);
        finalUrl = parsedUrl.toString();
      }
    }
  }

  // Substitute {doctorId} in path
  const fallbackDoctorId = params.doctorId ?? params.doctor_id;
  if (fallbackDoctorId) {
    finalUrl = finalUrl.replace("{doctorId}", encodeURIComponent(String(fallbackDoctorId)));
  }

  // Build request body (for POST/PUT endpoints)
  const isPostLike = method.toUpperCase() === "POST" || method.toUpperCase() === "PUT";
  if (isPostLike && !headers["Content-Type"] && !headers["content-type"]) {
    headers["Content-Type"] = "application/json";
  }

  let body: string | undefined;
  if (isPostLike && endpoint.requestBody) {
    const requestBody = endpoint.requestBody as { rawJson?: string };
    if (requestBody.rawJson) {
      try {
        const template = JSON.parse(requestBody.rawJson);
        // Inject runtime params into template (matching keys by known field patterns)
        const injected = injectParams(template, params);
        body = JSON.stringify(injected);
      } catch {
        body = requestBody.rawJson;
      }
    } else {
      body = "{}";
    }
  }

  return { url: finalUrl, method, headers, body };
}

/** Inject runtime params into a JSON body template by matching key names. */
function injectParams(
  template: Record<string, unknown>,
  params: Record<string, unknown>,
): Record<string, unknown> {
  const fieldMap: Record<string, string[]> = {
    doctor_id: ["doctorId", "doctor_id", "practitionerId", "practitioner_id", "providerId", "provider_id"],
    slot_id: ["slotId", "slot_id", "appointmentId", "appointment_id", "timeSlotId", "timeslot_id"],
    appointment_date: ["appointmentDate", "appointment_date", "date", "bookingDate"],
    appointment_time: ["appointmentTime", "appointment_time", "time", "startTime", "start_time"],
  };

  const result = { ...template };

  for (const [key, value] of Object.entries(result)) {
    for (const [standardKey, aliases] of Object.entries(fieldMap)) {
      if (key === standardKey || aliases.some((a) => a.toLowerCase() === key.toLowerCase())) {
        const realValue = params[standardKey];
        if (realValue !== undefined && realValue !== null && realValue !== "") {
          if (typeof value === "number" && typeof realValue === "string" && /^\d+$/.test(realValue)) {
            result[key] = parseInt(realValue as string, 10);
          } else {
            result[key] = realValue;
          }
        }
        break;
      }
    }
  }

  for (const [key, value] of Object.entries(result)) {
    if (value === "string") result[key] = "";
  }

  return result;
}

// ── Response Transformation ────────────────────────────────────────────────

function getValueByPath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.replace(/\[(\d+)\]/g, ".$1").split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function transformResponse(
  data: Record<string, unknown>,
  mappings: Record<string, string>,
): Record<string, unknown> {
  const arrayKeys = ["doctors", "appointments", "slots", "data", "results", "items"];
  let items: Record<string, unknown>[] | null = null;

  if (Array.isArray(data)) {
    items = data as Record<string, unknown>[];
  } else {
    for (const key of arrayKeys) {
      if (mappings[key]) {
        items = getValueByPath(data, mappings[key]) as Record<string, unknown>[] | null;
        if (Array.isArray(items)) break;
        items = null;
      }
    }
    if (!items) {
      for (const key of arrayKeys) {
        if (Array.isArray(data[key])) {
          items = data[key] as Record<string, unknown>[];
          break;
        }
      }
    }
  }

  if (!items) return data;

  const mapped = items.map((item) => {
    const result: Record<string, unknown> = {};
    for (const [standardKey, externalPath] of Object.entries(mappings)) {
      if (arrayKeys.includes(standardKey)) continue;
      if (externalPath.startsWith("@request.")) continue;
      const value = getValueByPath(item, externalPath);
      if (value !== undefined) result[standardKey] = value;
    }
    return { ...item, ...result };
  });

  return { data: mapped };
}

function extractSlotArray(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;

  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    for (const key of ["slots", "appointments", "data", "results", "items"]) {
      if (Array.isArray(obj[key])) return obj[key] as unknown[];
    }
    if (obj.data && typeof obj.data === "object" && !Array.isArray(obj.data)) {
      const nested = obj.data as Record<string, unknown>;
      for (const key of ["slots", "appointments", "data", "results", "items"]) {
        if (Array.isArray(nested[key])) return nested[key] as unknown[];
      }
    }
  }

  return [];
}

// ── Config Cache (in-memory, per-isolate) ──────────────────────────────────

const configCache = new Map<string, { value: Record<string, unknown>; expiresAt: number }>();
const CONFIG_TTL_MS = 60_000;

async function getConfigCached(
  configId: string,
  supabase: ReturnType<typeof createClient>,
): Promise<Record<string, unknown> | null> {
  const cached = configCache.get(configId);
  if (cached && Date.now() < cached.expiresAt) return cached.value;

  const { data, error } = await supabase.rpc("get_active_api_config", { p_config_id: configId });
  if (error || !data) return null;

  const config = data as Record<string, unknown>;
  configCache.set(configId, { value: config, expiresAt: Date.now() + CONFIG_TTL_MS });
  return config;
}

// ── Main Handler ───────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return corsResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await req.json();
    const { configId, clinicId, doctorIds, date } = body as {
      configId: string;
      clinicId: string;
      doctorIds: string[];
      date: string;
    };

    // ── Validation ────────────────────────────────────────────────────
    if (!configId || !clinicId || !date) {
      return corsResponse({ error: "configId, clinicId, and date are required" }, 400);
    }

    if (!Array.isArray(doctorIds) || doctorIds.length === 0) {
      return corsResponse({ error: "doctorIds must be a non-empty array" }, 400);
    }

    const MAX_BATCH_SIZE = 50;
    if (doctorIds.length > MAX_BATCH_SIZE) {
      return corsResponse({ error: `Batch size exceeds maximum of ${MAX_BATCH_SIZE}` }, 400);
    }

    // ── Supabase client (service role for config access) ──────────────
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return corsResponse({ error: "Server misconfigured" }, 500);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // ── Fetch config ONCE (cached) ────────────────────────────────────
    const config = await getConfigCached(configId, supabase);

    if (!config) {
      return corsResponse({ error: "Configuration not found or inactive" }, 404);
    }

    if (config.clinic_id !== clinicId) {
      return corsResponse({ error: "Config does not belong to this clinic" }, 403);
    }

    // ── Decrypt API key ONCE ──────────────────────────────────────────
    let decryptedApiKey: string | null = null;
    const encryptedKey = config.api_key_encrypted as string | null;
    if (encryptedKey && isEncryptedValue(encryptedKey)) {
      decryptedApiKey = decryptApiKey(encryptedKey);
    }

    // ── SSRF check ONCE ───────────────────────────────────────────────
    const typedConfig = config as unknown as ApiConfig;
    const testRequest = buildExternalApiRequest(
      typedConfig,
      "get_appointments",
      { doctorId: doctorIds[0], date },
      decryptedApiKey,
    );
    const targetUrl = new URL(testRequest.url);
    await validateNotPrivate(targetUrl.hostname);

    // ── Field mappings (resolved once) ────────────────────────────────
    const fieldMappings = config.field_mappings as Record<string, unknown> | null;
    const mappings = fieldMappings?.get_appointments as Record<string, Record<string, string>> | null;
    const responseMappings = mappings?.response;

    // ── Fan out all doctor slot fetches in parallel ────────────────────
    const results: Record<string, { slots: unknown[]; error?: string }> = {};

    const fetchPromises = doctorIds.map(async (doctorId) => {
      try {
        const apiRequest = buildExternalApiRequest(
          typedConfig,
          "get_appointments",
          { doctorId, date },
          decryptedApiKey,
        );

        const response = await fetch(apiRequest.url, {
          method: apiRequest.method,
          headers: apiRequest.headers,
          ...(apiRequest.body ? { body: apiRequest.body } : {}),
          signal: AbortSignal.timeout(15_000),
        });

        const responseText = await response.text();

        let responseData: unknown;
        try {
          responseData = JSON.parse(responseText);
        } catch {
          responseData = { _rawText: responseText };
        }

        if (!response.ok) {
          results[doctorId] = {
            slots: [],
            error: `External API returned ${response.status}`,
          };
          return;
        }

        let finalData = responseData;
        if (responseMappings && responseData && typeof responseData === "object") {
          finalData = transformResponse(responseData as Record<string, unknown>, responseMappings);
        }

        const slots = extractSlotArray(finalData);
        results[doctorId] = { slots };
      } catch (err) {
        results[doctorId] = {
          slots: [],
          error: err instanceof Error ? err.message : "Fetch failed",
        };
      }
    });

    await Promise.allSettled(fetchPromises);

    return corsResponse({ results });
  } catch (err) {
    console.error("[batch-slots] Error:", err);
    return corsResponse(
      { error: err instanceof Error ? err.message : "Internal server error" },
      500,
    );
  }
});
