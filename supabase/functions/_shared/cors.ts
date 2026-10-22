/**
 * Canonical CORS headers for this project's edge functions.
 *
 * These are the exact values `@supabase/supabase-js/cors` exports, copied here
 * because the client version installed in the sandbox (2.81.1) does not publish
 * that subpath — so the original `npm:@supabase/supabase-js@2/cors` import could
 * not be resolved while type checking. Behaviour is unchanged for callers.
 *
 * Keep these in sync with the SDK: if the client starts sending a new header,
 * add it to SUPABASE_HEADERS here.
 */

/** All custom headers sent by the Supabase SDK. */
const SUPABASE_HEADERS = [
  'authorization',
  'x-client-info',
  'apikey',
  'content-type',
  'x-retry-count',
  'traceparent',
  'tracestate',
  'baggage',
].join(', ')

/** All HTTP methods used by the Supabase SDK. */
const SUPABASE_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'].join(', ')

/** CORS headers as a record of header names to values. */
export type CorsHeaders = Record<string, string>

/** Default CORS headers for edge functions: wildcard origin, all SDK headers. */
export const corsHeaders: CorsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': SUPABASE_HEADERS,
  'Access-Control-Allow-Methods': SUPABASE_METHODS,
}
