import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";

import { fetchApiData, isApiConfigured } from "@/lib/api";
import {
  genericAuthErrorMessage,
  getGoogleOAuthRedirectTo,
  mapSupabaseAuthError,
  validateSignupInput,
  type AuthMeResponse,
} from "@/lib/auth-utils";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { clearStoredUser } from "@/lib/customer-store";

export type CustomerProfile = {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
};

type SignUpResult =
  | { ok: true; needsEmailConfirmation: boolean }
  | { ok: false; message: string };

type SignInResult = { ok: true } | { ok: false; message: string };
type GoogleSignInResult = { ok: true } | { ok: false; message: string };

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: CustomerProfile | null;
  roles: string[];
  isLoading: boolean;
  isAuthenticated: boolean;
  signUp: (input: { email: string; password: string; fullName?: string }) => Promise<SignUpResult>;
  signIn: (input: { email: string; password: string }) => Promise<SignInResult>;
  signInWithGoogle: () => Promise<GoogleSignInResult>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

async function loadAuthMe(accessToken: string): Promise<AuthMeResponse | null> {
  if (!isApiConfigured) {
    return null;
  }

  return fetchApiData<AuthMeResponse>("/auth/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const profileRequestId = useRef(0);

  const applySession = useCallback(async (nextSession: Session | null) => {
    setSession(nextSession);
    setUser(nextSession?.user ?? null);

    if (!nextSession?.access_token) {
      setProfile(null);
      setRoles([]);
      return;
    }

    const requestId = ++profileRequestId.current;

    try {
      const me = await loadAuthMe(nextSession.access_token);
      if (requestId !== profileRequestId.current) return;

      if (!me) {
        setProfile(
          nextSession.user
            ? {
                id: nextSession.user.id,
                fullName:
                  (nextSession.user.user_metadata?.full_name as string | undefined)?.trim() ||
                  nextSession.user.email?.split("@")[0] ||
                  "Customer",
                phone: null,
                email: nextSession.user.email ?? null,
              }
            : null,
        );
        setRoles(["customer"]);
        return;
      }

      setProfile(
        me.profile
          ? {
              id: me.profile.id,
              fullName: me.profile.fullName,
              phone: me.profile.phone,
              email: me.email,
            }
          : null,
      );
      setRoles(me.roles);
    } catch {
      if (requestId !== profileRequestId.current) return;
      setProfile(null);
      setRoles([]);
    }
  }, []);

  useEffect(() => {
    const supabase = getSupabaseClient();

    if (!supabase) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      void applySession(data.session).finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void applySession(nextSession).finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [applySession]);

  const signUp = useCallback(
    async (input: { email: string; password: string; fullName?: string }): Promise<SignUpResult> => {
      const validated = validateSignupInput(input);
      if (!validated.ok) {
        return { ok: false, message: validated.message };
      }

      const supabase = getSupabaseClient();
      if (!supabase || !isSupabaseConfigured) {
        return {
          ok: false,
          message: "Authentication is not configured. Please try again later.",
        };
      }

      const { data, error } = await supabase.auth.signUp({
        email: validated.email,
        password: validated.password,
        options: {
          data: validated.fullName ? { full_name: validated.fullName } : undefined,
        },
      });

      if (error) {
        return { ok: false, message: mapSupabaseAuthError(error.message) };
      }

      const needsEmailConfirmation = !data.session;
      if (data.session) {
        await applySession(data.session);
      }

      return { ok: true, needsEmailConfirmation };
    },
    [applySession],
  );

  const signIn = useCallback(
    async (input: { email: string; password: string }): Promise<SignInResult> => {
      const email = input.email.trim().toLowerCase();
      const password = input.password;

      if (!email || !password) {
        return { ok: false, message: genericAuthErrorMessage() };
      }

      const supabase = getSupabaseClient();
      if (!supabase || !isSupabaseConfigured) {
        return {
          ok: false,
          message: "Authentication is not configured. Please try again later.",
        };
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error || !data.session) {
        return { ok: false, message: mapSupabaseAuthError(error?.message) };
      }

      await applySession(data.session);
      return { ok: true };
    },
    [applySession],
  );

  const signInWithGoogle = useCallback(async (): Promise<GoogleSignInResult> => {
    const supabase = getSupabaseClient();
    if (!supabase || !isSupabaseConfigured) {
      return {
        ok: false,
        message: "Authentication is not configured. Please try again later.",
      };
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: getGoogleOAuthRedirectTo(),
        queryParams: {
          prompt: "select_account",
        },
      },
    });

    if (error) {
      return { ok: false, message: mapSupabaseAuthError(error.message) };
    }

    return { ok: true };
  }, []);

  const signOut = useCallback(async () => {
    const supabase = getSupabaseClient();
    // Clear legacy preview identity keys only — do not touch cart storage.
    clearStoredUser();
    profileRequestId.current += 1;
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);

    if (supabase) {
      await supabase.auth.signOut();
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!session?.access_token) return;
    await applySession(session);
  }, [applySession, session]);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      session,
      profile,
      roles,
      isLoading,
      isAuthenticated: Boolean(session?.user),
      signUp,
      signIn,
      signInWithGoogle,
      signOut,
      refreshProfile,
    }),
    [
      user,
      session,
      profile,
      roles,
      isLoading,
      signUp,
      signIn,
      signInWithGoogle,
      signOut,
      refreshProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
