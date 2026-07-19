import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "wouter";
import { Eye, EyeOff, Loader2, Shield, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import {
  AUTH_MIN_PASSWORD_LENGTH,
  AUTH_PASSWORD_REQUIREMENTS_COPY,
  hasEmailIdentity,
  hasGoogleIdentity,
  isFirstTimePasswordAttach,
} from "@/lib/auth-utils";
import {
  loadNotificationPreferences,
  NOTIFICATION_PREFS_LABELS,
  saveNotificationPreferences,
  type NotificationPreferenceKey,
  type NotificationPreferences,
} from "@/lib/customer-notification-prefs";
import { fetchCloudReviews, reviewsAvailable, type CloudReview } from "@/lib/customer-reviews-api";

type SettingsSection = "profile" | "security" | "prefs" | "reviews" | "privacy" | "account";

const SECTIONS: Array<{ id: SettingsSection; label: string }> = [
  { id: "profile", label: "Profile" },
  { id: "security", label: "Security" },
  { id: "prefs", label: "Notifications" },
  { id: "reviews", label: "Reviews" },
  { id: "privacy", label: "Privacy" },
  { id: "account", label: "Account" },
];

export default function Settings() {
  const {
    profile,
    user,
    session,
    isAuthenticated,
    isLoading,
    signOut,
    updateProfile,
    setPassword,
    requestEmailChange,
  } = useAuth();

  const [section, setSection] = useState<SettingsSection>("profile");
  const ownerKey = user?.id || profile?.email || user?.email || "";

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileNotice, setProfileNotice] = useState<string | null>(null);
  const [profileBusy, setProfileBusy] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPasswordValue] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordNotice, setPasswordNotice] = useState<string | null>(null);
  const [passwordBusy, setPasswordBusy] = useState(false);

  const [newEmail, setNewEmail] = useState("");
  const [emailChangePassword, setEmailChangePassword] = useState("");
  const [emailChangeError, setEmailChangeError] = useState<string | null>(null);
  const [emailChangeNotice, setEmailChangeNotice] = useState<string | null>(null);
  const [emailChangeBusy, setEmailChangeBusy] = useState(false);

  const [prefs, setPrefs] = useState<NotificationPreferences>(() =>
    loadNotificationPreferences(ownerKey),
  );
  const [prefsNotice, setPrefsNotice] = useState<string | null>(null);

  const [reviews, setReviews] = useState<CloudReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState<string | null>(null);

  useEffect(() => {
    setFullName(profile?.fullName ?? "");
    setPhone(profile?.phone ?? "");
  }, [profile]);

  useEffect(() => {
    if (!ownerKey) return;
    setPrefs(loadNotificationPreferences(ownerKey));
  }, [ownerKey]);

  useEffect(() => {
    if (section !== "reviews" || !session?.access_token || !reviewsAvailable()) return;
    setReviewsLoading(true);
    setReviewsError(null);
    void fetchCloudReviews(session.access_token)
      .then(setReviews)
      .catch((error) =>
        setReviewsError(error instanceof Error ? error.message : "Could not load reviews."),
      )
      .finally(() => setReviewsLoading(false));
  }, [section, session?.access_token]);

  const email = profile?.email || user?.email || null;
  const googleConnected = user ? hasGoogleIdentity(user) : false;
  const emailPasswordAvailable = user ? hasEmailIdentity(user) : false;
  const firstTimePassword = user ? isFirstTimePasswordAttach(user) : false;
  const emailVerified = Boolean(user?.email_confirmed_at);

  const passwordChecks = useMemo(
    () => [
      {
        id: "length",
        label: `At least ${AUTH_MIN_PASSWORD_LENGTH} characters`,
        met: password.length >= AUTH_MIN_PASSWORD_LENGTH,
      },
      { id: "upper", label: "One uppercase letter", met: /[A-Z]/.test(password) },
      { id: "lower", label: "One lowercase letter", met: /[a-z]/.test(password) },
      { id: "digit", label: "One number", met: /\d/.test(password) },
      { id: "symbol", label: "One special character", met: /[^A-Za-z0-9]/.test(password) },
    ],
    [password],
  );

  if (isLoading) {
    return (
      <div className="container py-16 text-center text-muted-foreground" aria-busy="true">
        Loading settings…
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="container py-16 text-center">
        <p className="text-muted-foreground mb-4">Sign in to manage your settings.</p>
        <Link href="/login?next=%2Fsettings">
          <Button className="rounded-2xl brand-gradient text-white">Sign in</Button>
        </Link>
      </div>
    );
  }

  async function handleSaveProfile(event: FormEvent) {
    event.preventDefault();
    if (profileBusy) return;
    setProfileError(null);
    setProfileNotice(null);
    setProfileBusy(true);
    try {
      const result = await updateProfile({
        fullName,
        phone: phone.trim() ? phone : null,
      });
      if (!result.ok) {
        setProfileError(result.message);
        return;
      }
      setProfileNotice("Profile saved.");
    } finally {
      setProfileBusy(false);
    }
  }

  async function handleSetPassword(event: FormEvent) {
    event.preventDefault();
    if (passwordBusy) return;
    setPasswordError(null);
    setPasswordNotice(null);
    setPasswordBusy(true);
    try {
      const result = await setPassword({
        password,
        confirmPassword,
        currentPassword: firstTimePassword ? undefined : currentPassword,
      });
      if (!result.ok) {
        setPasswordError(result.message);
        return;
      }
      setCurrentPassword("");
      setPasswordValue("");
      setConfirmPassword("");
      setPasswordNotice("Password updated.");
    } finally {
      setPasswordBusy(false);
    }
  }

  async function handleEmailChange(event: FormEvent) {
    event.preventDefault();
    if (emailChangeBusy) return;
    setEmailChangeError(null);
    setEmailChangeNotice(null);
    setEmailChangeBusy(true);
    try {
      const result = await requestEmailChange({
        newEmail,
        currentPassword: emailPasswordAvailable ? emailChangePassword : undefined,
      });
      if (!result.ok) {
        setEmailChangeError(result.message);
        return;
      }
      setEmailChangePassword("");
      setEmailChangeNotice("Check your inbox to confirm the new email.");
    } finally {
      setEmailChangeBusy(false);
    }
  }

  function handlePrefChange(key: NotificationPreferenceKey, enabled: boolean) {
    const next = { ...prefs, [key]: enabled };
    setPrefs(next);
    saveNotificationPreferences(ownerKey, next);
    setPrefsNotice("Preferences saved on this device.");
  }

  return (
    <div className="min-h-screen bg-background py-10">
      <div className="container max-w-5xl space-y-6">
        <header className="overflow-hidden rounded-3xl border border-border bg-white shadow-sm">
          <div className="h-1.5 brand-gradient" aria-hidden="true" />
          <div className="p-4 sm:p-6">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-brand-red">
              My Telepizza
            </p>
            <h1 className="brand-heading text-3xl">Settings</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Profile, security, notification prefs, and account controls.
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
          <nav
            aria-label="Settings sections"
            className="rounded-3xl border border-border bg-white p-3 h-fit shadow-sm"
          >
            <ul className="flex flex-wrap gap-1 lg:flex-col">
              {SECTIONS.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setSection(item.id)}
                    className={`w-full rounded-2xl px-3 py-2.5 text-left text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2 ${
                      section === item.id
                        ? "bg-brand-red/10 text-brand-red"
                        : "text-brand-charcoal hover:bg-muted/60"
                    }`}
                    aria-current={section === item.id ? "page" : undefined}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <div className="min-w-0 space-y-4">
            {section === "profile" ? (
              <form
                onSubmit={(event) => void handleSaveProfile(event)}
                className="rounded-3xl border border-border bg-white p-4 shadow-sm sm:p-6 space-y-4"
              >
                <h2 className="font-bold text-lg">Profile</h2>
                <div className="space-y-2">
                  <Label htmlFor="settings-fullName">Full name</Label>
                  <Input
                    id="settings-fullName"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    className="rounded-2xl"
                    disabled={profileBusy}
                    autoComplete="name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settings-email">Email</Label>
                  <Input
                    id="settings-email"
                    value={email ?? ""}
                    readOnly
                    disabled
                    className="rounded-2xl bg-muted/40"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settings-phone">Phone</Label>
                  <Input
                    id="settings-phone"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    className="rounded-2xl"
                    disabled={profileBusy}
                    inputMode="tel"
                    autoComplete="tel"
                  />
                </div>
                {profileError ? (
                  <p className="text-sm text-brand-red" role="alert">
                    {profileError}
                  </p>
                ) : null}
                {profileNotice ? (
                  <p className="text-sm text-emerald-700" role="status">
                    {profileNotice}
                  </p>
                ) : null}
                <Button
                  type="submit"
                  className="rounded-2xl brand-gradient text-white font-semibold"
                  disabled={profileBusy}
                >
                  {profileBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save profile"}
                </Button>
              </form>
            ) : null}

            {section === "security" ? (
              <section className="rounded-3xl border border-border bg-white p-4 shadow-sm sm:p-6 space-y-6">
                <div>
                  <h2 className="font-bold text-lg flex items-center gap-2">
                    <Shield className="h-5 w-5 text-brand-red" />
                    Security
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Email {emailVerified ? "verified" : "pending verification"} · Google{" "}
                    {googleConnected ? "connected" : "not connected"} · Password{" "}
                    {emailPasswordAvailable ? "ready" : "not set"}
                  </p>
                </div>

                <form onSubmit={(event) => void handleSetPassword(event)} className="space-y-4">
                  <h3 className="font-semibold">
                    {firstTimePassword ? "Set a Telepizza password" : "Update password"}
                  </h3>
                  <p className="text-xs text-muted-foreground">{AUTH_PASSWORD_REQUIREMENTS_COPY}</p>
                  {!firstTimePassword ? (
                    <div className="space-y-2">
                      <Label htmlFor="settings-currentPassword">Current password</Label>
                      <Input
                        id="settings-currentPassword"
                        type={showPassword ? "text" : "password"}
                        value={currentPassword}
                        onChange={(event) => setCurrentPassword(event.target.value)}
                        className="rounded-2xl"
                        autoComplete="current-password"
                      />
                    </div>
                  ) : null}
                  <div className="space-y-2">
                    <Label htmlFor="settings-newPassword">New password</Label>
                    <div className="relative">
                      <Input
                        id="settings-newPassword"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(event) => setPasswordValue(event.target.value)}
                        className="rounded-2xl pr-12"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 rounded-r-2xl px-3 text-muted-foreground"
                        onClick={() => setShowPassword((value) => !value)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  <ul className="space-y-1 text-xs">
                    {passwordChecks.map((check) => (
                      <li
                        key={check.id}
                        className={check.met ? "text-emerald-700 font-semibold" : "text-muted-foreground"}
                      >
                        {check.met ? "✓" : "○"} {check.label}
                      </li>
                    ))}
                  </ul>
                  <div className="space-y-2">
                    <Label htmlFor="settings-confirmPassword">Confirm password</Label>
                    <Input
                      id="settings-confirmPassword"
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      className="rounded-2xl"
                      autoComplete="new-password"
                    />
                  </div>
                  {passwordError ? (
                    <p className="text-sm text-brand-red" role="alert">
                      {passwordError}
                    </p>
                  ) : null}
                  {passwordNotice ? (
                    <p className="text-sm text-emerald-700" role="status">
                      {passwordNotice}
                    </p>
                  ) : null}
                  <Button type="submit" variant="outline" className="rounded-2xl" disabled={passwordBusy}>
                    {passwordBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save password"}
                  </Button>
                </form>

                <form onSubmit={(event) => void handleEmailChange(event)} className="space-y-4 border-t pt-4">
                  <h3 className="font-semibold">Change email</h3>
                  <div className="space-y-2">
                    <Label htmlFor="settings-newEmail">New email</Label>
                    <Input
                      id="settings-newEmail"
                      type="email"
                      value={newEmail}
                      onChange={(event) => setNewEmail(event.target.value)}
                      className="rounded-2xl"
                      autoComplete="email"
                    />
                  </div>
                  {emailPasswordAvailable ? (
                    <div className="space-y-2">
                      <Label htmlFor="settings-emailPassword">Current Telepizza password</Label>
                      <Input
                        id="settings-emailPassword"
                        type="password"
                        value={emailChangePassword}
                        onChange={(event) => setEmailChangePassword(event.target.value)}
                        className="rounded-2xl"
                        autoComplete="current-password"
                      />
                    </div>
                  ) : null}
                  {emailChangeError ? (
                    <p className="text-sm text-brand-red" role="alert">
                      {emailChangeError}
                    </p>
                  ) : null}
                  {emailChangeNotice ? (
                    <p className="text-sm text-emerald-700" role="status">
                      {emailChangeNotice}
                    </p>
                  ) : null}
                  <Button type="submit" variant="outline" className="rounded-2xl" disabled={emailChangeBusy}>
                    {emailChangeBusy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Send confirmation"
                    )}
                  </Button>
                </form>
              </section>
            ) : null}

            {section === "prefs" ? (
              <section className="rounded-3xl border border-border bg-white p-4 shadow-sm sm:p-6 space-y-4">
                <div>
                  <h2 className="font-bold text-lg">Notification preferences</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Saved on this device. Live SMTP email delivery is deferred — toggles control future
                    sends and your local inbox only.
                  </p>
                </div>
                <div className="space-y-3">
                  {(Object.keys(NOTIFICATION_PREFS_LABELS) as NotificationPreferenceKey[]).map((key) => {
                    const meta = NOTIFICATION_PREFS_LABELS[key];
                    return (
                      <div
                        key={key}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-border p-4"
                      >
                        <div>
                          <div className="font-semibold">{meta.label}</div>
                          <p className="text-xs text-muted-foreground mt-0.5">{meta.description}</p>
                        </div>
                        <Switch
                          checked={prefs[key]}
                          onCheckedChange={(checked) => handlePrefChange(key, checked)}
                          aria-label={meta.label}
                        />
                      </div>
                    );
                  })}
                </div>
                {prefsNotice ? (
                  <p className="text-sm text-emerald-700" role="status">
                    {prefsNotice}
                  </p>
                ) : null}
              </section>
            ) : null}

            {section === "reviews" ? (
              <section className="rounded-3xl border border-border bg-white p-4 shadow-sm sm:p-6 space-y-4">
                <div>
                  <h2 className="font-bold text-lg flex items-center gap-2">
                    <Star className="h-5 w-5 text-brand-red" />
                    Your reviews
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Ratings for completed orders. Edit from{" "}
                    <Link href="/orders" className="font-semibold text-brand-red underline-offset-2 hover:underline">
                      My Orders
                    </Link>{" "}
                    within 24 hours.
                  </p>
                </div>
                {!reviewsAvailable() ? (
                  <p className="text-sm text-muted-foreground">
                    Reviews need the live API — nothing invented here.
                  </p>
                ) : reviewsLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin text-brand-red" />
                    Loading reviews…
                  </div>
                ) : reviewsError ? (
                  <p className="text-sm text-brand-red">{reviewsError}</p>
                ) : reviews.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No reviews yet.</p>
                ) : (
                  <ul className="space-y-3">
                    {reviews.map((review) => (
                      <li key={review.id} className="rounded-2xl border border-border p-4">
                        <div className="font-semibold text-brand-red">{review.orderNumber}</div>
                        <p className="text-sm mt-1">
                          {review.rating}/5
                          {review.comment ? ` — ${review.comment}` : ""}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(review.createdAt).toLocaleString()}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ) : null}

            {section === "privacy" ? (
              <section className="rounded-3xl border border-border bg-white p-4 shadow-sm sm:p-6 space-y-3 text-sm">
                <h2 className="font-bold text-lg">Privacy</h2>
                <p className="text-muted-foreground">
                  Telepizza Pakistan stores your account profile, addresses, orders, favorites, and
                  reviews when you use signed-in features. Device-local checkout drafts and notification
                  prefs stay on this browser until cloud sync applies.
                </p>
                <p className="text-muted-foreground">
                  We do not sell personal data. Marketing email is off by default; live SMTP is not wired
                  yet.
                </p>
                <p className="text-muted-foreground">
                  Questions? Contact us via{" "}
                  <Link href="/contact" className="font-semibold text-brand-red underline-offset-2 hover:underline">
                    Contact
                  </Link>
                  .
                </p>
              </section>
            ) : null}

            {section === "account" ? (
              <section className="rounded-3xl border border-border bg-white p-4 shadow-sm sm:p-6 space-y-4">
                <h2 className="font-bold text-lg">Account</h2>
                <p className="text-sm text-muted-foreground">
                  Signed in as {email}. Account deletion and data export are not self-serve yet — contact
                  support for help.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Link href="/my-telepizza">
                    <Button variant="outline" className="rounded-2xl">
                      Open My Telepizza
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    className="rounded-2xl text-brand-red"
                    onClick={() => {
                      void signOut();
                    }}
                  >
                    Log out
                  </Button>
                </div>
              </section>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
