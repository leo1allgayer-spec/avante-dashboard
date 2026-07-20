import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { supabaseClients } from "@/integrations/supabase/clientsClient";
import type { Session } from "@supabase/supabase-js";

export function useAuth() {
  const isLocalhost = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

  const [session, setSession] = useState<Session | null>(isLocalhost ? {
    access_token: "mock-session-token",
    token_type: "bearer",
    expires_in: 360000,
    refresh_token: "mock",
    user: {
      id: "bf0471c6-0152-460e-ae22-e7f3ec3969c4",
      email: "digitalavante3@gmail.com",
      role: "authenticated",
      aud: "authenticated",
      app_metadata: {},
      user_metadata: {},
      created_at: new Date().toISOString()
    }
  } : null);
  const [loading, setLoading] = useState(isLocalhost ? false : true);

  useEffect(() => {
    if (isLocalhost) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [isLocalhost]);

  const signOut = async () => {
    if (isLocalhost) return;
    await Promise.all([
      supabase.auth.signOut(),
      supabaseClients.auth.signOut().catch(() => {})
    ]);
  };

  return { session, loading, signOut };
}
