import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { AuthPageShell } from "@/components/AuthPageShell";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import {
  DEFAULT_AUTH_DESTINATION,
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

  return (
    <AuthPageShell
      title="Welcome back"
      description="Sign in with Google or email to manage orders and account details."
      note={
        isSupabaseConfigured
          ? undefined
          : "Customer login is temporarily unavailable until authentication is configured."
      }
    >
      <form
        onSubmit={handleSubmit}
        className="rounded-3xl border border-border bg-white/95 shadow-sm p-6 space-y-4"
        noValidate
      >
        <GoogleSignInButton
          disabled={formDisabled}
          onError={(message) => setError(message)}
          label="Continue with Google"
          placement="primary"
          dividerLabel="or sign in with email"
          next={nextPath}
        />
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
              href="/forgot-password"
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
          Created your account with Google? Continue with Google, or set a Telepizza password from
          Account → Security. Never enter your Google password here.
        </p>
        <p className="text-xs text-muted-foreground text-center">
          Just registered with email? Confirm your email before signing in — check inbox and spam,
          or use Resend on the registration screen.
        </p>
      </form>

      <div className="mt-5 space-y-3 text-center text-sm text-muted-foreground">
        <p>
          New here?{" "}
          <Link href="/register" className="text-brand-red font-semibold hover:underline">
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
