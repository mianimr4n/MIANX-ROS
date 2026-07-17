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
  setDefaultSavedAddress,
  updateSavedAddress,
  type AddressLabel,
  type SavedCustomerAddress,
} from "@/lib/customer-addresses";
import { getLoyaltyPoints, listLocalOrders } from "@/lib/customer-store";

type AccountSection =
  | "overview"
  | "profile"
  | "addresses"
  | "security"
  | "orders"
  | "loyalty"
  | "notifications";

const NAV_ITEMS: Array<{ id: AccountSection; label: string; icon: typeof LayoutDashboard }> = [
  { id: "overview", label: "Dashboard", icon: LayoutDashboard },
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

  const [newEmail, setNewEmail] = useState("");
  const [emailChangePassword, setEmailChangePassword] = useState("");
  const [emailChangeError, setEmailChangeError] = useState<string | null>(null);
  const [emailChangeNotice, setEmailChangeNotice] = useState<string | null>(null);
  const [emailChangeBusy, setEmailChangeBusy] = useState(false);

  const [addresses, setAddresses] = useState<SavedCustomerAddress[]>([]);
  const [addressLabel, setAddressLabel] = useState<AddressLabel>("Home");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressArea, setAddressArea] = useState("");
  const [addressCity, setAddressCity] = useState("Multan");
  const [addressNotes, setAddressNotes] = useState("");
  const [addressError, setAddressError] = useState<string | null>(null);
  const [addressNotice, setAddressNotice] = useState<string | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressIsDefault, setAddressIsDefault] = useState(false);

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
  const loyaltyPoints = profile?.phone ? getLoyaltyPoints(profile.phone) : 0;
  const activeOrders = localOrders.filter(
    (order) => !["completed", "delivered", "cancelled", "canceled"].includes(order.status.toLowerCase()),
  );
  const lastOrder = localOrders[0];

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

  async function handleEmailChange(event: React.FormEvent) {
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
      setEmailChangeNotice(
        "Check your inbox (and spam) to confirm the new email. Until confirmed, keep using your current address to sign in.",
      );
    } finally {
      setEmailChangeBusy(false);
    }
  }

  function resetAddressForm() {
    setAddressLine1("");
    setAddressArea("");
    setAddressNotes("");
    setAddressLabel("Home");
    setAddressCity("Multan");
    setAddressIsDefault(false);
    setEditingAddressId(null);
    setShowAddressForm(false);
  }

  function handleSaveAddress(event: React.FormEvent) {
    event.preventDefault();
    setAddressError(null);
    setAddressNotice(null);
    const input = {
      label: addressLabel,
      line1: addressLine1,
      area: addressArea,
      city: addressCity,
      notes: addressNotes,
      isDefault: addressIsDefault,
    };
    const result = editingAddressId
      ? updateSavedAddress(ownerKey, editingAddressId, input)
      : addSavedAddress(ownerKey, input);
    if (!result.ok) {
      setAddressError(result.message);
      return;
    }
    setAddresses(listSavedAddresses(ownerKey));
    resetAddressForm();
    setAddressNotice(
      editingAddressId
        ? "Address updated on this device."
        : "Address saved on this device for faster checkout.",
    );
  }

  function handleRemoveAddress(addressId: string) {
    removeSavedAddress(ownerKey, addressId);
    setAddresses(listSavedAddresses(ownerKey));
    setAddressNotice("Address removed.");
  }

  function handleEditAddress(address: SavedCustomerAddress) {
    setEditingAddressId(address.id);
    setAddressLabel(address.label);
    setAddressLine1(address.line1);
    setAddressArea(address.area);
    setAddressCity(address.city);
    setAddressNotes(address.notes);
    setAddressIsDefault(address.isDefault);
    setAddressError(null);
    setAddressNotice(null);
    setShowAddressForm(true);
  }

  function handleSetDefaultAddress(addressId: string) {
    setDefaultSavedAddress(ownerKey, addressId);
    setAddresses(listSavedAddresses(ownerKey));
    setAddressNotice("Default delivery address updated.");
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
                  <h2 className="font-bold text-lg">Dashboard</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your Telepizza customer hub — profile, saved addresses, sign-in methods, and
                    orders in one place.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  <OverviewTile
                    title="Active Orders"
                    body={`${activeOrders.length} in progress`}
                    onClick={() => goTo("orders")}
                  />
                  <OverviewTile
                    title="Saved Addresses"
                    body={
                      addresses.length > 0
                        ? `${addresses.length} saved · ${addresses.find((address) => address.isDefault)?.label ?? "default"}`
                        : "No saved addresses yet."
                    }
                    onClick={() => goTo("addresses")}
                  />
                  <OverviewTile
                    title="Reward Points"
                    body={`${loyaltyPoints} points · ${loyaltyPoints >= 1000 ? "Gold" : "Starter"} tier`}
                    onClick={() => goTo("loyalty")}
                  />
                  <OverviewTile
                    title="Recent Orders"
                    body={
                      localOrders.length > 0
                        ? `${localOrders.length} recent on this device`
                        : "No orders yet — browse the menu to start."
                    }
                    onClick={() => goTo("orders")}
                  />
                  <OverviewTile
                    title="Favorite Items"
                    body="Coming soon — favorites are not stored yet."
                    onClick={() => goTo("overview")}
                  />
                  <OverviewTile
                    title="Last Order"
                    body={
                      lastOrder
                        ? `${lastOrder.orderNumber} · ${lastOrder.branchName}`
                        : "No previous order."
                    }
                    onClick={() => goTo("orders")}
                  />
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
                    Email comes from your sign-in method. To change it securely, use Security → Change
                    email (confirmation required).
                  </p>
                  <p className="text-xs font-[var(--font-accent)] font-semibold text-brand-charcoal">
                    Email status:{" "}
                    {user.email_confirmed_at ? "Verified" : "Unverified — confirm via email link"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Provider:{" "}
                    {[googleConnected ? "Google" : null, emailPasswordAvailable ? "Email/password" : null]
                      .filter(Boolean)
                      .join(" · ") || "Unknown"}
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
                  {profile?.phone && !profile.phoneVerified ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-2xl"
                      onClick={() =>
                        setProfileNotice(
                          "Phone verification is coming soon. WhatsApp OTP is not enabled yet.",
                        )
                      }
                    >
                      Verify phone
                    </Button>
                  ) : null}
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
                        setEditingAddressId(null);
                        setAddressIsDefault(addresses.length === 0);
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
                      Add Home, Office, or another Multan delivery address for faster checkout.
                    </p>
                  </div>
                ) : null}

                <ul className="space-y-3">
                  {addresses.map((address) => (
                    <li
                      key={address.id}
                      className="rounded-2xl border border-border p-4 flex flex-wrap items-start justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold flex flex-wrap items-center gap-2">
                          {address.label}
                          {address.isDefault ? (
                            <span className="rounded-full bg-brand-red/10 px-2 py-0.5 text-xs text-brand-red">
                              Default
                            </span>
                          ) : null}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {formatSavedAddress(address)}
                        </p>
                        {address.notes ? (
                          <p className="text-xs text-muted-foreground mt-1">{address.notes}</p>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {!address.isDefault ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="rounded-2xl"
                            onClick={() => handleSetDefaultAddress(address.id)}
                          >
                            Make default
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-2xl"
                          onClick={() => handleEditAddress(address)}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-2xl text-brand-red"
                          onClick={() => handleRemoveAddress(address.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>

                {showAddressForm ? (
                  <form
                    onSubmit={handleSaveAddress}
                    className="space-y-3 border-t border-border pt-4"
                    noValidate
                  >
                    <h3 className="font-semibold">
                      {editingAddressId ? "Edit address" : "Add address"}
                    </h3>
                    <div className="space-y-2">
                      <Label htmlFor="addressLabel">Label</Label>
                      <select
                        id="addressLabel"
                        value={addressLabel}
                        onChange={(e) => setAddressLabel(e.target.value as AddressLabel)}
                        className="flex h-10 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="Home">Home</option>
                        <option value="Office">Office</option>
                        <option value="Other">Other</option>
                      </select>
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
                    <label className="flex items-start gap-3 rounded-2xl border border-border p-3 text-sm">
                      <input
                        type="checkbox"
                        checked={addressIsDefault}
                        onChange={(event) => setAddressIsDefault(event.target.checked)}
                        className="mt-0.5"
                      />
                      <span>
                        <span className="font-semibold block">Use as default address</span>
                        <span className="text-muted-foreground">
                          Checkout will select this address first.
                        </span>
                      </span>
                    </label>
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
                        {editingAddressId ? "Update address" : "Save address"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-2xl"
                        onClick={() => {
                          resetAddressForm();
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <SecurityFact
                    label="Email"
                    value={user.email_confirmed_at ? "Verified" : "Unverified"}
                  />
                  <SecurityFact
                    label="Phone"
                    value={profile?.phoneVerified ? "Verified" : "Unverified — OTP coming soon"}
                  />
                  <SecurityFact
                    label="Last login"
                    value={
                      user.last_sign_in_at
                        ? new Date(user.last_sign_in_at).toLocaleString()
                        : "Not available"
                    }
                  />
                  <SecurityFact
                    label="Active sessions"
                    value={
                      session
                        ? "This device is signed in"
                        : "No active session on this device"
                    }
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Supabase exposes the current browser session here, but not a cross-device session
                  list. Signing out ends this device session.
                </p>
                <h3 className="font-semibold">Linked accounts</h3>
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
                    <Link href="/forgot-password">
                      <Button type="button" variant="ghost" className="rounded-2xl">
                        Forgot password?
                      </Button>
                    </Link>
                  </form>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    A verified email is required before setting a password.
                  </p>
                )}

                <form
                  onSubmit={(event) => void handleEmailChange(event)}
                  className="space-y-4 border-t border-border pt-4"
                  noValidate
                >
                  <h3 className="font-semibold">Change email</h3>
                  <p className="text-xs text-muted-foreground">
                    Updates the same Supabase auth user (no duplicate account). You must confirm the
                    new address by email before it becomes active. With Secure Email Change enabled
                    in Supabase, your current inbox may also need to approve the change.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="newEmail">New email</Label>
                    <Input
                      id="newEmail"
                      type="email"
                      value={newEmail}
                      onChange={(e) => {
                        setNewEmail(e.target.value);
                        setEmailChangeError(null);
                      }}
                      className="rounded-2xl"
                      disabled={emailChangeBusy}
                      autoComplete="email"
                      placeholder="new@email.com"
                    />
                  </div>
                  {emailPasswordAvailable ? (
                    <div className="space-y-2">
                      <Label htmlFor="emailChangePassword">Current Telepizza password</Label>
                      <Input
                        id="emailChangePassword"
                        type="password"
                        value={emailChangePassword}
                        onChange={(e) => {
                          setEmailChangePassword(e.target.value);
                          setEmailChangeError(null);
                        }}
                        className="rounded-2xl"
                        disabled={emailChangeBusy}
                        autoComplete="current-password"
                      />
                      <p className="text-xs text-muted-foreground">
                        Never enter your Google password — only the Telepizza password you set for
                        this account.
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Google-only accounts can request an email change while signed in; confirm both
                      inboxes if Secure Email Change is on.
                    </p>
                  )}
                  {emailChangeError ? (
                    <p className="text-sm text-brand-red" role="alert">
                      {emailChangeError}
                    </p>
                  ) : null}
                  {emailChangeNotice ? (
                    <p className="text-sm text-emerald-700">{emailChangeNotice}</p>
                  ) : null}
                  <Button
                    type="submit"
                    variant="outline"
                    className="rounded-2xl font-semibold"
                    disabled={emailChangeBusy || !newEmail.trim()}
                  >
                    {emailChangeBusy ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Send confirmation"
                    )}
                  </Button>
                </form>
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
              <section className="rounded-3xl border border-border bg-white p-4 sm:p-6 space-y-5">
                <div>
                  <h2 className="font-bold text-lg">Loyalty preview</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    A production-ready preview of the upcoming rewards program. Points cannot be
                    earned or redeemed yet.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <SecurityFact label="Current points" value={`${loyaltyPoints} points`} />
                  <SecurityFact
                    label="Tier"
                    value={loyaltyPoints >= 1000 ? "Gold preview" : "Starter preview"}
                  />
                </div>
                <div className="rounded-2xl border border-border p-4">
                  <h3 className="font-semibold">Rewards</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Free sides, pizza upgrades, and member offers are Coming Soon. Redemption is
                    disabled until the loyalty service launches.
                  </p>
                  <Button type="button" disabled className="mt-3 rounded-2xl">
                    Redeem reward
                  </Button>
                </div>
                <div className="rounded-2xl border border-border p-4">
                  <h3 className="font-semibold">Points history</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    No reward activity yet. Eligible order history will appear after launch.
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Coming Soon — this preview does not promise points for existing orders.
                </p>
              </section>
            ) : null}

            {section === "notifications" ? (
              <section className="rounded-3xl border border-border bg-white p-4 sm:p-6 space-y-4">
                <h2 className="font-bold text-lg">Notifications</h2>
                <p className="text-sm text-muted-foreground">
                  Preview of preference controls. All switches are disabled until notification
                  delivery and consent storage are available.
                </p>
                <div className="space-y-2">
                  <PreferenceSwitch label="Order Updates" />
                  <PreferenceSwitch label="Promotions" />
                  <PreferenceSwitch label="SMS" />
                  <PreferenceSwitch label="WhatsApp" />
                  <PreferenceSwitch label="Email" />
                </div>
              </section>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function SecurityFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border p-4 min-w-0">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="font-semibold mt-1 break-words">{value}</div>
    </div>
  );
}

function PreferenceSwitch({ label }: { label: string }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-2xl border border-border p-4 text-sm">
      <span>
        <span className="font-semibold block">{label}</span>
        <span className="text-xs text-muted-foreground">Coming Soon</span>
      </span>
      <input type="checkbox" disabled aria-label={`${label} notifications unavailable`} />
    </label>
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
