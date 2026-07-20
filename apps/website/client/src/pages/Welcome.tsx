import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { AuthPageShell } from "@/components/AuthPageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { rememberAuthNextPath } from "@/lib/auth-redirect";
import { normalizePakistaniMobileE164 } from "@/lib/phone";

/**
 * Post-email-confirmation / first welcome — complete profile (name + PK phone), then hub.
 */
export default function Welcome() {
  const [, navigate] = useLocation();
  const { isAuthenticated, isLoading, profile, user, updateProfile } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      rememberAuthNextPath("/welcome");
      navigate("/login");
    }
  }, [isAuthenticated, isLoading, navigate]);

  useEffect(() => {
    setFullName(profile?.fullName ?? "");
    setPhone(profile?.phone ?? "");
  }, [profile]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError(null);

    const name = fullName.trim();
    if (!name) {
      setError("Enter your name so we can greet you on orders.");
      return;
    }

    let phonePayload: string | null | undefined;
    if (phone.trim()) {
      const normalized = normalizePakistaniMobileE164(phone);
      if (!normalized.ok) {
        setError(normalized.message);
        return;
      }
      phonePayload = normalized.e164;
      setPhone(normalized.e164);
    } else {
      phonePayload = null;
    }

    setBusy(true);
    try {
      const result = await updateProfile({
        fullName: name,
        phone: phonePayload,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      navigate("/my-telepizza#profile");
    } finally {
      setBusy(false);
    }
  }

  if (isLoading || !isAuthenticated) {
    return (
      <AuthPageShell title="Welcome" description="Finishing your Telepizza account…">
        <div className="rounded-3xl border border-border bg-white/90 p-10 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-brand-red" aria-label="Loading" />
        </div>
      </AuthPageShell>
    );
  }

  const email = profile?.email ?? user?.email ?? "";

  return (
    <AuthPageShell
      title="Welcome to Telepizza"
      description="Confirm your profile so checkout and order updates are ready."
    >
      <form
        onSubmit={(event) => void handleSubmit(event)}
        className="rounded-3xl border border-border bg-white/95 shadow-sm p-6 space-y-4"
        noValidate
      >
        {email ? (
          <p className="text-sm text-muted-foreground">
            Signed in as <span className="font-semibold text-brand-charcoal break-all">{email}</span>
          </p>
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="welcome-name">Full name</Label>
          <Input
            id="welcome-name"
            autoComplete="name"
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value);
              setError(null);
            }}
            className="rounded-2xl"
            disabled={busy}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="welcome-phone">Mobile (Pakistan)</Label>
          <Input
            id="welcome-phone"
            autoComplete="tel"
            inputMode="tel"
            placeholder="03XXXXXXXXX or +923XXXXXXXXX"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setError(null);
            }}
            onBlur={() => {
              if (!phone.trim()) return;
              const normalized = normalizePakistaniMobileE164(phone);
              if (normalized.ok) setPhone(normalized.e164);
            }}
            className="rounded-2xl"
            disabled={busy}
          />
          <p className="text-xs text-muted-foreground">
            Saved as +923XXXXXXXXX. Phone stays Unverified until WhatsApp OTP launches.
          </p>
        </div>
        {error ? (
          <p className="text-sm text-brand-red" role="alert">
            {error}
          </p>
        ) : null}
        <Button
          type="submit"
          className="w-full rounded-2xl brand-gradient text-white font-bold py-6"
          disabled={busy}
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Continue to My Telepizza"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full rounded-2xl"
          disabled={busy}
          onClick={() => navigate("/my-telepizza")}
        >
          Skip for now
        </Button>
        <Link
          href="/menu"
          className="block text-center text-sm text-brand-red font-semibold hover:underline"
        >
          Browse the menu
        </Link>
      </form>
    </AuthPageShell>
  );
}
