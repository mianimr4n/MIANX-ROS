import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { AuthPageShell } from "@/components/AuthPageShell";
import { useAuth } from "@/contexts/AuthContext";
import {
  consumeAuthEmailFlow,
  consumeAuthNextPath,
  DEFAULT_AUTH_DESTINATION,
  POST_SIGNUP_DESTINATION,
  mapOAuthCallbackError,
  peekAuthEmailFlowFromLocation,
  peekAuthNextFromLocationSearch,
  sanitizeAuthNextPath,
} from "@/lib/auth-redirect";
import { Button } from "@/components/ui/button";

/**
 * Dedicated OAuth / email-link callback landing page.
 * Supabase PKCE restores the session via detectSessionInUrl; we then route
 * to a safe internal destination only (including recovery → reset password).
 */
export default function AuthCallback() {
  const [, navigate] = useLocation();
  const { isAuthenticated, isLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const redirected = useRef(false);
  const flowHint = useRef(peekAuthEmailFlowFromLocation() ?? consumeAuthEmailFlow());

  useEffect(() => {
    if (error || isAuthenticated) return;

    const timeout = window.setTimeout(() => {
      if (!redirected.current) {
        setError((current) => current ?? "Unable to sign in. Please try again.");
      }
    }, 30_000);

    return () => window.clearTimeout(timeout);
  }, [error, isAuthenticated]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const oauthError =
      params.get("error") ||
      params.get("error_code") ||
      params.get("error_description") ||
      hashParams.get("error") ||
      hashParams.get("error_code") ||
      hashParams.get("error_description");

    if (oauthError) {
      setError(mapOAuthCallbackError(oauthError));
      // Drop sensitive query/hash fragments from the address bar.
      window.history.replaceState({}, document.title, "/auth/callback");
    }
  }, []);

  useEffect(() => {
    if (error || redirected.current || isLoading) return;

    const hasAuthCode =
      typeof window !== "undefined" &&
      (new URLSearchParams(window.location.search).has("code") ||
        window.location.hash.includes("access_token"));

    if (!isAuthenticated) {
      // Still exchanging PKCE code — keep the loading state.
      if (hasAuthCode) return;
      setError((current) => current ?? "Unable to sign in. Please try again.");
      return;
    }

    redirected.current = true;
    const fromQuery = peekAuthNextFromLocationSearch(
      typeof window !== "undefined" ? window.location.search : "",
    );
    const storedNext = consumeAuthNextPath("");
    const flow = flowHint.current;

    let destination = DEFAULT_AUTH_DESTINATION;
    if (flow === "recovery" || storedNext === "/reset-password") {
      destination = "/reset-password";
    } else if (flow === "email_change") {
      destination = sanitizeAuthNextPath(storedNext || "/my-telepizza#security", "/my-telepizza#security");
    } else if (flow === "signup") {
      // Email confirmation → Welcome / profile completion (not a generic dashboard).
      destination = POST_SIGNUP_DESTINATION;
    } else {
      destination = sanitizeAuthNextPath(
        fromQuery ?? (storedNext || DEFAULT_AUTH_DESTINATION),
        DEFAULT_AUTH_DESTINATION,
      );
    }

    if (typeof window !== "undefined") {
      window.history.replaceState({}, document.title, destination);
    }
    navigate(destination);
  }, [error, isAuthenticated, isLoading, navigate]);

  if (error) {
    const isExpired = /expired|invalid or was already used/i.test(error);
    return (
      <AuthPageShell
        title={isExpired ? "Link expired" : "Sign-in interrupted"}
        description="You can try again from login, or request a new email link."
      >
        <div className="rounded-3xl border border-border bg-white/95 shadow-sm p-6 space-y-4 text-center">
          <p className="text-sm text-brand-red" role="alert">
            {error}
          </p>
          <div className="flex flex-col gap-2">
            <Link href="/login">
              <Button className="w-full rounded-2xl brand-gradient text-white font-bold py-6">
                Back to login
              </Button>
            </Link>
            <Link href="/forgot-password">
              <Button variant="outline" className="w-full rounded-2xl py-6">
                Forgot password
              </Button>
            </Link>
            <Link href="/menu">
              <Button variant="outline" className="w-full rounded-2xl py-6">
                Browse the menu
              </Button>
            </Link>
          </div>
        </div>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell title="Signing you in" description="Restoring your Telepizza session…">
      <div className="rounded-3xl border border-border bg-white/90 p-10 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-brand-red" aria-label="Loading" />
      </div>
    </AuthPageShell>
  );
}
