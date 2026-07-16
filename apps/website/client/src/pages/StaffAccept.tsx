import { useEffect, useMemo, useState } from "react";
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

type InvitePreview = {
  email: string;
  fullName: string;
  roleCode: string;
  branchId: string;
  branchName: string | null;
  status: string;
  expiresAt: string | null;
};

export default function StaffAccept() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const token = useMemo(() => new URLSearchParams(search).get("token")?.trim() || "", [search]);

  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(Boolean(token));
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [acceptedEmail, setAcceptedEmail] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadPreview() {
      if (!token) {
        setPreviewError("This invite link is missing a token.");
        setPreviewLoading(false);
        return;
      }
      if (!isApiConfigured) {
        setPreviewError("Staff activation is temporarily unavailable.");
        setPreviewLoading(false);
        return;
      }

      setPreviewLoading(true);
      setPreviewError(null);
      try {
        const data = await fetchApiData<InvitePreview>(
          `/auth/staff/invites/preview?token=${encodeURIComponent(token)}`,
        );
        if (!cancelled) {
          setPreview(data);
        }
      } catch (err) {
        if (!cancelled) {
          if (err instanceof ApiRequestError) {
            setPreviewError(err.message);
          } else {
            setPreviewError("This invite cannot be accepted.");
          }
        }
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    }

    void loadPreview();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!token || !preview) {
      setError("This invite cannot be accepted.");
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
          // fullName is display-only from invite; do not allow role/branch/email overrides
          fullName: preview.fullName,
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

  if (previewLoading) {
    return (
      <AuthPageShell title="Accept staff invite" description="Loading invite details…">
        <div className="flex justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AuthPageShell>
    );
  }

  if (previewError || !preview) {
    return (
      <AuthPageShell title="Accept staff invite" description="This invite cannot be used.">
        <p className="text-sm text-destructive mb-4">{previewError ?? "This invite cannot be accepted."}</p>
        <p className="text-center text-sm text-muted-foreground">
          Already activated? <Link href="/login">Sign in</Link>
        </p>
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
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={preview.email} readOnly disabled />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fullName">Full name</Label>
          <Input id="fullName" value={preview.fullName} readOnly disabled />
        </div>
        <div className="space-y-2">
          <Label htmlFor="roleCode">Role</Label>
          <Input id="roleCode" value={preview.roleCode} readOnly disabled />
        </div>
        <div className="space-y-2">
          <Label htmlFor="branch">Branch</Label>
          <Input
            id="branch"
            value={preview.branchName ?? preview.branchId}
            readOnly
            disabled
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
