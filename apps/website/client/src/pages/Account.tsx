import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import {
  Bell,
  Eye,
  EyeOff,
  Gift,
  LayoutDashboard,
  Loader2,
  LogOut,
  MapPin,
  Package,
  Shield,
  UserCircle2,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import {
  AUTH_PASSWORD_REQUIREMENTS_COPY,
  hasEmailIdentity,
  hasGoogleIdentity,
  isFirstTimePasswordAttach,
} from "@/lib/auth-utils";
import {
  addSavedAddress,
  formatSavedAddress,
  listSavedAddresses,
  removeSavedAddress,
  type SavedCustomerAddress,
} from "@/lib/customer-addresses";
import { listLocalOrders } from "@/lib/customer-store";

type AccountSection =
  | "overview"
  | "profile"
  | "addresses"
  | "security"
  | "orders"
  | "loyalty"
  | "notifications";

const NAV_ITEMS: Array<{ id: AccountSection; label: string; icon: typeof LayoutDashboard }> = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "addresses", label: "Addresses", icon: MapPin },
  { id: "security", label: "Security", icon: Shield },
  { id: "orders", label: "Orders", icon: Package },
  { id: "loyalty", label: "Loyalty", icon: Gift },
  { id: "notifications", label: "Notifications", icon: Bell },
];

function sectionFromHash(): AccountSection {
  if (typeof window === "undefined") return "overview";
  const hash = window.location.hash.replace(/^#/, "").toLowerCase();
  if (NAV_ITEMS.some((item) => item.id === hash)) return hash as AccountSection;
  return "overview";
}

export default function Account() {
  const { profile, user, isAuthenticated, isLoading, signOut, updateProfile, setPassword } = useAuth();

  const [section, setSection] = useState<AccountSection>(sectionFromHash);

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

  const [addresses, setAddresses] = useState<SavedCustomerAddress[]>([]);
  const [addressLabel, setAddressLabel] = useState("Home");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressArea, setAddressArea] = useState("");
  const [addressCity, setAddressCity] = useState("Multan");
  const [addressNotes, setAddressNotes] = useState("");
  const [addressError, setAddressError] = useState<string | null>(null);
  const [addressNotice, setAddressNotice] = useState<string | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);

  useEffect(() => {
    setFullName(profile?.fullName ?? "");
    setPhone(profile?.phone ?? "");
  }, [profile]);

  useEffect(() => {
    const onHash = () => setSection(sectionFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const ownerKey = user?.id || profile?.email || user?.email || "";

  useEffect(() => {
    if (!ownerKey) {
      setAddresses([]);
      return;
    }
    setAddresses(listSavedAddresses(ownerKey));
  }, [ownerKey]);

  const orderKey = profile?.phone || user?.email || user?.id;
  const localOrders = useMemo(() => listLocalOrders(orderKey), [orderKey]);

  function goTo(next: AccountSection) {
    setSection(next);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `#${next}`);
    }
  }

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
  const displayName = fullName || email?.split("@")[0] || "Customer";
  const googleConnected = hasGoogleIdentity(user);
  const emailPasswordAvailable = hasEmailIdentity(user);
  const firstTimePassword = isFirstTimePasswordAttach(user);
  const canSetPassword = Boolean(email);
  const phoneStatus = profile?.phone
    ? profile.phoneVerified
      ? "Verified"
      : "Unverified"
    : "Not set";

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
          ? "Profile saved. Phone remains Unverified until WhatsApp OTP launches."
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
      setPasswordNotice(
        firstTimePassword
          ? "You can now sign in using Google or email and password."
          : "Your Telepizza password was updated.",
      );
    } finally {
      setPasswordBusy(false);
    }
  }

  function handleAddAddress(event: React.FormEvent) {
    event.preventDefault();
    setAddressError(null);
    setAddressNotice(null);
    const result = addSavedAddress(ownerKey, {
      label: addressLabel,
      line1: addressLine1,
      area: addressArea,
      city: addressCity,
      notes: addressNotes,
    });
    if (!result.ok) {
      setAddressError(result.message);
      return;
    }
    setAddresses(listSavedAddresses(ownerKey));
    setAddressLine1("");
    setAddressArea("");
    setAddressNotes("");
    setAddressLabel("Home");
    setAddressCity("Multan");
    setShowAddressForm(false);
    setAddressNotice("Address saved on this device for faster checkout later.");
  }

  function handleRemoveAddress(addressId: string) {
    removeSavedAddress(ownerKey, addressId);
    setAddresses(listSavedAddresses(ownerKey));
    setAddressNotice("Address removed.");
  }

  return (
    <div className="min-h-screen bg-background py-10">
      <div className="container max-w-5xl space-y-6">
        <div className="rounded-3xl border border-border bg-white p-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              Account Center
            </p>
            <h1 className="brand-heading text-3xl mb-1">{displayName}</h1>
            {email ? <p className="text-sm text-muted-foreground">{email}</p> : null}
            {profile?.phone ? (
              <p className="text-sm text-muted-foreground mt-1">
                {profile.phone} · Phone {phoneStatus}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground mt-1">
                Add a phone number in Profile for faster checkout.
              </p>
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

        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
          <nav
            aria-label="Account sections"
            className="rounded-3xl border border-border bg-white p-3 h-fit lg:sticky lg:top-24"
          >
            <ul className="flex lg:flex-col gap-1 overflow-x-auto pb-1 lg:pb-0">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = section === item.id;
                return (
                  <li key={item.id} className="shrink-0">
                    <button
                      type="button"
                      onClick={() => goTo(item.id)}
                      className={`w-full flex items-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                        active
                          ? "bg-brand-red/10 text-brand-red"
                          : "text-brand-charcoal hover:bg-muted/60"
                      }`}
                      aria-current={active ? "page" : undefined}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="space-y-6 min-w-0">
            {section === "overview" ? (
              <section className="rounded-3xl border border-border bg-white p-6 space-y-5">
                <div>
                  <h2 className="font-bold text-lg">Overview</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your Telepizza customer hub — profile, saved addresses, sign-in methods, and
                    orders in one place.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <OverviewTile
                    title="Profile"
                    body={
                      profile?.phone
                        ? `Phone ${phoneStatus}`
                        : "Add your name and phone for faster checkout."
                    }
                    onClick={() => goTo("profile")}
                  />
                  <OverviewTile
                    title="Addresses"
                    body={
                      addresses.length > 0
                        ? `${addresses.length} saved on this device`
                        : "No saved addresses yet."
                    }
                    onClick={() => goTo("addresses")}
                  />
                  <OverviewTile
                    title="Security"
                    body={
                      googleConnected && emailPasswordAvailable
                        ? "Google and email/password ready"
                        : googleConnected
                          ? "Google connected — set a Telepizza password anytime"
                          : emailPasswordAvailable
                            ? "Email/password ready"
                            : "Add a sign-in method"
                    }
                    onClick={() => goTo("security")}
                  />
                  <OverviewTile
                    title="Orders"
                    body={
                      localOrders.length > 0
                        ? `${localOrders.length} recent on this device`
                        : "No orders yet — browse the menu to start."
                    }
                    onClick={() => goTo("orders")}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-dashed border-border p-4">
                    <div className="font-semibold">Loyalty</div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Rewards points will appear here when the loyalty program launches.
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      className="mt-2 px-0 text-brand-red"
                      onClick={() => goTo("loyalty")}
                    >
                      View details
                    </Button>
                  </div>
                  <div className="rounded-2xl border border-dashed border-border p-4">
                    <div className="font-semibold">Notifications</div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Order and promo preferences are not available yet.
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      className="mt-2 px-0 text-brand-red"
                      onClick={() => goTo("notifications")}
                    >
                      View details
                    </Button>
                  </div>
                </div>
              </section>
            ) : null}

            {section === "profile" ? (
              <form
                onSubmit={(event) => void handleSaveProfile(event)}
                className="rounded-3xl border border-border bg-white p-6 space-y-4"
                noValidate
              >
                <div>
                  <h2 className="font-bold text-lg">Profile</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    One customer profile for Google and email sign-in. Phone stays Unverified until
                    WhatsApp OTP launches.
                  </p>
                </div>
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
                  <p className="text-xs text-muted-foreground">
                    Email comes from your sign-in method and cannot be edited here.
                  </p>
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
                    Pakistani mobiles normalize as 03XXXXXXXXX → +923XXXXXXXXX. Checkout still
                    collects phone when placing an order.
                  </p>
                  <p className="text-xs font-[var(--font-accent)] font-semibold text-brand-charcoal">
                    Phone status: {phoneStatus}
                    {profile?.phone && !profile.phoneVerified
                      ? " — verification by WhatsApp OTP is not available yet"
                      : null}
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
            ) : null}

            {section === "addresses" ? (
              <section className="rounded-3xl border border-border bg-white p-6 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-bold text-lg">Addresses</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Saved on this device for now. No map GPS required — enter the address you use
                      for delivery.
                    </p>
                  </div>
                  {!showAddressForm ? (
                    <Button
                      type="button"
                      className="rounded-2xl brand-gradient text-white font-semibold"
                      onClick={() => {
                        setShowAddressForm(true);
                        setAddressError(null);
                        setAddressNotice(null);
                      }}
                    >
                      Add address
                    </Button>
                  ) : null}
                </div>

                {addresses.length === 0 && !showAddressForm ? (
                  <div className="rounded-2xl border border-dashed border-border p-6 text-center">
                    <MapPin className="w-8 h-8 text-brand-red mx-auto mb-2" />
                    <p className="font-semibold">No saved addresses yet</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Add Home, Work, or another Multan delivery address for faster checkout.
                    </p>
                  </div>
                ) : null}

                <ul className="space-y-3">
                  {addresses.map((address) => (
                    <li
                      key={address.id}
                      className="rounded-2xl border border-border p-4 flex flex-wrap items-start justify-between gap-3"
                    >
                      <div>
                        <div className="font-semibold">{address.label}</div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {formatSavedAddress(address)}
                        </p>
                        {address.notes ? (
                          <p className="text-xs text-muted-foreground mt-1">{address.notes}</p>
                        ) : null}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-2xl"
                        onClick={() => handleRemoveAddress(address.id)}
                      >
                        Remove
                      </Button>
                    </li>
                  ))}
                </ul>

                {showAddressForm ? (
                  <form
                    onSubmit={handleAddAddress}
                    className="space-y-3 border-t border-border pt-4"
                    noValidate
                  >
                    <h3 className="font-semibold">Add address</h3>
                    <div className="space-y-2">
                      <Label htmlFor="addressLabel">Label</Label>
                      <Input
                        id="addressLabel"
                        value={addressLabel}
                        onChange={(e) => setAddressLabel(e.target.value)}
                        className="rounded-2xl"
                        placeholder="Home, Work, Other"
                        autoComplete="off"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="addressLine1">Street / landmark</Label>
                      <Input
                        id="addressLine1"
                        value={addressLine1}
                        onChange={(e) => {
                          setAddressLine1(e.target.value);
                          setAddressError(null);
                        }}
                        className="rounded-2xl"
                        placeholder="House / street / nearby landmark"
                        autoComplete="street-address"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="addressArea">Area (optional)</Label>
                        <Input
                          id="addressArea"
                          value={addressArea}
                          onChange={(e) => setAddressArea(e.target.value)}
                          className="rounded-2xl"
                          placeholder="Royal Orchard, Bypass…"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="addressCity">City</Label>
                        <Input
                          id="addressCity"
                          value={addressCity}
                          onChange={(e) => setAddressCity(e.target.value)}
                          className="rounded-2xl"
                          placeholder="Multan"
                          autoComplete="address-level2"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="addressNotes">Delivery notes (optional)</Label>
                      <Input
                        id="addressNotes"
                        value={addressNotes}
                        onChange={(e) => setAddressNotes(e.target.value)}
                        className="rounded-2xl"
                        placeholder="Gate code, floor, etc."
                      />
                    </div>
                    {addressError ? (
                      <p className="text-sm text-brand-red" role="alert">
                        {addressError}
                      </p>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      <Button type="submit" className="rounded-2xl brand-gradient text-white font-semibold">
                        Save address
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-2xl"
                        onClick={() => {
                          setShowAddressForm(false);
                          setAddressError(null);
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : null}

                {addressNotice ? <p className="text-sm text-emerald-700">{addressNotice}</p> : null}
              </section>
            ) : null}

            {section === "security" ? (
              <section className="rounded-3xl border border-border bg-white p-6 space-y-4">
                <div>
                  <h2 className="font-bold text-lg">Security & login methods</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Google and email share the same Telepizza customer account. Roles and staff
                    access never come from Google profile data.
                  </p>
                </div>
                <ul className="space-y-3 text-sm">
                  <li className="rounded-2xl border border-border p-4 flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">Google</div>
                      <p className="text-muted-foreground mt-0.5">
                        {googleConnected
                          ? "Connected — you can sign in with Google on this account."
                          : "Not connected on this account yet."}
                      </p>
                    </div>
                    <span className="text-xs font-semibold shrink-0">
                      {googleConnected ? "Connected" : "Not connected"}
                    </span>
                  </li>
                  <li className="rounded-2xl border border-border p-4 flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">Email & password</div>
                      <p className="text-muted-foreground mt-0.5">
                        {emailPasswordAvailable
                          ? "Ready — you can sign in with email and your Telepizza password."
                          : "Not set yet — attach a Telepizza password below (never your Google password)."}
                      </p>
                    </div>
                    <span className="text-xs font-semibold shrink-0">
                      {emailPasswordAvailable ? "Ready" : "Not set"}
                    </span>
                  </li>
                  <li className="rounded-2xl border border-dashed border-border p-4 flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">Phone / WhatsApp sign-in</div>
                      <p className="text-muted-foreground mt-0.5">
                        Phone OTP sign-in will launch later. You can still save a phone number for
                        checkout; it stays Unverified until then.
                      </p>
                    </div>
                    <span className="text-xs font-semibold shrink-0 text-muted-foreground">
                      Not available yet
                    </span>
                  </li>
                </ul>

                {canSetPassword ? (
                  <form
                    onSubmit={(event) => void handleSetPassword(event)}
                    className="space-y-4 border-t border-border pt-4"
                    noValidate
                  >
                    <h3 className="font-semibold">
                      {firstTimePassword
                        ? "Set a Telepizza password"
                        : "Update Telepizza password"}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {firstTimePassword
                        ? "Attaches a Telepizza password to this same account — never asks for your Google password and does not create a second login."
                        : "Enter your current Telepizza password to change it. Never enter your Google password here."}
                    </p>
                    {!firstTimePassword ? (
                      <div className="space-y-2">
                        <Label htmlFor="currentPassword">Current password</Label>
                        <Input
                          id="currentPassword"
                          type={showPassword ? "text" : "password"}
                          value={currentPassword}
                          onChange={(e) => {
                            setCurrentPassword(e.target.value);
                            setPasswordError(null);
                          }}
                          className="rounded-2xl"
                          disabled={passwordBusy}
                          autoComplete="current-password"
                        />
                      </div>
                    ) : null}
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">New password</Label>
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
                    {passwordNotice ? (
                      <p className="text-sm text-emerald-700">{passwordNotice}</p>
                    ) : null}
                    <Button
                      type="submit"
                      variant="outline"
                      className="rounded-2xl font-semibold"
                      disabled={passwordBusy}
                    >
                      {passwordBusy ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : firstTimePassword ? (
                        "Save password"
                      ) : (
                        "Update password"
                      )}
                    </Button>
                  </form>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    A verified email is required before setting a password.
                  </p>
                )}
              </section>
            ) : null}

            {section === "orders" ? (
              <section className="rounded-3xl border border-border bg-white p-6 space-y-4">
                <div>
                  <h2 className="font-bold text-lg">Orders</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    View Active, Completed, and Cancelled orders. Tracking opens from My Orders.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href="/orders">
                    <Button className="rounded-2xl brand-gradient text-white font-semibold">
                      Open My Orders
                    </Button>
                  </Link>
                  <Link href="/menu">
                    <Button variant="outline" className="rounded-2xl">
                      Browse menu
                    </Button>
                  </Link>
                </div>
                <p className="text-sm text-muted-foreground">
                  {localOrders.length > 0
                    ? `${localOrders.length} order(s) remembered on this device.`
                    : "No orders on this device yet."}
                </p>
              </section>
            ) : null}

            {section === "loyalty" ? (
              <section className="rounded-3xl border border-border bg-white p-6 space-y-3">
                <h2 className="font-bold text-lg">Loyalty</h2>
                <p className="text-sm text-muted-foreground">
                  Telepizza rewards are not live yet. When loyalty launches, points and offers will
                  show here for your customer account.
                </p>
                <div className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
                  Program status: not available yet — no points to display.
                </div>
              </section>
            ) : null}

            {section === "notifications" ? (
              <section className="rounded-3xl border border-border bg-white p-6 space-y-3">
                <h2 className="font-bold text-lg">Notifications</h2>
                <p className="text-sm text-muted-foreground">
                  Order alerts and promo preferences will live here. Preference controls are not
                  available yet.
                </p>
                <div className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
                  Preference center: not available yet.
                </div>
              </section>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function OverviewTile({
  title,
  body,
  onClick,
}: {
  title: string;
  body: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl border border-border p-4 text-left hover:border-brand-red/30 transition-colors"
    >
      <div className="font-semibold">{title}</div>
      <p className="text-sm text-muted-foreground mt-1">{body}</p>
    </button>
  );
}
