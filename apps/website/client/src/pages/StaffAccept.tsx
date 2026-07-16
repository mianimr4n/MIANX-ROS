import { useMemo, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { Loader2 } from "lucide-react";

import { AuthPageShell } from "@/components/AuthPageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiRequestError, fetchApiData, isApiConfigured } from "@/lib/api";

type AcceptResponse = {
  authUserId: string;
  email: string;
  profileReady: boolean;
};

export default function StaffAccept() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const token = useMemo(() => new URLSearchParams(search).get("token")?.trim() || "", [search]);

  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [acceptedEmail, setAcceptedEmail] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!token) {
      setError("This invite link is missing a token.");
      return;
    }
    if (!isApiConfigured) {
      setError("Staff activation is temporarily unavailable.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const data = await fetchApiData<AcceptResponse>("/auth/staff/invites/accept", {
        method: "POST",
        body: JSON.stringify({
          token,
          password,
          fullName: fullName.trim() || undefined,
        }),
      });
      setAcceptedEmail(data.email);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message);
      } else {
        setError("Unable to activate this invite. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (acceptedEmail) {
    return (
      <AuthPageShell
        title="Account activated"
        description="Your staff account is ready. Sign in with your email and password."
      >
        <p className="text-sm text-muted-foreground mb-4">Activated for {acceptedEmail}</p>
        <Button className="w-full" onClick={() => navigate("/login")}>
          Continue to sign in
        </Button>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell
      title="Accept staff invite"
      description="Set your password to activate your Telepizza staff account."
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="fullName">Full name</Label>
          <Input
            id="fullName"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            autoComplete="name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            required
            minLength={8}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
            required
            minLength={8}
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button className="w-full" type="submit" disabled={submitting || !token}>
          {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Activate account
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-muted-foreground">
        Already activated? <Link href="/login">Sign in</Link>
      </p>
    </AuthPageShell>
  );
}
