// Recursively lists Bluebook explanation videos from a shared Google Drive folder.
// Structure:
//   ROOT/
//     practice test N/
//       module M/
//         N.M.Q  (video/*)
// Returns a flat list plus a nested grouping by test → module.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const GATEWAY = "https://connector-gateway.lovable.dev/google_drive/drive/v3";
const ROOT_FOLDER_ID = "1HvhNJkGiFbRJaq0ppW87fNi-oUb7rjKj";

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink?: string;
  modifiedTime?: string;
}

// simple in-memory cache (per warm instance)
let cache: { at: number; payload: unknown } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Runs async work with bounded concurrency so we don't hammer the connector gateway. */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      out[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return out;
}

async function listChildren(parentId: string, fields: string): Promise<DriveFile[]> {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const driveKey = Deno.env.get("GOOGLE_DRIVE_API_KEY");
  if (!lovableKey || !driveKey) throw new Error("Drive connector not configured");

  const params = new URLSearchParams({
    q: `'${parentId}' in parents and trashed=false`,
    fields: `files(${fields})`,
    orderBy: "name_natural",
    pageSize: "500",
  });

  // The connector gateway occasionally answers 503 / resets the connection.
  // Retry transient failures with backoff before giving up on the whole tree.
  const MAX_ATTEMPTS = 4;
  let lastError = "";
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(`${GATEWAY}/files?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": driveKey,
        },
      });
      if (res.ok) {
        const json = await res.json();
        return (json.files ?? []) as DriveFile[];
      }
      const body = await res.text();
      lastError = `Drive list failed (${res.status}): ${body}`;
      const transient = res.status === 429 || res.status >= 500;
      if (!transient) break;
    } catch (err) {
      lastError = `Drive list failed (network): ${err instanceof Error ? err.message : String(err)}`;
    }
    if (attempt < MAX_ATTEMPTS) await sleep(250 * 2 ** (attempt - 1) + Math.random() * 150);
  }
  throw new Error(lastError || "Drive list failed");
}

function parseTestNumber(name: string): number | null {
  const m = name.match(/(\d+)/);
  return m ? Number(m[1]) : null;
}

function parseModuleNumber(name: string): number | null {
  const m = name.match(/(\d+)/);
  return m ? Number(m[1]) : null;
}

function naturalSort(a: string, b: string) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// 6h token — comfortably covers a study session while still expiring.
const TOKEN_TTL_MS = 6 * 60 * 60 * 1000;

async function buildStreamUrl(fileId: string, projectRef: string): Promise<string> {
  const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!secret) throw new Error("signing secret unavailable");
  const exp = Date.now() + TOKEN_TTL_MS;
  const sig = await hmacHex(secret, `${fileId}.${exp}`);
  return `https://${projectRef}.supabase.co/functions/v1/stream-bluebook-video?id=${encodeURIComponent(fileId)}&exp=${exp}&sig=${sig}`;
}

async function buildTree(projectRef: string) {
  const testFolders = (await listChildren(ROOT_FOLDER_ID, "id,name,mimeType"))
    .filter((f) => f.mimeType === "application/vnd.google-apps.folder")
    .sort((a, b) => naturalSort(a.name, b.name));

  const tests = await mapLimit(testFolders, 4, async (tf) => {
      const testNumber = parseTestNumber(tf.name);
      const moduleFolders = (await listChildren(tf.id, "id,name,mimeType"))
        .filter((f) => f.mimeType === "application/vnd.google-apps.folder")
        .sort((a, b) => naturalSort(a.name, b.name));

      const modules = await mapLimit(moduleFolders, 4, async (mf) => {
          const moduleNumber = parseModuleNumber(mf.name);
          const files = (await listChildren(mf.id, "id,name,mimeType,thumbnailLink,modifiedTime"))
            .filter((f) => f.mimeType.startsWith("video/"))
            .sort((a, b) => naturalSort(a.name, b.name));

          const videos = await Promise.all(files.map(async (v) => ({
            id: v.id,
            name: v.name,
            thumbnailUrl: v.thumbnailLink ? v.thumbnailLink.replace(/=s\d+$/, "=s400") : null,
            // Direct Drive embed (no egress through our backend).
            embedUrl: `https://drive.google.com/file/d/${v.id}/preview`,
            // streamUrl proxies through our edge function — fallback only.
            streamUrl: await buildStreamUrl(v.id, projectRef),
            modifiedTime: v.modifiedTime ?? null,
          })));

          return {
            id: mf.id,
            name: mf.name,
            moduleNumber,
            videoCount: videos.length,
            videos,
          };
        }),
      );

      return {
        id: tf.id,
        name: tf.name,
        testNumber,
        modules,
      };
    }),
  );

  return { tests, generatedAt: new Date().toISOString() };
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const projectRef = supabaseUrl.replace(/^https?:\/\//, "").split(".")[0];
    if (!projectRef) throw new Error("SUPABASE_URL not set");

    if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
      return new Response(JSON.stringify(cache.payload), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await buildTree(projectRef);
    cache = { at: Date.now(), payload };


    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("list-bluebook-videos error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
