import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { AuthPageShell } from "@/components/AuthPageShell";
import { AUTH_MIN_PASSWORD_LENGTH, isGoogleOAuthConfigured } from "@/lib/auth-utils";
import { isSupabaseConfigured } from "@/lib/supabase";

export default function Register() {
  const [, navigate] = useLocation();
  const { signUp, isAuthenticated, isLoading } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate("/account");
    }
  }, [isAuthenticated, isLoading, navigate]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setInfo(null);
    setSubmitting(true);

    try {
      const result = await signUp({
        email,
        password,
        fullName: fullName.trim() || undefined,
      });

      if (!result.ok) {
        setError(result.message);
        return;
      }

      if (result.needsEmailConfirmation) {
        setInfo("Account created. Please confirm your email, then sign in.");
        return;
      }

      navigate("/account");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthPageShell
      title="Create Account"
      description="Register with email and password for a secure customer account."
      note={
        isSupabaseConfigured
          ? undefined
          : "Registration is temporarily unavailable until authentication is configured."
      }
    >
      <form onSubmit={handleSubmit} className="rounded-3xl border border-border bg-white p-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fullName">Full name (optional)</Label>
          <Input
            id="fullName"
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value);
              setError(null);
            }}
            className="rounded-2xl"
            disabled={!isSupabaseConfigured || submitting}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError(null);
            }}
            className="rounded-2xl"
            required
            disabled={!isSupabaseConfigured || submitting}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(null);
            }}
            className="rounded-2xl"
            required
            minLength={AUTH_MIN_PASSWORD_LENGTH}
            disabled={!isSupabaseConfigured || submitting}
          />
          <p className="text-xs text-muted-foreground">
            At least {AUTH_MIN_PASSWORD_LENGTH} characters.
          </p>
        </div>
        {error ? (
          <p className="text-sm text-brand-red" role="alert">
            {error}
          </p>
        ) : null}
        {info && <p className="text-sm text-emerald-700">{info}</p>}
        <Button
          type="submit"
          className="w-full rounded-2xl brand-gradient text-white font-bold py-6"
          disabled={!isSupabaseConfigured || submitting}
        >
          {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Register"}
        </Button>
        {/* Google OAuth intentionally omitted — Slice 1 keeps it disabled. */}
        {isGoogleOAuthConfigured() ? (
          <p className="text-xs text-muted-foreground text-center">Google sign-in</p>
        ) : null}
      </form>
      <p className="text-sm text-muted-foreground mt-4 text-center">
        Already registered?{" "}
        <Link href="/login" className="text-brand-red font-semibold hover:underline">
          Login
        </Link>
      </p>
    </AuthPageShell>
  );
}
