import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { isGoogleOAuthConfigured } from "@/lib/auth-utils";
import { isSupabaseConfigured } from "@/lib/supabase";

type GoogleSignInButtonProps = {
  disabled?: boolean;
  onError?: (message: string) => void;
  label?: string;
  /** Gmail-first: show Google above the email form with an "or" divider below. */
  placement?: "primary" | "secondary";
  dividerLabel?: string;
  next?: string | null;
};

export function GoogleSignInButton({
  disabled = false,
  onError,
  label = "Continue with Google",
  placement = "primary",
  dividerLabel = "or",
  next,
}: GoogleSignInButtonProps) {
  const { signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);

  if (!isSupabaseConfigured || !isGoogleOAuthConfigured()) {
    return null;
  }

  const handleClick = async () => {
    if (loading || disabled) return;
    setLoading(true);
    try {
      const result = await signInWithGoogle({ next });
      if (!result.ok) {
        onError?.(result.message);
        setLoading(false);
      }
      // On success, browser redirects to Google — keep loading spinner.
    } catch {
      onError?.("Could not start Google sign-in. Please try again.");
      setLoading(false);
    }
  };

  const divider = (
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      <div className="h-px flex-1 bg-border" />
      <span>{dividerLabel}</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );

  const button = (
    <Button
      type="button"
      variant="outline"
      className="w-full rounded-2xl py-6 font-semibold"
      disabled={disabled || loading}
      onClick={() => void handleClick()}
    >
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <>
          <GoogleGlyph className="w-5 h-5 mr-2" />
          {label}
        </>
      )}
    </Button>
  );

  return (
    <div className="space-y-3">
      {placement === "secondary" ? divider : null}
      {button}
      {placement === "primary" ? divider : null}
    </div>
  );
}

function GoogleGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7 12.9 19.5C14.7 15.1 19 12 24 12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 10-2 13.6-5.3l-6.3-5.3C29.3 35.1 26.8 36 24 36c-5.3 0-9.7-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.3 4.1-4.2 5.4l.1.1 6.3 5.3C39 40.3 44 36 44 24c0-1.2-.1-2.3-.4-3.5z"
      />
    </svg>
  );
}
