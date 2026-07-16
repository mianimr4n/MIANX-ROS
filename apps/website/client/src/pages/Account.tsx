import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Bell, Eye, EyeOff, Gift, Loader2, LogOut, Package, UserCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { AUTH_PASSWORD_REQUIREMENTS_COPY } from "@/lib/auth-utils";

function hasGoogleIdentity(user: {
  app_metadata?: { provider?: string; providers?: string[] };
  identities?: Array<{ provider?: string }>;
} | null): boolean {
  if (!user) return false;
  const providers = user.app_metadata?.providers;
  if (Array.isArray(providers) && providers.includes("google")) return true;
  if (user.app_metadata?.provider === "google") return true;
  if (Array.isArray(user.identities) && user.identities.some((entry) => entry.provider === "google")) {
    return true;
  }
  return false;
}

function hasEmailIdentity(user: {
  app_metadata?: { provider?: string; providers?: string[] };
  identities?: Array<{ provider?: string }>;
} | null): boolean {
  if (!user) return false;
  const providers = user.app_metadata?.providers;
  if (Array.isArray(providers) && providers.includes("email")) return true;
  if (user.app_metadata?.provider === "email") return true;
  if (Array.isArray(user.identities) && user.identities.some((entry) => entry.provider === "email")) {
    return true;
  }
  return false;
}

export default function Account() {
  const { profile, user, isAuthenticated, isLoading, signOut, updateProfile, setPassword } = useAuth();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileNotice, setProfileNotice] = useState<string | null>(null);
  const [profileBusy, setProfileBusy] = useState(false);

  const [password, setPasswordValue] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordNotice, setPasswordNotice] = useState<string | null>(null);
  const [passwordBusy, setPasswordBusy] = useState(false);

  useEffect(() => {
    setFullName(profile?.fullName ?? "");
    setPhone(profile?.phone ?? "");
  }, [profile]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background py-16">
        <div className="container max-w-md text-center text-muted-foreground">Loading account…</div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-background py-16">
        <div className="container max-w-md text-center">
          <UserCircle2 className="w-16 h-16 text-brand-red mx-auto mb-4" />
          <h1 className="brand-heading text-3xl mb-3">My Account</h1>
          <p className="text-muted-foreground mb-6">
            Sign in to manage your Telepizza customer account.
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/login">
              <Button className="rounded-2xl brand-gradient text-white">Login</Button>
            </Link>
            <Link href="/register">
              <Button variant="outline" className="rounded-2xl">
                Register
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const email = profile?.email || user.email || null;
  const googleConnected = hasGoogleIdentity(user);
  const emailPasswordAvailable = hasEmailIdentity(user);
  const canSetPassword = Boolean(email);

  async function handleSaveProfile(event: React.FormEvent) {
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
      setProfileNotice(
        phone.trim()
          ? "Profile saved. Phone status: Unverified until WhatsApp OTP is enabled."
          : "Profile saved.",
      );
    } finally {
      setProfileBusy(false);
    }
  }

  async function handleSetPassword(event: React.FormEvent) {
    event.preventDefault();
    if (passwordBusy) return;
    setPasswordError(null);
    setPasswordNotice(null);
    setPasswordBusy(true);
    try {
      const result = await setPassword({ password, confirmPassword });
      if (!result.ok) {
        setPasswordError(result.message);
        return;
      }
      setPasswordValue("");
      setConfirmPassword("");
      setPasswordNotice("You can now sign in using Google or email and password.");
    } finally {
      setPasswordBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background py-10">
      <div className="container max-w-3xl space-y-6">
        <div className="rounded-3xl border border-border bg-white p-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="brand-heading text-3xl mb-1">{fullName || email?.split("@")[0] || "Customer"}</h1>
            {email ? <p className="text-sm text-muted-foreground">{email}</p> : null}
            {profile?.phone ? (
              <p className="text-sm text-muted-foreground mt-1">{profile.phone}</p>
            ) : (
              <p className="text-sm text-muted-foreground mt-1">Add a phone number below for faster checkout.</p>
            )}
          </div>
          <Button
            variant="outline"
            onClick={() => {
              void signOut();
            }}
            className="rounded-2xl"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>

        <form
          onSubmit={(event) => void handleSaveProfile(event)}
          className="rounded-3xl border border-border bg-white p-6 space-y-4"
          noValidate
        >
          <h2 className="font-bold text-lg">Profile</h2>
          <div className="space-y-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                setProfileError(null);
              }}
              className="rounded-2xl"
              disabled={profileBusy}
              autoComplete="name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={email ?? ""}
              readOnly
              disabled
              className="rounded-2xl bg-muted/40"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone number</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setProfileError(null);
              }}
              className="rounded-2xl"
              disabled={profileBusy}
              inputMode="tel"
              placeholder="03XXXXXXXXX or +923XXXXXXXXX"
              autoComplete="tel"
            />
            <p className="text-xs text-muted-foreground">
              Pakistani mobiles normalize as 03XXXXXXXXX → +923XXXXXXXXX. Checkout still collects phone
              when placing an order.
            </p>
            <p className="text-xs font-[var(--font-accent)] font-semibold text-brand-charcoal">
              Phone status:{" "}
              {profile?.phone
                ? profile.phoneVerified
                  ? "Verified"
                  : "Unverified"
                : "Not set"}
            </p>
          </div>
          {profileError ? (
            <p className="text-sm text-brand-red" role="alert">
              {profileError}
            </p>
          ) : null}
          {profileNotice ? <p className="text-sm text-emerald-700">{profileNotice}</p> : null}
          <Button
            type="submit"
            className="rounded-2xl brand-gradient text-white font-bold"
            disabled={profileBusy}
          >
            {profileBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save profile"}
          </Button>
        </form>

        <div className="rounded-3xl border border-border bg-white p-6 space-y-4">
          <h2 className="font-bold text-lg">Sign-in methods</h2>
          <ul className="space-y-2 text-sm">
            <li>
              <span className="font-semibold">Google:</span>{" "}
              {googleConnected ? "Connected" : "Not connected"}
            </li>
            <li>
              <span className="font-semibold">Email/password:</span>{" "}
              {emailPasswordAvailable ? "Available" : "Not set yet"}
            </li>
            <li>
              <span className="font-semibold">Phone/WhatsApp OTP:</span> Coming Soon
            </li>
          </ul>

          {canSetPassword ? (
            <form
              onSubmit={(event) => void handleSetPassword(event)}
              className="space-y-4 border-t border-border pt-4"
              noValidate
            >
              <h3 className="font-semibold">
                {googleConnected && !emailPasswordAvailable
                  ? "Set a Telepizza password"
                  : emailPasswordAvailable
                    ? "Update Telepizza password"
                    : "Set a Telepizza password"}
              </h3>
              <p className="text-xs text-muted-foreground">
                Attaches a Telepizza password to this same account via Supabase Auth — never asks for your
                Google password and does not create a second login.
              </p>
              <div className="space-y-2">
                <Label htmlFor="newPassword">Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPasswordValue(e.target.value);
                      setPasswordError(null);
                    }}
                    className="rounded-2xl pr-12"
                    disabled={passwordBusy}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 px-3 text-muted-foreground"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    disabled={passwordBusy}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setPasswordError(null);
                  }}
                  className="rounded-2xl"
                  disabled={passwordBusy}
                  autoComplete="new-password"
                />
                <p className="text-xs text-muted-foreground">{AUTH_PASSWORD_REQUIREMENTS_COPY}</p>
              </div>
              {passwordError ? (
                <p className="text-sm text-brand-red" role="alert">
                  {passwordError}
                </p>
              ) : null}
              {passwordNotice ? <p className="text-sm text-emerald-700">{passwordNotice}</p> : null}
              <Button
                type="submit"
                variant="outline"
                className="rounded-2xl font-semibold"
                disabled={passwordBusy}
              >
                {passwordBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save password"}
              </Button>
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">
              A verified email is required before setting a password.
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link href="/orders">
            <div className="rounded-3xl border border-border bg-white p-5 hover:border-brand-red/30 transition-colors">
              <Package className="w-6 h-6 text-brand-red mb-3" />
              <div className="font-bold">My Orders</div>
              <div className="text-sm text-muted-foreground">View order history</div>
            </div>
          </Link>
          <div className="rounded-3xl border border-border bg-white/70 p-5 opacity-80">
            <Gift className="w-6 h-6 text-brand-red mb-3" />
            <div className="font-bold">Loyalty</div>
            <div className="text-sm text-muted-foreground">Coming Soon</div>
          </div>
          <div className="rounded-3xl border border-border bg-white/70 p-5 opacity-80">
            <Bell className="w-6 h-6 text-brand-red mb-3" />
            <div className="font-bold">Notifications</div>
            <div className="text-sm text-muted-foreground">Coming Soon</div>
          </div>
        </div>
      </div>
    </div>
  );
}
