import { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { ChevronDown, Eye, EyeOff, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { AuthPageShell } from "@/components/AuthPageShell";
import { SocialAuthButtons } from "@/components/SocialAuthButtons";
import {
  AUTH_MIN_PASSWORD_LENGTH,
  AUTH_PASSWORD_REQUIREMENTS_COPY,
  validateSignupInput,
} from "@/lib/auth-utils";
import {
  DEFAULT_AUTH_DESTINATION,
  peekAuthNextFromLocationSearch,
  sanitizeAuthNextPath,
} from "@/lib/auth-redirect";
import { isSupabaseConfigured } from "@/lib/supabase";

const RESEND_COOLDOWN_SECONDS = 60;
const GMAIL_INBOX_URL = "https://mail.google.com/mail/u/0/#inbox";

export default function Register() {
  const [location, navigate] = useLocation();
  const { signUp, resendConfirmationEmail, isAuthenticated, isLoading } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [emailOpen, setEmailOpen] = useState(false);
  const emailPanelId = useId();
  const signupCompletedRef = useRef(false);

  const search = typeof window !== "undefined" ? window.location.search : "";
  const nextPath = sanitizeAuthNextPath(
    peekAuthNextFromLocationSearch(search) ?? peekAuthNextFromLocationSearch(location),
    DEFAULT_AUTH_DESTINATION,
  );

  useEffect(() => {
    if (!isLoading && isAuthenticated && !awaitingConfirmation) {
      navigate(nextPath);
    }
  }, [isAuthenticated, isLoading, navigate, awaitingConfirmation, nextPath]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setTimeout(() => setResendCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting || signupCompletedRef.current || awaitingConfirmation) return;

    setError(null);
    setInfo(null);

    const validated = validateSignupInput({
      email,
      password,
      fullName: fullName.trim() || undefined,
    });
    if (!validated.ok) {
      setError(validated.message);
      return;
    }

    setSubmitting(true);

    try {
      const result = await signUp({
        email: validated.email,
        password: validated.password,
        fullName: validated.fullName,
      });

      if (!result.ok) {
        setError(result.message);
        return;
      }

      signupCompletedRef.current = true;

      if (result.needsEmailConfirmation) {
        setAwaitingConfirmation(true);
        setEmail(validated.email);
        setInfo(null);
        setResendCooldown(RESEND_COOLDOWN_SECONDS);
        return;
      }

      navigate(nextPath);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (resendBusy || resendCooldown > 0 || !email.trim()) {
      if (resendCooldown > 0) {
        setError(`Too many attempts, please wait ${resendCooldown}s.`);
      }
      return;
    }
    setError(null);
    setInfo(null);
    setResendBusy(true);
    try {
      const result = await resendConfirmationEmail(email);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setInfo("Email resent successfully. Check inbox and spam.");
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch {
      setError("We could not send the confirmation email right now. Please try again later.");
    } finally {
      setResendBusy(false);
    }
  };

  if (isLoading) {
    return (
      <AuthPageShell title="Create Account" description="Checking your session…">
        <div className="rounded-3xl border border-border bg-white/90 p-10 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-brand-red" />
        </div>
      </AuthPageShell>
    );
  }

  const formDisabled = !isSupabaseConfigured || submitting || awaitingConfirmation;

  return (
    <AuthPageShell
      title={awaitingConfirmation ? "Account Created" : "Create Account"}
      description={
        awaitingConfirmation
          ? "Confirm your email to finish signing up."
          : "Continue with Google or Facebook — or create an account with email."
      }
      note={
        isSupabaseConfigured
          ? undefined
          : "Registration is temporarily unavailable until authentication is configured."
      }
    >
      {awaitingConfirmation ? (
        <div className="rounded-3xl border border-border bg-white/95 shadow-sm p-6 space-y-4">
          <div className="flex justify-center">
            <div className="rounded-full bg-brand-red/10 p-3">
              <Mail className="w-7 h-7 text-brand-red" aria-hidden />
            </div>
          </div>
          <p className="text-center text-sm text-brand-charcoal">
            Account Created. We&apos;ve sent a verification email to{" "}
            <span className="font-semibold break-all">{email}</span>.
          </p>
          <p className="text-center text-xs text-muted-foreground">
            Didn&apos;t receive it? Check your spam folder. After you confirm, you&apos;ll land on a
            welcome / profile page — you cannot sign in until your email is confirmed.
          </p>
          <p className="text-center text-sm font-semibold text-brand-charcoal">
            {"Didn't receive it?"}
          </p>
          {error ? (
            <p className="text-sm text-brand-red text-center" role="alert">
              {error}
            </p>
          ) : null}
          {info ? (
            <p className="text-sm text-emerald-700 text-center" role="status">
              {info}
            </p>
          ) : null}
          <Button
            type="button"
            variant="outline"
            className="w-full rounded-2xl font-semibold"
            disabled={resendBusy || resendCooldown > 0 || !isSupabaseConfigured}
            onClick={() => void handleResend()}
          >
            {resendBusy ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : resendCooldown > 0 ? (
              `Resend Email (${resendCooldown}s)`
            ) : (
              "Resend Email"
            )}
          </Button>
          <a
            href={GMAIL_INBOX_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <Button type="button" variant="secondary" className="w-full rounded-2xl font-semibold">
              Open Gmail
            </Button>
          </a>
          <a
            href={`mailto:${email}`}
            className="block text-center text-sm text-muted-foreground hover:text-brand-charcoal hover:underline"
          >
            Open Mail App
          </a>
          <Link
            href={
              nextPath !== DEFAULT_AUTH_DESTINATION
                ? `/login?next=${encodeURIComponent(nextPath)}`
                : "/login"
            }
            className="block text-center text-sm text-brand-red font-semibold hover:underline"
          >
            Go to login
          </Link>
        </div>
      ) : (
        <>
          <div className="rounded-3xl border border-border bg-white/95 shadow-sm p-6 space-y-5">
            <SocialAuthButtons
              disabled={formDisabled}
              onError={(message) => {
                setInfo(null);
                setError(message);
              }}
              next={nextPath}
            />

            {error && !emailOpen ? (
              <p className="text-sm text-brand-red" role="alert">
                {error}
              </p>
            ) : null}

            <div className="space-y-3">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <div className="h-px flex-1 bg-border" />
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
                <div className="h-px flex-1 bg-border" />
              </div>

              {emailOpen ? (
                <form
                  id={emailPanelId}
                  onSubmit={handleSubmit}
                  className="space-y-4 border-t border-border pt-4"
                  noValidate
                >
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
                      disabled={formDisabled}
                      autoComplete="name"
                    />
                    <p className="text-xs text-muted-foreground">
                      Optional for email signup. Google or Facebook will use the name from your
                      provider — we won&apos;t ask again if it&apos;s already there.
                    </p>
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
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          setError(null);
                        }}
                        className="rounded-2xl pr-12"
                        required
                        minLength={AUTH_MIN_PASSWORD_LENGTH}
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
                  {error ? (
                    <p className="text-sm text-brand-red" role="alert">
                      {error}
                    </p>
                  ) : null}
                  {info ? <p className="text-sm text-emerald-700">{info}</p> : null}
                  <Button
                    type="submit"
                    className="w-full rounded-2xl brand-gradient text-white font-bold py-6"
                    disabled={formDisabled}
                  >
                    {submitting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      "Create account with email"
                    )}
                  </Button>
                </form>
              ) : null}
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-4 text-center">
            Already registered?{" "}
            <Link
              href={
                nextPath !== DEFAULT_AUTH_DESTINATION
                  ? `/login?next=${encodeURIComponent(nextPath)}`
                  : "/login"
              }
              className="text-brand-red font-semibold hover:underline"
            >
              Login
            </Link>
          </p>
        </>
      )}
    </AuthPageShell>
  );
}
