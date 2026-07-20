import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session } from "@supabase/supabase-js";
import { supabaseClients as supabase } from "@/integrations/supabase/clientsClient";

interface AuthContextType {
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [isLocalhost]);

  const signOut = async () => {
    if (isLocalhost) return;
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
