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

import { ApiRequestError, fetchApiData, isApiConfigured } from "@/lib/api";
import {
  genericAuthErrorMessage,
  mapSupabaseAuthError,
  validateSignupInput,
  type AuthMeResponse,
} from "@/lib/auth-utils";
import { getGoogleOAuthRedirectTo, rememberAuthNextPath } from "@/lib/auth-redirect";
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
  signInWithGoogle: (options?: { next?: string | null }) => Promise<GoogleSignInResult>;
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

function displayNameFromUser(user: User): string {
  const metaName =
    (user.user_metadata?.full_name as string | undefined)?.trim() ||
    (user.user_metadata?.name as string | undefined)?.trim();
  return metaName || user.email?.split("@")[0] || "Customer";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const profileRequestId = useRef(0);
  const appliedAccessToken = useRef<string | null>(null);
  const bootstrapped = useRef(false);

  const clearLocalAuth = useCallback(() => {
    profileRequestId.current += 1;
    appliedAccessToken.current = null;
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
  }, []);

  const applySession = useCallback(
    async (nextSession: Session | null, options?: { force?: boolean }) => {
      const nextToken = nextSession?.access_token ?? null;

      if (
        !options?.force &&
        nextToken &&
        appliedAccessToken.current === nextToken &&
        bootstrapped.current
      ) {
        // Same session already applied — avoid duplicate /auth/me work.
        return;
      }

      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      appliedAccessToken.current = nextToken;

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
          // API optional — display-only fallback. Roles are never taken from Google metadata.
          setProfile(
            nextSession.user
              ? {
                  id: nextSession.user.id,
                  fullName: displayNameFromUser(nextSession.user),
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
        // Roles / branches / permissions come only from the API principal (DB), never metadata.
        setRoles(me.roles);
      } catch (error) {
        if (requestId !== profileRequestId.current) return;

        if (error instanceof ApiRequestError && error.code === "USER_ACCESS_DISABLED") {
          clearLocalAuth();
          const supabase = getSupabaseClient();
          if (supabase) {
            await supabase.auth.signOut();
          }
          return;
        }

        setProfile(null);
        setRoles([]);
      }
    },
    [clearLocalAuth],
  );

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
        if (!cancelled) {
          bootstrapped.current = true;
          setIsLoading(false);
        }
      });
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void applySession(nextSession).finally(() => {
        if (!cancelled) {
          bootstrapped.current = true;
          setIsLoading(false);
        }
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
          // Display name only — never role / user_type / branch.
          data: validated.fullName ? { full_name: validated.fullName } : undefined,
        },
      });

      if (error) {
        return { ok: false, message: mapSupabaseAuthError(error.message) };
      }

      const needsEmailConfirmation = !data.session;
      if (data.session) {
        await applySession(data.session, { force: true });
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

      await applySession(data.session, { force: true });
      return { ok: true };
    },
    [applySession],
  );

  const signInWithGoogle = useCallback(
    async (options?: { next?: string | null }): Promise<GoogleSignInResult> => {
      const supabase = getSupabaseClient();
      if (!supabase || !isSupabaseConfigured) {
        return {
          ok: false,
          message: "Authentication is not configured. Please try again later.",
        };
      }

      rememberAuthNextPath(options?.next);

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
    },
    [],
  );

  const signOut = useCallback(async () => {
    const supabase = getSupabaseClient();
    // Clear legacy preview identity keys only — do not touch cart storage.
    clearStoredUser();
    clearLocalAuth();

    if (supabase) {
      await supabase.auth.signOut();
    }
  }, [clearLocalAuth]);

  const refreshProfile = useCallback(async () => {
    if (!session?.access_token) return;
    await applySession(session, { force: true });
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
