import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { AuthPageShell } from "@/components/AuthPageShell";
import { AUTH_PASSWORD_REQUIREMENTS_COPY, validatePasswordStrength } from "@/lib/auth-utils";
import {
  DEFAULT_AUTH_DESTINATION,
  buildAuthHref,
  clearSensitiveAuthUrl,
  mapOAuthCallbackError,
  peekAuthNextFromLocationSearch,
  sanitizeAuthNextPath,
} from "@/lib/auth-redirect";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

type RecoveryPhase = "loading" | "ready" | "missing" | "done";

/**
 * Completes password recovery after the customer opens the email link.
 * Detects PASSWORD_RECOVERY + an active recovery session on `/reset-password`.
 */
export default function ResetPassword() {
  const [location, navigate] = useLocation();
  const { completePasswordReset, signOut } = useAuth();
  const [phase, setPhase] = useState<RecoveryPhase>("loading");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const cleanedUrl = useRef(false);
  const recoveryEventSeen = useRef(false);

  const search = typeof window !== "undefined" ? window.location.search : "";
  const nextPath = sanitizeAuthNextPath(
    peekAuthNextFromLocationSearch(search) ?? peekAuthNextFromLocationSearch(location),
    DEFAULT_AUTH_DESTINATION,
  );
  const loginLink = buildAuthHref("/login", nextPath);
  const requestNewLink = buildAuthHref("/forgot-password", nextPath);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase || !isSupabaseConfigured) {
      setPhase("missing");
      setError("Authentication is not configured. Please try again later.");
      return;
    }

    let cancelled = false;

    const markReady = () => {
      if (cancelled) return;
      setPhase("ready");
      setError(null);
      if (!cleanedUrl.current) {
        cleanedUrl.current = true;
        clearSensitiveAuthUrl("/reset-password");
      }
    };

    const markMissing = (message: string) => {
      if (cancelled) return;
      setPhase("missing");
      setError(message);
      if (!cleanedUrl.current) {
        cleanedUrl.current = true;
        clearSensitiveAuthUrl("/reset-password");
      }
    };

    // Surface recovery-link errors from query/hash without ever logging the raw URL.
    try {
      const params = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const linkError =
        params.get("error_description") ||
        params.get("error_code") ||
        params.get("error") ||
        hashParams.get("error_description") ||
        hashParams.get("error_code") ||
        hashParams.get("error");
      if (linkError) {
        markMissing(mapOAuthCallbackError(linkError));
      }
    } catch {
      /* ignore parse failures */
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === "PASSWORD_RECOVERY") {
        recoveryEventSeen.current = true;
        if (session?.user) {
          markReady();
        }
        return;
      }
      // After fragment exchange, a session may arrive as INITIAL_SESSION / SIGNED_IN.
      if (session?.user && (recoveryEventSeen.current || event === "INITIAL_SESSION" || event === "SIGNED_IN")) {
        // Prefer ready only when we have evidence of recovery or an active session on this route.
        void supabase.auth.getSession().then(({ data }) => {
          if (cancelled) return;
          if (data.session?.user) {
            markReady();
          }
        });
      }
    });

    void (async () => {
      try {
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (cancelled) return;
        if (sessionError) {
          markMissing(
            mapOAuthCallbackError(sessionError.message) ||
              "This reset link is invalid or expired. Request a new password reset email.",
          );
          return;
        }
        if (data.session?.user) {
          markReady();
          return;
        }
        // Allow a short window for detectSessionInUrl / PASSWORD_RECOVERY to settle.
        window.setTimeout(() => {
          if (cancelled || recoveryEventSeen.current) return;
          void supabase.auth.getSession().then(({ data: retry }) => {
            if (cancelled) return;
            if (retry.session?.user) {
              markReady();
              return;
            }
            markMissing("This reset link is invalid, expired, or was already used. Request a new password reset email.");
          });
        }, 2500);
      } catch {
        if (!cancelled) {
          markMissing("This reset link is invalid or expired. Request a new password reset email.");
        }
      }
    })();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting || phase !== "ready") return;

    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const strength = validatePasswordStrength(password);
    if (!strength.ok) {
      setError(strength.message);
      return;
    }

    setSubmitting(true);
    try {
      const result = await completePasswordReset({ password, confirmPassword });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setPassword("");
      setConfirmPassword("");
      setPhase("done");
      // End the recovery session before returning to the normal login page.
      await signOut();
      navigate("/login");
    } catch {
      setError("Could not update your password. Please try again or request a new reset link.");
    } finally {
      setSubmitting(false);
    }
  };

  if (phase === "loading") {
    return (
      <AuthPageShell title="Reset password" description="Checking your recovery session…">
        <div className="rounded-3xl border border-border bg-white/90 p-10 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-brand-red" aria-label="Loading" />
        </div>
      </AuthPageShell>
    );
  }

  if (phase === "done") {
    return (
      <AuthPageShell
        title="Password updated"
        description="Sign in with email and your new Telepizza password."
      >
        <div className="rounded-3xl border border-border bg-white/95 shadow-sm p-6 space-y-4 text-center">
          <p className="text-sm text-muted-foreground">Redirecting you to login…</p>
          <Link href={loginLink}>
            <Button className="w-full rounded-2xl brand-gradient text-white font-bold py-6">
              Continue to login
            </Button>
          </Link>
        </div>
      </AuthPageShell>
    );
  }

  if (phase === "missing") {
    return (
      <AuthPageShell
        title="Reset link expired"
        description="Request a new password reset email to continue."
      >
        <div className="rounded-3xl border border-border bg-white/95 shadow-sm p-6 space-y-4 text-center">
          <p className="text-sm text-brand-red" role="alert">
            {error ?? "This reset link is invalid, expired, or was already used."}
          </p>
          <Link href={requestNewLink}>
            <Button className="w-full rounded-2xl brand-gradient text-white font-bold py-6">
              Request a new link
            </Button>
          </Link>
          <Link href={loginLink}>
            <Button variant="outline" className="w-full rounded-2xl py-6">
              Back to login
            </Button>
          </Link>
        </div>
      </AuthPageShell>
    );
  }

  const formDisabled = !isSupabaseConfigured || submitting;

  return (
    <AuthPageShell
      title="Choose a new password"
      description="Set a Telepizza password for email sign-in. Never enter your Google or Facebook password."
    >
      <form
        onSubmit={(event) => void handleSubmit(event)}
        className="rounded-3xl border border-border bg-white/95 shadow-sm p-6 space-y-4"
        noValidate
      >
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              className="rounded-2xl pr-12"
              required
              disabled={formDisabled}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 px-3 text-muted-foreground hover:text-brand-charcoal disabled:opacity-50"
              onClick={() => setShowPassword((value) => !value)}
              disabled={formDisabled}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">{AUTH_PASSWORD_REQUIREMENTS_COPY}</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <Input
            id="confirmPassword"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              setError(null);
            }}
            className="rounded-2xl"
            required
            disabled={formDisabled}
          />
        </div>
        {error ? (
          <p className="text-sm text-brand-red" role="alert">
            {error}
          </p>
        ) : null}
        <Button
          type="submit"
          className="w-full rounded-2xl brand-gradient text-white font-bold py-6"
          disabled={formDisabled}
        >
          {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Update password"}
        </Button>
      </form>
    </AuthPageShell>
  );
}
