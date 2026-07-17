import { useState } from "react";
import { Link } from "wouter";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { AuthPageShell } from "@/components/AuthPageShell";
import { isSupabaseConfigured } from "@/lib/supabase";

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/**
 * Password recovery request — never reveals whether the email exists.
 */
export default function ForgotPassword() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    setError(null);
    const trimmed = email.trim();
    if (!isValidEmail(trimmed)) {
      setError("Enter a valid email address.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await requestPasswordReset(trimmed);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setSent(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <AuthPageShell
        title="Check your email"
        description="If an account exists for that address, we sent a reset link."
      >
        <div className="rounded-3xl border border-border bg-white/95 shadow-sm p-6 space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            Check inbox and spam for a Telepizza password reset link. The link expires after a short
            time — request another if it no longer works.
          </p>
          <p className="text-sm text-muted-foreground">
            Signed up with Google only? Use Continue with Google on the login page, then set a
            Telepizza password from Account → Security.
          </p>
          <div className="flex flex-col gap-2">
            <Link href="/login">
              <Button className="w-full rounded-2xl brand-gradient text-white font-bold py-6">
                Back to login
              </Button>
            </Link>
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-2xl py-6"
              onClick={() => {
                setSent(false);
                setError(null);
              }}
            >
              Use a different email
            </Button>
          </div>
        </div>
      </AuthPageShell>
    );
  }

  const formDisabled = !isSupabaseConfigured || submitting;

  return (
    <AuthPageShell
      title="Forgot password"
      description="We’ll email a reset link for your Telepizza password — never your Google password."
      note={
        isSupabaseConfigured
          ? undefined
          : "Password reset is temporarily unavailable until authentication is configured."
      }
    >
      <form
        onSubmit={(event) => void handleSubmit(event)}
        className="rounded-3xl border border-border bg-white/95 shadow-sm p-6 space-y-4"
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
          {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send reset link"}
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          For security we always show the same confirmation — we never reveal whether an account
          exists.
        </p>
      </form>

      <div className="mt-5 space-y-3 text-center text-sm text-muted-foreground">
        <p>
          Remembered it?{" "}
          <Link href="/login" className="text-brand-red font-semibold hover:underline">
            Back to login
          </Link>
        </p>
      </div>
    </AuthPageShell>
  );
}
