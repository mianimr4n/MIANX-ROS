import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { AuthPageShell } from "@/components/AuthPageShell";
import { AUTH_PASSWORD_REQUIREMENTS_COPY } from "@/lib/auth-utils";
import { isSupabaseConfigured } from "@/lib/supabase";

/**
 * Completes password recovery after the customer opens the email link.
 * Requires an authenticated recovery session from `/auth/callback`.
 */
export default function ResetPassword() {
  const [, navigate] = useLocation();
  const { isAuthenticated, isLoading, completePasswordReset } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setError(
        (current) =>
          current ??
          "This reset link is invalid or expired. Request a new password reset email.",
      );
    }
  }, [isAuthenticated, isLoading]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting || !isAuthenticated) return;

    setError(null);
    setSubmitting(true);
    try {
      const result = await completePasswordReset({ password, confirmPassword });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setDone(true);
      setPassword("");
      setConfirmPassword("");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <AuthPageShell title="Reset password" description="Checking your recovery session…">
        <div className="rounded-3xl border border-border bg-white/90 p-10 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-brand-red" />
        </div>
      </AuthPageShell>
    );
  }

  if (done) {
    return (
      <AuthPageShell
        title="Password updated"
        description="You can now sign in with email and your new Telepizza password."
      >
        <div className="rounded-3xl border border-border bg-white/95 shadow-sm p-6 space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            If you also use Google on this account, both Google and email/password sign-in still
            work.
          </p>
          <Button
            className="w-full rounded-2xl brand-gradient text-white font-bold py-6"
            onClick={() => navigate("/my-telepizza#security")}
          >
            Go to My Telepizza
          </Button>
          <Link href="/login">
            <Button variant="outline" className="w-full rounded-2xl py-6">
              Back to login
            </Button>
          </Link>
        </div>
      </AuthPageShell>
    );
  }

  if (!isAuthenticated) {
    return (
      <AuthPageShell
        title="Reset link expired"
        description="Request a new password reset email to continue."
      >
        <div className="rounded-3xl border border-border bg-white/95 shadow-sm p-6 space-y-4 text-center">
          <p className="text-sm text-brand-red" role="alert">
            {error ?? "This reset link is invalid or expired."}
          </p>
          <Link href="/forgot-password">
            <Button className="w-full rounded-2xl brand-gradient text-white font-bold py-6">
              Request a new link
            </Button>
          </Link>
          <Link href="/login">
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
      description="Set a Telepizza password for email sign-in. Never enter your Google password."
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
