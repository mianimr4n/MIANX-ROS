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
  hasEmailIdentity,
  mapSupabaseAuthError,
  validatePasswordStrength,
  validateSignupInput,
  type AuthMeResponse,
} from "@/lib/auth-utils";
import {
  getEmailChangeRedirectTo,
  getEmailConfirmationRedirectTo,
  getOAuthRedirectTo,
  getPasswordRecoveryRedirectTo,
  rememberAuthEmailFlow,
  rememberAuthNextPath,
} from "@/lib/auth-redirect";
import { FACEBOOK_OAUTH_SCOPES } from "@/lib/auth-identity";
import { normalizePakistaniMobileE164 } from "@/lib/phone";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { clearStoredUser } from "@/lib/customer-store";

export type CustomerProfile = {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  /** Always false until WhatsApp OTP (Slice 2C). */
  phoneVerified: boolean;
};

type SignUpResult =
  | { ok: true; needsEmailConfirmation: boolean }
  | { ok: false; message: string };

type SignInResult = { ok: true } | { ok: false; message: string };
type SocialSignInResult = { ok: true } | { ok: false; message: string };
type ActionResult = { ok: true } | { ok: false; message: string };

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: CustomerProfile | null;
  roles: string[];
  permissions: string[];
  branchIds: string[];
  isSuperAdmin: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  /** True when Supabase session is valid but `/auth/me` could not be loaded (API down). */
  isProfileSyncDegraded: boolean;
  signUp: (input: { email: string; password: string; fullName?: string }) => Promise<SignUpResult>;
  signIn: (input: { email: string; password: string }) => Promise<SignInResult>;
  signInWithGoogle: (options?: { next?: string | null }) => Promise<SocialSignInResult>;
  signInWithFacebook: (options?: { next?: string | null }) => Promise<SocialSignInResult>;
  /** Rate-limited resend of signup confirmation email (never enumerates accounts). */
  resendConfirmationEmail: (email: string) => Promise<ActionResult>;
  /**
   * Request a password-reset email. Always succeeds from the UI perspective when the
   * request is accepted — never reveals whether the email exists.
   */
  requestPasswordReset: (email: string) => Promise<ActionResult>;
  /**
   * Set a new Telepizza password after opening a recovery link (authenticated recovery session).
   */
  completePasswordReset: (input: {
    password: string;
    confirmPassword: string;
  }) => Promise<ActionResult>;
  /**
   * Request an email change on the current auth user. Confirmation is sent by Supabase.
   * Requires current Telepizza password when an email identity already exists.
   */
  requestEmailChange: (input: {
    newEmail: string;
    currentPassword?: string;
  }) => Promise<ActionResult>;
  /**
   * Attach or change Telepizza email/password on the current Supabase user (no second auth user).
   * OAuth-only first-time set: password + confirm only.
   * Change-password (email identity already present): requires currentPassword.
   */
  setPassword: (input: {
    password: string;
    confirmPassword: string;
    currentPassword?: string;
  }) => Promise<ActionResult>;
  updateProfile: (input: { fullName?: string; phone?: string | null }) => Promise<ActionResult>;
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
  const [permissions, setPermissions] = useState<string[]>([]);
  const [branchIds, setBranchIds] = useState<string[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isProfileSyncDegraded, setIsProfileSyncDegraded] = useState(false);
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
    setPermissions([]);
    setBranchIds([]);
    setIsSuperAdmin(false);
    setIsProfileSyncDegraded(false);
  }, []);

  const applyMetadataFallbackProfile = useCallback((authUser: User) => {
    setProfile({
      id: authUser.id,
      fullName: displayNameFromUser(authUser),
      phone: null,
      email: authUser.email ?? null,
      phoneVerified: false,
    });
    setRoles(["customer"]);
    setPermissions([]);
    setBranchIds([]);
    setIsSuperAdmin(false);
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
        setPermissions([]);
        setBranchIds([]);
        setIsSuperAdmin(false);
        return;
      }

      const requestId = ++profileRequestId.current;

      try {
        const me = await loadAuthMe(nextSession.access_token);
        if (requestId !== profileRequestId.current) return;

        if (!me) {
          // API optional — display-only fallback. Roles are never taken from Google metadata.
          if (nextSession.user) {
            applyMetadataFallbackProfile(nextSession.user);
          } else {
            setProfile(null);
            setRoles([]);
            setPermissions([]);
            setBranchIds([]);
            setIsSuperAdmin(false);
          }
          setIsProfileSyncDegraded(false);
          return;
        }

        setIsProfileSyncDegraded(false);
        if (me.profile) {
          setProfile({
            id: me.profile.id,
            fullName: me.profile.fullName,
            phone: me.profile.phone,
            email: me.email,
            phoneVerified: false,
          });
        } else if (nextSession.user) {
          applyMetadataFallbackProfile(nextSession.user);
          setIsProfileSyncDegraded(true);
        } else {
          setProfile(null);
        }
        // Roles / branches / permissions come only from the API principal (DB), never metadata.
        setRoles(me.roles);
        setPermissions(me.permissions ?? []);
        setBranchIds(me.branchIds ?? []);
        setIsSuperAdmin(Boolean(me.isSuperAdmin));
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

        if (nextSession.user) {
          applyMetadataFallbackProfile(nextSession.user);
          setIsProfileSyncDegraded(true);
        } else {
          setProfile(null);
          setRoles([]);
          setPermissions([]);
          setBranchIds([]);
          setIsSuperAdmin(false);
          setIsProfileSyncDegraded(false);
        }
      }
    },
    [applyMetadataFallbackProfile, clearLocalAuth],
  );

  useEffect(() => {
    const supabase = getSupabaseClient();

    if (!supabase) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    // Serialize auth updates so getSession/onAuthStateChange races cannot apply a
    // customer fallback over a successful /auth/me principal (hard-refresh C1).
    let chain: Promise<void> = Promise.resolve();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      chain = chain
        .then(async () => {
          if (cancelled) return;
          await applySession(nextSession);
        })
        .finally(() => {
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

      rememberAuthEmailFlow("signup");

      const { data, error } = await supabase.auth.signUp({
        email: validated.email,
        password: validated.password,
        options: {
          emailRedirectTo: getEmailConfirmationRedirectTo(),
          // Display name only — never role / user_type / branch.
          data: validated.fullName ? { full_name: validated.fullName } : undefined,
        },
      });

      if (error) {
        return { ok: false, message: mapSupabaseAuthError(error.message) };
      }

      // When confirmation is required, Supabase returns no session — do not treat as logged in.
      const needsEmailConfirmation = !data.session;
      if (data.session) {
        await applySession(data.session, { force: true });
      }

      return { ok: true, needsEmailConfirmation };
    },
    [applySession],
  );

  const resendConfirmationEmail = useCallback(async (email: string): Promise<ActionResult> => {
    const normalized = email.trim().toLowerCase();
    if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      return { ok: false, message: "Enter a valid email address." };
    }

    const supabase = getSupabaseClient();
    if (!supabase || !isSupabaseConfigured) {
      return {
        ok: false,
        message: "Authentication is not configured. Please try again later.",
      };
    }

    rememberAuthEmailFlow("signup");

    const { error } = await supabase.auth.resend({
      type: "signup",
      email: normalized,
      options: {
        emailRedirectTo: getEmailConfirmationRedirectTo(),
      },
    });

    if (error) {
      return { ok: false, message: mapSupabaseAuthError(error.message) };
    }

    // Always generic — never reveal whether the email exists or is already confirmed.
    return { ok: true };
  }, []);

  const requestPasswordReset = useCallback(async (email: string): Promise<ActionResult> => {
    const normalized = email.trim().toLowerCase();
    if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      return { ok: false, message: "Enter a valid email address." };
    }

    const supabase = getSupabaseClient();
    if (!supabase || !isSupabaseConfigured) {
      return {
        ok: false,
        message: "Authentication is not configured. Please try again later.",
      };
    }

    rememberAuthEmailFlow("recovery");
    rememberAuthNextPath("/reset-password");

    const { error } = await supabase.auth.resetPasswordForEmail(normalized, {
      redirectTo: getPasswordRecoveryRedirectTo(),
    });

    if (error) {
      // Still return ok for common "user not found" style failures to avoid enumeration.
      const mapped = mapSupabaseAuthError(error.message);
      if (mapped === genericAuthErrorMessage()) {
        return { ok: true };
      }
      return { ok: false, message: mapped };
    }

    return { ok: true };
  }, []);

  const completePasswordReset = useCallback(
    async (input: { password: string; confirmPassword: string }): Promise<ActionResult> => {
      const supabase = getSupabaseClient();
      if (!supabase || !isSupabaseConfigured || !session?.user) {
        return {
          ok: false,
          message: "This reset link is invalid or expired. Request a new password reset email.",
        };
      }

      if (input.password !== input.confirmPassword) {
        return { ok: false, message: "Passwords do not match." };
      }

      const strength = validatePasswordStrength(input.password);
      if (!strength.ok) {
        return strength;
      }

      const { data, error } = await supabase.auth.updateUser({ password: input.password });
      if (error) {
        return { ok: false, message: mapSupabaseAuthError(error.message) };
      }
      if (data.user) setUser(data.user);
      return { ok: true };
    },
    [session],
  );

  const requestEmailChange = useCallback(
    async (input: { newEmail: string; currentPassword?: string }): Promise<ActionResult> => {
      const supabase = getSupabaseClient();
      if (!supabase || !isSupabaseConfigured || !session?.user) {
        return { ok: false, message: "Sign in again to change your email." };
      }

      const newEmail = input.newEmail.trim().toLowerCase();
      if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
        return { ok: false, message: "Enter a valid email address." };
      }

      const currentEmail = session.user.email?.trim().toLowerCase() ?? "";
      if (currentEmail && newEmail === currentEmail) {
        return { ok: false, message: "Enter a different email address than your current one." };
      }

      // Prove Telepizza password ownership when email/password is already attached.
      if (hasEmailIdentity(session.user)) {
        const current = input.currentPassword?.trim() ?? "";
        if (!current) {
          return {
            ok: false,
            message: "Enter your current Telepizza password to change your email.",
          };
        }
        const { error: verifyError } = await supabase.auth.signInWithPassword({
          email: currentEmail,
          password: current,
        });
        if (verifyError) {
          return { ok: false, message: genericAuthErrorMessage() };
        }
      }

      rememberAuthEmailFlow("email_change");
      rememberAuthNextPath("/my-telepizza#security");

      const { data, error } = await supabase.auth.updateUser(
        { email: newEmail },
        { emailRedirectTo: getEmailChangeRedirectTo() },
      );

      if (error) {
        return { ok: false, message: mapSupabaseAuthError(error.message) };
      }
      if (data.user) setUser(data.user);
      return { ok: true };
    },
    [session],
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
    async (options?: { next?: string | null }): Promise<SocialSignInResult> => {
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
          redirectTo: getOAuthRedirectTo(),
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

  const signInWithFacebook = useCallback(
    async (options?: { next?: string | null }): Promise<SocialSignInResult> => {
      const supabase = getSupabaseClient();
      if (!supabase || !isSupabaseConfigured) {
        return {
          ok: false,
          message: "Authentication is not configured. Please try again later.",
        };
      }

      rememberAuthNextPath(options?.next);

      // Scopes: public_profile + email only — never friends/photos/posts/etc.
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "facebook",
        options: {
          redirectTo: getOAuthRedirectTo(),
          scopes: FACEBOOK_OAUTH_SCOPES,
        },
      });

      if (error) {
        return { ok: false, message: mapSupabaseAuthError(error.message) };
      }

      return { ok: true };
    },
    [],
  );

  const setPassword = useCallback(
    async (input: {
      password: string;
      confirmPassword: string;
      currentPassword?: string;
    }): Promise<ActionResult> => {
      const supabase = getSupabaseClient();
      if (!supabase || !isSupabaseConfigured || !session?.user) {
        return { ok: false, message: "Sign in again to set a password." };
      }

      const email = session.user.email?.trim();
      if (!email) {
        return { ok: false, message: "A verified email is required before setting a password." };
      }

      if (input.password !== input.confirmPassword) {
        return { ok: false, message: "Passwords do not match." };
      }

      const strength = validatePasswordStrength(input.password);
      if (!strength.ok) {
        return strength;
      }

      // Password stays in Supabase Auth only — never sent to Telepizza API / public.users.
      const hasTelepizzaPassword = hasEmailIdentity(session.user);

      if (hasTelepizzaPassword) {
        // Change-password: require current Telepizza password (never Google password).
        const current = input.currentPassword?.trim() ?? "";
        if (!current) {
          return {
            ok: false,
            message: "Enter your current Telepizza password to change it.",
          };
        }

        const { data, error } = await supabase.auth.updateUser({
          password: input.password,
          current_password: current,
        });
        if (error) {
          return { ok: false, message: mapSupabaseAuthError(error.message) };
        }
        if (data.user) setUser(data.user);
        return { ok: true };
      }

      // First-time password attach for OAuth-only (e.g. Google) users.
      // Use updateUser({ password }) only — do not send current_password or ask for Google password.
      const { data, error } = await supabase.auth.updateUser({ password: input.password });
      if (error) {
        const mapped = mapSupabaseAuthError(error.message);
        // Secure password-change on the project must not force Google users to invent a current password.
        if (
          mapped.toLowerCase().includes("current telepizza password") ||
          (error.message ?? "").toLowerCase().includes("current password")
        ) {
          return {
            ok: false,
            message:
              "Sign out and sign back in using your original sign-in method, then try again.",
          };
        }
        return { ok: false, message: mapped };
      }
      if (data.user) setUser(data.user);
      return { ok: true };
    },
    [session],
  );

  const updateProfile = useCallback(
    async (input: { fullName?: string; phone?: string | null }): Promise<ActionResult> => {
      if (!session?.access_token) {
        return { ok: false, message: "Sign in again to update your profile." };
      }

      if (!isApiConfigured) {
        return { ok: false, message: "Profile updates are temporarily unavailable." };
      }

      const payload: { fullName?: string; phone?: string | null } = {};
      if (input.fullName !== undefined) {
        const trimmed = input.fullName.trim();
        if (!trimmed) {
          return { ok: false, message: "Full name cannot be empty." };
        }
        payload.fullName = trimmed;
      }

      if (input.phone !== undefined) {
        if (input.phone === null || input.phone.trim() === "") {
          payload.phone = null;
        } else {
          const normalized = normalizePakistaniMobileE164(input.phone);
          if (!normalized.ok) {
            return { ok: false, message: normalized.message };
          }
          payload.phone = normalized.e164;
        }
      }

      try {
        const updated = await fetchApiData<{
          id: string;
          fullName: string;
          phone: string | null;
          email: string | null;
        }>("/auth/me/profile", {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(payload),
        });

        setProfile({
          id: updated.id,
          fullName: updated.fullName,
          phone: updated.phone,
          email: updated.email ?? session.user?.email ?? null,
          phoneVerified: false,
        });
        return { ok: true };
      } catch (error) {
        if (error instanceof ApiRequestError) {
          if (error.code === "PHONE_ALREADY_IN_USE") {
            return {
              ok: false,
              message:
                "This phone number is already linked to another account. Use a different number.",
            };
          }
          if (error.code === "USER_ACCESS_DISABLED") {
            return { ok: false, message: "Access is disabled for this account." };
          }
          if (
            error.code === "PROFILE_NOT_FOUND" ||
            error.code === "PROFILE_BOOTSTRAP_FAILED" ||
            /profile was not found/i.test(error.message)
          ) {
            return {
              ok: false,
              message:
                "We couldn't finish setting up your profile yet. Please try again.",
            };
          }
          return { ok: false, message: error.message || "Could not update profile." };
        }
        return { ok: false, message: "Could not update profile. Please try again." };
      }
    },
    [session],
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
      permissions,
      branchIds,
      isSuperAdmin,
      isLoading,
      isAuthenticated: Boolean(session?.user),
      isProfileSyncDegraded,
      signUp,
      signIn,
      signInWithGoogle,
      signInWithFacebook,
      resendConfirmationEmail,
      requestPasswordReset,
      completePasswordReset,
      requestEmailChange,
      setPassword,
      updateProfile,
      signOut,
      refreshProfile,
    }),
    [
      user,
      session,
      profile,
      roles,
      permissions,
      branchIds,
      isSuperAdmin,
      isLoading,
      isProfileSyncDegraded,
      signUp,
      signIn,
      signInWithGoogle,
      signInWithFacebook,
      resendConfirmationEmail,
      requestPasswordReset,
      completePasswordReset,
      requestEmailChange,
      setPassword,
      updateProfile,
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
