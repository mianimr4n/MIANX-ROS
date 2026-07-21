import { useEffect, useId, useState } from "react";
import { Link, useLocation } from "wouter";
import { ChevronDown, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { AuthPageShell } from "@/components/AuthPageShell";
import { SocialAuthButtons } from "@/components/SocialAuthButtons";
import {
  DEFAULT_AUTH_DESTINATION,
  buildAuthHref,
  peekAuthNextFromLocationSearch,
  sanitizeAuthNextPath,
} from "@/lib/auth-redirect";
import { isSupabaseConfigured } from "@/lib/supabase";

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function Login() {
  const [location, navigate] = useLocation();
  const { signIn, isAuthenticated, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const emailPanelId = useId();

  const search = typeof window !== "undefined" ? window.location.search : "";
  const nextPath = sanitizeAuthNextPath(
    peekAuthNextFromLocationSearch(search) ?? peekAuthNextFromLocationSearch(location),
    DEFAULT_AUTH_DESTINATION,
  );

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate(nextPath);
    }
  }, [isAuthenticated, isLoading, navigate, nextPath]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    setError(null);

    const trimmedEmail = email.trim();
    if (!isValidEmail(trimmedEmail)) {
      setError("Enter a valid email address.");
      return;
    }
    if (!password) {
      setError("Enter your password.");
      return;
    }

    setSubmitting(true);

    try {
      const result = await signIn({ email: trimmedEmail, password });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      navigate(nextPath);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <AuthPageShell title="Login" description="Checking your session…">
        <div className="rounded-3xl border border-border bg-white/90 p-10 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-brand-red" />
        </div>
      </AuthPageShell>
    );
  }

  const formDisabled = !isSupabaseConfigured || submitting;
  const recoveryLink = buildAuthHref("/forgot-password", nextPath);
  const registerHref = buildAuthHref("/register", nextPath);

  return (
    <AuthPageShell
      title="Welcome back"
      description="Continue with Google or Facebook — email is also available if you already use it."
      note={
        isSupabaseConfigured
          ? undefined
          : "Customer login is temporarily unavailable until authentication is configured."
      }
    >
      <div className="rounded-3xl border border-border bg-white/95 shadow-sm p-6 space-y-5">
        <SocialAuthButtons
          disabled={formDisabled}
          onError={(message) => setError(message)}
          next={nextPath}
        />

        {error && !emailOpen ? (
          <p className="text-sm text-brand-red" role="alert">
            {error}
          </p>
        ) : null}

        <p className="text-center">
          <Link
            href={recoveryLink}
            className="text-xs font-semibold text-brand-red hover:underline"
          >
            Forgot your password?
          </Link>
        </p>

        <div className="space-y-3">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" aria-hidden />
            <button
              type="button"
              className="inline-flex items-center gap-1.5 font-semibold text-brand-charcoal hover:text-brand-red"
              aria-expanded={emailOpen}
              aria-controls={emailPanelId}
              onClick={() => {
                setEmailOpen((open) => !open);
                setError(null);
              }}
            >
              Use email instead
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${emailOpen ? "rotate-180" : ""}`}
                aria-hidden
              />
            </button>
            <div className="h-px flex-1 bg-border" aria-hidden />
          </div>

          {emailOpen ? (
            <form
              id={emailPanelId}
              onSubmit={handleSubmit}
              className="space-y-4 border-t border-border pt-4"
              noValidate
            >
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                  }}
                  className="rounded-2xl"
                  required
                  disabled={formDisabled}
                  placeholder="you@gmail.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError(null);
                    }}
                    className="rounded-2xl pr-12"
                    required
                    disabled={formDisabled}
                    placeholder="Your password"
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
                <div className="text-right">
                  <Link
                    href={recoveryLink}
                    className="text-xs font-semibold text-brand-red hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
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
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign in with email"}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Created your account with Google or Facebook? Continue with that provider, or set a
                Telepizza password from My Telepizza → Security. Never enter your social-network
                password here.
              </p>
              <p className="text-xs text-muted-foreground text-center">
                Just registered with email? Confirm your email before signing in — check inbox and
                spam, or use Resend on the registration screen.
              </p>
            </form>
          ) : null}
        </div>
      </div>

      <div className="mt-5 space-y-3 text-center text-sm text-muted-foreground">
        <p>
          New here?{" "}
          <Link href={registerHref} className="text-brand-red font-semibold hover:underline">
            Create an account
          </Link>
        </p>
        <p>
          Prefer ordering without an account?{" "}
          <Link href="/menu" className="text-brand-red font-semibold hover:underline">
            Browse the menu
          </Link>
        </p>
      </div>
    </AuthPageShell>
  );
}
