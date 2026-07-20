import { createClient } from '@supabase/supabase-js';
import type { Database } from './typesClients';

const SUPABASE_URL = "https://ohhgmoivhgkdxakrrutg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_T1epNcaipfPHOqWVjXbErg_q2cAqt-0";

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith('sb_publishable_') || value.startsWith('sb_secret_');
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined,
    );

    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }

    // New Supabase API keys are opaque strings, not bearer JWTs.
    if (isNewSupabaseApiKey(supabaseKey) && headers.get('Authorization') === `Bearer ${supabaseKey}`) {
      headers.delete('Authorization');
    }

    headers.set('apikey', supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

export const supabaseClients = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  global: {
    fetch: createSupabaseFetch(SUPABASE_PUBLISHABLE_KEY),
  },
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'sb-clients-auth-token',
  }
});

// BYPASS DE GETUSER NO LOCALHOST
const isLocalhost = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
if (isLocalhost) {
  supabaseClients.auth.getUser = async () => {
    return {
      data: {
        user: {
          id: "bf0471c6-0152-460e-ae22-e7f3ec3969c4",
          email: "digitalavante3@gmail.com",
          role: "authenticated",
          aud: "authenticated",
          app_metadata: {},
          user_metadata: {},
          created_at: new Date().toISOString()
        } as any
      },
      error: null
    };
  };
}

export default supabaseClients;
