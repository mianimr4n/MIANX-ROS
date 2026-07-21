import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import {
  isFacebookOAuthConfigured,
  isGoogleOAuthConfigured,
} from "@/lib/auth-utils";
import { isSupabaseConfigured } from "@/lib/supabase";

type SocialAuthButtonsProps = {
  disabled?: boolean;
  onError?: (message: string) => void;
  next?: string | null;
  /**
   * Optional divider under social CTAs. Pass `null` when the parent owns
   * the “Use email instead” accordion control.
   */
  dividerLabel?: string | null;
  showApplePlaceholder?: boolean;
};

/**
 * Social-first customer CTAs: Google, Facebook, optional Apple placeholder.
 * Email/password remains available separately (accordion on Login/Register).
 */
export function SocialAuthButtons({
  disabled = false,
  onError,
  next,
  dividerLabel = null,
  showApplePlaceholder = true,
}: SocialAuthButtonsProps) {
  const { signInWithGoogle, signInWithFacebook } = useAuth();
  const [loadingProvider, setLoadingProvider] = useState<"google" | "facebook" | null>(null);

  if (!isSupabaseConfigured) {
    return null;
  }

  const googleEnabled = isGoogleOAuthConfigured();
  const facebookEnabled = isFacebookOAuthConfigured();
  if (!googleEnabled && !facebookEnabled && !showApplePlaceholder) {
    return null;
  }

  const startGoogle = async () => {
    if (loadingProvider || disabled) return;
    setLoadingProvider("google");
    try {
      const result = await signInWithGoogle({ next });
      if (!result.ok) {
        onError?.(result.message);
        setLoadingProvider(null);
      }
    } catch {
      onError?.("Unable to sign in. Please try again.");
      setLoadingProvider(null);
    }
  };

  const startFacebook = async () => {
    if (loadingProvider || disabled) return;
    setLoadingProvider("facebook");
    try {
      const result = await signInWithFacebook({ next });
      if (!result.ok) {
        onError?.(result.message);
        setLoadingProvider(null);
      }
    } catch {
      onError?.("Unable to sign in. Please try again.");
      setLoadingProvider(null);
    }
  };

  return (
    <div className="space-y-3">
      {googleEnabled ? (
        <Button
          type="button"
          variant="outline"
          className="min-h-12 w-full rounded-2xl py-6 text-base font-semibold"
          disabled={disabled || loadingProvider !== null}
          onClick={() => void startGoogle()}
          aria-label="Continue with Google"
        >
          {loadingProvider === "google" ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <GoogleGlyph className="mr-2 h-5 w-5" />
              Continue with Google
            </>
          )}
        </Button>
      ) : null}

      {facebookEnabled ? (
        <Button
          type="button"
          variant="outline"
          className="min-h-12 w-full rounded-2xl py-6 text-base font-semibold"
          disabled={disabled || loadingProvider !== null}
          onClick={() => void startFacebook()}
          aria-label="Continue with Facebook"
        >
          {loadingProvider === "facebook" ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <FacebookGlyph className="mr-2 h-5 w-5" />
              Continue with Facebook
            </>
          )}
        </Button>
      ) : null}

      {showApplePlaceholder ? (
        <Button
          type="button"
          variant="outline"
          className="min-h-12 w-full rounded-2xl py-6 text-base font-semibold opacity-70"
          disabled
          aria-label="Continue with Apple — coming soon"
        >
          <AppleGlyph className="mr-2 h-5 w-5" />
          Continue with Apple
          <span className="ml-2 text-xs font-medium text-muted-foreground">(Coming soon)</span>
        </Button>
      ) : null}

      {dividerLabel ? (
        <div className="flex items-center gap-3 pt-1 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" />
          <span>{dividerLabel}</span>
          <div className="h-px flex-1 bg-border" />
        </div>
      ) : null}
    </div>
  );
}

/** @deprecated Prefer SocialAuthButtons — kept for legacy imports/tests. */
export function GoogleSignInButton({
  disabled = false,
  onError,
  next,
  dividerLabel = "or",
}: {
  disabled?: boolean;
  onError?: (message: string) => void;
  label?: string;
  placement?: "primary" | "secondary";
  dividerLabel?: string;
  next?: string | null;
}) {
  return (
    <SocialAuthButtons
      disabled={disabled}
      onError={onError}
      next={next}
      dividerLabel={dividerLabel}
      showApplePlaceholder={false}
    />
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

function FacebookGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#1877F2"
        d="M24 12.07C24 5.41 18.63 0 12 0S0 5.41 0 12.07C0 18.1 4.39 23.09 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.7 4.53-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.95.93-1.95 1.89v2.26h3.32l-.53 3.49h-2.79V24C19.61 23.09 24 18.1 24 12.07z"
      />
    </svg>
  );
}

function AppleGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M16.37 12.63c.03-2.4 1.96-3.55 2.05-3.6-1.12-1.64-2.86-1.86-3.48-1.89-1.48-.15-2.89.87-3.64.87-.75 0-1.91-.85-3.14-.83-1.62.02-3.11.94-3.94 2.39-1.68 2.91-.43 7.22 1.21 9.58.8 1.15 1.76 2.45 3.02 2.4 1.21-.05 1.67-.78 3.14-.78 1.46 0 1.88.78 3.16.76 1.31-.02 2.14-1.17 2.94-2.33.92-1.34 1.3-2.64 1.32-2.71-.03-.01-2.53-.97-2.56-3.86zM14.1 5.45c.67-.81 1.12-1.93.99-3.05-1.01.04-2.22.68-2.94 1.49-.64.72-1.2 1.87-1.05 2.97 1.11.09 2.24-.56 3-.1.41z" />
    </svg>
  );
}
