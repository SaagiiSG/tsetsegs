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

  const res = await fetch(`${GATEWAY}/files?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": driveKey,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Drive list failed (${res.status}): ${body}`);
  }
  const json = await res.json();
  return (json.files ?? []) as DriveFile[];
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

  const tests = await Promise.all(
    testFolders.map(async (tf) => {
      const testNumber = parseTestNumber(tf.name);
      const moduleFolders = (await listChildren(tf.id, "id,name,mimeType"))
        .filter((f) => f.mimeType === "application/vnd.google-apps.folder")
        .sort((a, b) => naturalSort(a.name, b.name));

      const modules = await Promise.all(
        moduleFolders.map(async (mf) => {
          const moduleNumber = parseModuleNumber(mf.name);
          const files = (await listChildren(mf.id, "id,name,mimeType,thumbnailLink,modifiedTime"))
            .filter((f) => f.mimeType.startsWith("video/"))
            .sort((a, b) => naturalSort(a.name, b.name));

          const videos = await Promise.all(files.map(async (v) => ({
            id: v.id,
            name: v.name,
            thumbnailUrl: v.thumbnailLink ? v.thumbnailLink.replace(/=s\d+$/, "=s400") : null,
            // streamUrl proxies through our edge function — Drive is never exposed to the browser.
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
    if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
      return new Response(JSON.stringify(cache.payload), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await buildTree();
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
