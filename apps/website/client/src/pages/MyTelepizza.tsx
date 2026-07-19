import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "wouter";
import {
  Bell,
  ChevronRight,
  Eye,
  EyeOff,
  Gift,
  Heart,
  LayoutDashboard,
  Loader2,
  LogOut,
  MapPin,
  Package,
  RotateCcw,
  Shield,
  Star,
  Store,
  UserCircle2,
  UserRound,
  UtensilsCrossed,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useBranch } from "@/contexts/BranchContext";
import { useMenuCatalog } from "@/contexts/MenuCatalogContext";
import { useCart } from "@/contexts/CartContext";
import { HubSupportCard } from "@/components/my-telepizza/HubSupportCard";
import { OrderStatusTimeline } from "@/components/my-telepizza/OrderStatusTimeline";
import { ReorderReviewDialog } from "@/components/my-telepizza/ReorderReviewDialog";
import {
  AUTH_MIN_PASSWORD_LENGTH,
  AUTH_PASSWORD_REQUIREMENTS_COPY,
  hasEmailIdentity,
  hasGoogleIdentity,
  isFirstTimePasswordAttach,
} from "@/lib/auth-utils";
import { rememberAuthNextPath } from "@/lib/auth-redirect";
import {
  ADDRESSES_CLOUD_SYNC_AVAILABLE,
  addSavedAddress,
  draftToImportPayload,
  formatSavedAddress,
  hasCompletedAddressImport,
  listSavedAddresses,
  markAddressImportCompleted,
  removeSavedAddress,
  setDefaultSavedAddress,
  updateSavedAddress,
  type AddressLabel,
  type SavedCustomerAddress,
} from "@/lib/customer-addresses";
import {
  archiveCloudAddress,
  cloudAddressesAvailable,
  createCloudAddress,
  fetchCloudAddresses,
  importCloudAddresses,
  updateCloudAddress,
} from "@/lib/customer-addresses-api";
import { isApiConfigured } from "@/lib/api";
import { listLocalOrders, type StoredOrder } from "@/lib/customer-store";
import {
  cloudOrdersAvailable,
  fetchCloudOrderDetail,
  fetchCloudOrders,
} from "@/lib/customer-orders-api";
import { bucketForOrderStatus } from "@/lib/order-status";
import {
  buildReorderPreview,
  confirmedReorderCartItems,
  type ReorderPreview,
} from "@/lib/reorder";

type HubSection =
  | "overview"
  | "profile"
  | "addresses"
  | "security"
  | "orders"
  | "loyalty"
  | "notifications";

type StatusTone = "success" | "warning" | "neutral";

const NAV_ITEMS: Array<{ id: HubSection; label: string; icon: typeof LayoutDashboard }> = [
  { id: "overview", label: "Dashboard", icon: LayoutDashboard },
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "addresses", label: "Addresses", icon: MapPin },
  { id: "security", label: "Security", icon: Shield },
  { id: "orders", label: "Orders", icon: Package },
  { id: "loyalty", label: "Loyalty", icon: Gift },
  { id: "notifications", label: "Notifications", icon: Bell },
];

function sectionFromHash(): HubSection {
  if (typeof window === "undefined") return "overview";
  const hash = window.location.hash.replace(/^#/, "").toLowerCase();
  if (NAV_ITEMS.some((item) => item.id === hash)) return hash as HubSection;
  return "overview";
}

function profileCompletion(input: {
  fullName: string;
  emailVerified: boolean;
  hasPhone: boolean;
  hasDeviceAddress: boolean;
}): { score: number; missing: string[] } {
  const checks = [
    { ok: Boolean(input.fullName.trim()), label: "Add your name" },
    { ok: input.emailVerified, label: "Confirm your email" },
    { ok: input.hasPhone, label: "Add a phone number" },
    { ok: input.hasDeviceAddress, label: "Add a delivery address draft" },
  ];
  const done = checks.filter((check) => check.ok).length;
  return {
    score: Math.round((done / checks.length) * 100),
    missing: checks.filter((check) => !check.ok).map((check) => check.label),
  };
}

export default function MyTelepizza() {
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
  const { selectedBranch } = useBranch();
  const { items: catalogItems, isLoading: catalogLoading } = useMenuCatalog();
  const { addItem, setOrderDetails } = useCart();

  const [section, setSection] = useState<HubSection>(sectionFromHash);
  const focusMainAfterNav = useRef(false);
  const [reorderPreview, setReorderPreview] = useState<ReorderPreview | null>(null);
  const [reorderOpen, setReorderOpen] = useState(false);

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
  const [addressRecipientName, setAddressRecipientName] = useState("");
  const [addressPhone, setAddressPhone] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [addressLandmark, setAddressLandmark] = useState("");
  const [cloudAddresses, setCloudAddresses] = useState<SavedCustomerAddress[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [addressesError, setAddressesError] = useState<string | null>(null);
  const [cloudOrders, setCloudOrders] = useState<StoredOrder[]>([]);
  const [usingCloudOrders, setUsingCloudOrders] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);

  useEffect(() => {
    setFullName(profile?.fullName ?? "");
    setPhone(profile?.phone ?? "");
  }, [profile]);

  useEffect(() => {
    const onHash = () => setSection(sectionFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    if (!focusMainAfterNav.current) return;
    focusMainAfterNav.current = false;
    const main = document.getElementById("my-telepizza-main");
    if (!main) return;
    const heading = main.querySelector<HTMLElement>("h2");
    const target = heading ?? main;
    if (heading) heading.tabIndex = -1;
    target.focus({ preventScroll: false });
  }, [section]);

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

  useEffect(() => {
    if (!showAddressForm) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        resetAddressForm();
        setAddressError(null);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showAddressForm]);

  const ownerKey = user?.id || profile?.email || user?.email || "";

  useEffect(() => {
    if (!ownerKey) {
      setAddresses([]);
      return;
    }
    setAddresses(listSavedAddresses(ownerKey));
  }, [ownerKey]);

  const orderKey = profile?.phone ?? undefined;
  const localOrders = useMemo(
    () => (orderKey ? listLocalOrders(orderKey) : []),
    [orderKey],
  );
  const hubOrders = usingCloudOrders ? cloudOrders : localOrders;
  const activeOrders = hubOrders.filter(
    (order) => bucketForOrderStatus(order.status) === "active",
  );
  const activeOrder = activeOrders[0] ?? null;
  const lastCompleted = hubOrders.find(
    (order) => bucketForOrderStatus(order.status) === "completed",
  );
  const lastOrder = hubOrders[0];

  function goTo(next: HubSection) {
    focusMainAfterNav.current = true;
    setSection(next);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `#${next}`);
    }
  }

  function openReorderReview(order: StoredOrder) {
    if (catalogLoading) return;
    const preview = buildReorderPreview(order, catalogItems);
    setReorderPreview(preview);
    setReorderOpen(true);
  }

  function confirmReorder() {
    if (!reorderPreview) return;
    const items = confirmedReorderCartItems(reorderPreview);
    if (!items.length) return;
    items.forEach((item) => addItem(item));
    setOrderDetails({
      deliveryMode: reorderPreview.order.orderType === "pickup" ? "pickup" : "delivery",
      deliveryAddress: reorderPreview.order.deliveryAddress ?? "",
      orderInstructions: reorderPreview.order.notes ?? "",
      couponCode: "",
    });
    setReorderOpen(false);
    setReorderPreview(null);
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background py-10 sm:py-16" aria-busy="true" aria-live="polite">
        <div className="container max-w-5xl space-y-6">
          <div className="overflow-hidden rounded-3xl border border-border bg-white shadow-sm">
            <div className="h-1.5 brand-gradient" aria-hidden="true" />
            <div className="space-y-4 p-4 sm:p-6">
              <div className="h-3 w-28 rounded-full bg-muted/70 animate-pulse motion-reduce:animate-none" />
              <div className="h-8 w-2/3 max-w-sm rounded-2xl bg-muted/70 animate-pulse motion-reduce:animate-none" />
              <div className="h-4 w-1/2 max-w-xs rounded-full bg-muted/60 animate-pulse motion-reduce:animate-none" />
              <div className="flex gap-2">
                <div className="h-7 w-28 rounded-full bg-muted/60 animate-pulse motion-reduce:animate-none" />
                <div className="h-7 w-32 rounded-full bg-muted/60 animate-pulse motion-reduce:animate-none" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:flex lg:flex-col rounded-3xl border border-border bg-white p-3 shadow-sm">
              {Array.from({ length: 7 }).map((_, index) => (
                <div
                  key={index}
                  className="h-10 rounded-2xl bg-muted/60 animate-pulse motion-reduce:animate-none"
                />
              ))}
            </div>
            <div className="space-y-4">
              <div className="h-40 rounded-3xl border border-border bg-white p-4 shadow-sm">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-24 rounded-2xl bg-muted/60 animate-pulse motion-reduce:animate-none"
                    />
                  ))}
                </div>
              </div>
              <div className="h-52 rounded-3xl bg-muted/50 animate-pulse motion-reduce:animate-none" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="h-36 rounded-3xl bg-muted/50 animate-pulse motion-reduce:animate-none" />
                <div className="h-36 rounded-3xl bg-muted/50 animate-pulse motion-reduce:animate-none" />
              </div>
            </div>
          </div>
          <p className="sr-only">Loading My Telepizza…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    const returnPath = "/my-telepizza";
    return (
      <div className="min-h-screen bg-background py-12 sm:py-16">
        <div className="container max-w-lg">
          <section
            className="overflow-hidden rounded-3xl border border-border bg-white text-center shadow-sm"
            aria-labelledby="my-telepizza-signin-heading"
          >
            <div className="h-1.5 brand-gradient" aria-hidden="true" />
            <div className="space-y-5 px-6 py-10 sm:px-10">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-brand-cream">
                <UserCircle2 className="h-9 w-9 text-brand-red" aria-hidden="true" />
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-red">
                  Telepizza Pakistan
                </p>
                <h1 id="my-telepizza-signin-heading" className="brand-heading text-3xl mb-3">
                  My Telepizza
                </h1>
                <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
                  Sign in for your personal hub — reorder, track, addresses, and faster checkout. Guest
                  ordering stays available from the menu anytime.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Button
                  asChild
                  className="w-full rounded-2xl brand-gradient text-white font-semibold sm:min-w-[9.5rem]"
                >
                  <Link
                    href={`/login?next=${encodeURIComponent(returnPath)}`}
                    onClick={() => rememberAuthNextPath(returnPath)}
                  >
                    Sign in
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="w-full rounded-2xl font-semibold sm:min-w-[9.5rem]"
                >
                  <Link
                    href={`/register?next=${encodeURIComponent(returnPath)}`}
                    onClick={() => rememberAuthNextPath(returnPath)}
                  >
                    Create account
                  </Link>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Powered by Mianx.ai</p>
            </div>
          </section>
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
  const emailVerified = Boolean(user.email_confirmed_at);
  const phoneStatusTone: StatusTone = profile?.phone
    ? profile.phoneVerified
      ? "success"
      : "warning"
    : "neutral";
  const phoneStatusBadgeLabel = profile?.phone
    ? profile.phoneVerified
      ? "Phone ✓ Verified"
      : "Phone ⚠ Verification Pending"
    : "Phone Not Set";
  const completion = profileCompletion({
    fullName: fullName.trim() ? fullName : "",
    emailVerified,
    hasPhone: Boolean(profile?.phone),
    hasDeviceAddress: addresses.length > 0,
  });
  const passwordChecks = getPasswordRequirementChecks(password);

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
      setProfileNotice(
        phone.trim()
          ? "Profile saved. Phone remains Unverified until WhatsApp OTP launches."
          : "Profile saved.",
      );
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
      setPasswordNotice(
        firstTimePassword
          ? "You can now sign in using Google or email and password."
          : "Your Telepizza password was updated.",
      );
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
      setEmailChangeNotice(
        "Check your inbox (and spam) to confirm the new email. Until confirmed, keep using your current address to sign in.",
      );
    } finally {
      setEmailChangeBusy(false);
    }
  }

  function handleSaveAddress(event: FormEvent) {
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
        ? "Device draft updated (this browser only)."
        : "Device draft saved for faster checkout on this browser only.",
    );
  }

  function handleRemoveAddress(addressId: string) {
    if (!window.confirm("Delete this saved address?")) return;
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

  const welcomeInitial = (displayName.trim().charAt(0) || "T").toUpperCase();
  const recentOrdersPreview = localOrders.slice(0, 2);
  const defaultAddress = addresses.find((address) => address.isDefault) ?? addresses[0] ?? null;

  return (
    <div className="min-h-screen bg-background py-8 sm:py-10">
      <a
        href="#my-telepizza-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-2xl focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-brand-red focus:shadow-md focus:outline-none focus:ring-2 focus:ring-brand-red"
      >
        Skip to My Telepizza content
      </a>
      <div className="container max-w-5xl space-y-6">
        <header className="overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-white via-brand-cream/50 to-white shadow-sm">
          <div className="h-1.5 brand-gradient" aria-hidden="true" />
          <div className="flex flex-wrap items-start justify-between gap-4 p-4 sm:p-6">
            <div className="flex min-w-0 items-start gap-3 sm:gap-4">
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl brand-gradient text-lg font-bold text-white shadow-sm sm:h-14 sm:w-14 sm:text-xl"
                aria-hidden="true"
              >
                {welcomeInitial}
              </div>
              <div className="min-w-0 space-y-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-red mb-1">
                    My Telepizza
                  </p>
                  <h1 className="brand-heading text-2xl sm:text-3xl mb-1 break-words">
                    Welcome back, {displayName}
                  </h1>
                  {email ? (
                    <p className="text-sm text-muted-foreground break-all">{email}</p>
                  ) : null}
                  {profile?.phone ? (
                    <p className="text-sm text-muted-foreground mt-1">{profile.phone}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-1">
                      Add a phone number in Profile for faster checkout.
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2" aria-label="Verification status">
                  <StatusBadge
                    label={emailVerified ? "Email ✓ Verified" : "Email ⚠ Verification Pending"}
                    tone={emailVerified ? "success" : "warning"}
                  />
                  <StatusBadge label={phoneStatusBadgeLabel} tone={phoneStatusTone} />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Telepizza Pakistan · Powered by Mianx.ai
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                void signOut();
              }}
              className="rounded-2xl shrink-0"
              aria-label="Log out of your Telepizza account"
            >
              <LogOut className="w-4 h-4 mr-2" aria-hidden="true" />
              Logout
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
          <nav
            aria-label="My Telepizza sections"
            className="rounded-3xl border border-border bg-white p-3 h-fit shadow-sm lg:sticky lg:top-24"
          >
            <p className="mb-2 hidden px-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground lg:block">
              Navigate
            </p>
            <ul className="grid grid-cols-2 gap-1 sm:grid-cols-4 lg:flex lg:flex-col">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = section === item.id;
                return (
                  <li key={item.id} className="min-w-0">
                    <button
                      type="button"
                      onClick={() => goTo(item.id)}
                      className={`w-full flex items-center gap-1.5 sm:gap-2 rounded-xl sm:rounded-2xl px-2.5 py-2 sm:px-3 sm:py-2.5 text-left text-xs sm:text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2 ${
                        active
                          ? "bg-brand-red/10 text-brand-red"
                          : "text-brand-charcoal/80 hover:bg-muted/50 hover:text-brand-charcoal"
                      }`}
                      aria-current={active ? "page" : undefined}
                    >
                      <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 opacity-80" aria-hidden="true" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div id="my-telepizza-main" className="space-y-6 min-w-0" tabIndex={-1}>
            {section === "overview" ? (
              <div className="space-y-6">
                <section
                  className="rounded-3xl border border-border bg-white p-4 shadow-sm sm:p-6 space-y-5"
                  aria-labelledby="hub-overview-heading"
                >
                  <div>
                    <h2 id="hub-overview-heading" className="font-bold text-lg">
                      Your hub
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Reorder favourites, track what&apos;s cooking, and keep checkout details ready —
                      without clutter.
                    </p>
                  </div>

                  <div
                    className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3"
                    role="navigation"
                    aria-label="My Telepizza shortcuts"
                  >
                    <QuickActionCard
                      href="/track"
                      icon={Package}
                      title="Track"
                      description="Live order status"
                    />
                    <QuickActionCard
                      icon={RotateCcw}
                      title="Reorder"
                      description={
                        lastCompleted || lastOrder ? "Review & add to cart" : "Place an order first"
                      }
                      disabled={!lastCompleted && !lastOrder}
                      onClick={() => {
                        const target = lastCompleted ?? lastOrder;
                        if (target) openReorderReview(target);
                      }}
                    />
                    <QuickActionCard
                      href="/menu"
                      icon={UtensilsCrossed}
                      title="Menu"
                      description="Browse & order"
                    />
                    <QuickActionCard
                      icon={MapPin}
                      title="Addresses"
                      description="Delivery drafts"
                      onClick={() => goTo("addresses")}
                    />
                  </div>

                  {activeOrder ? (
                    <article className="rounded-2xl border border-brand-red/20 bg-brand-cream/50 p-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-brand-red">
                            Active order
                          </p>
                          <h3 className="font-bold text-brand-charcoal mt-0.5">
                            {activeOrder.orderNumber}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {activeOrder.branchName} · Rs {activeOrder.totalAmount.toLocaleString()}
                          </p>
                        </div>
                        <Button asChild size="sm" className="rounded-2xl brand-gradient text-white">
                          <Link
                            href={`/track/${encodeURIComponent(activeOrder.orderNumber)}?phone=${encodeURIComponent(activeOrder.contactPhone)}`}
                          >
                            Track live
                          </Link>
                        </Button>
                      </div>
                      <OrderStatusTimeline status={activeOrder.status} />
                    </article>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-border bg-brand-cream/20 p-5 text-center space-y-2">
                      <Package className="w-8 h-8 text-brand-red mx-auto" aria-hidden="true" />
                      <p className="font-semibold">No active order right now</p>
                      <p className="text-sm text-muted-foreground">
                        When you place an order, live status will show here.
                      </p>
                      <Button asChild className="mt-2 rounded-2xl brand-gradient text-white">
                        <Link href="/menu">Order from the menu</Link>
                      </Button>
                    </div>
                  )}
                </section>

                <section className="space-y-4" aria-labelledby="hub-more-heading">
                  <div>
                    <h2 id="hub-more-heading" className="font-bold text-base text-brand-charcoal/80">
                      More for you
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Recent orders, delivery drafts, and quieter account shortcuts.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <HubPreviewPanel
                      id="hub-recent-orders"
                      icon={Package}
                      title="Recent Orders"
                      actionLabel={localOrders.length > 0 ? "View all" : "Open orders"}
                      onAction={() => goTo("orders")}
                    >
                      {!profile?.phone ? (
                        <p className="text-sm text-muted-foreground">
                          Add a phone in Profile to match checkout orders on this device.
                        </p>
                      ) : recentOrdersPreview.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No recent orders on this device yet.
                        </p>
                      ) : (
                        <ul className="space-y-2">
                          {recentOrdersPreview.map((order) => (
                            <li
                              key={order.id}
                              className="rounded-xl border border-border/80 bg-brand-cream/30 px-3 py-2"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-brand-red">
                                    {order.orderNumber}
                                  </p>
                                  <p className="truncate text-xs text-muted-foreground">
                                    {order.branchName} · Rs {order.totalAmount.toLocaleString()}
                                  </p>
                                </div>
                                <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-xs font-semibold capitalize text-brand-charcoal">
                                  {order.status}
                                </span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </HubPreviewPanel>

                    <HubPreviewPanel
                      id="hub-saved-addresses"
                      icon={MapPin}
                      title="Saved Addresses"
                      actionLabel="Manage"
                      onAction={() => goTo("addresses")}
                    >
                      <p className="font-bold text-brand-charcoal">
                        {addresses.length === 0
                          ? "None on this device"
                          : `${addresses.length} device draft${addresses.length === 1 ? "" : "s"}`}
                      </p>
                      {defaultAddress ? (
                        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                          {defaultAddress.isDefault ? "Default · " : ""}
                          {formatSavedAddress(defaultAddress)}
                        </p>
                      ) : (
                        <p className="mt-1 text-sm text-muted-foreground">
                          Save a draft for faster Multan delivery checkout.
                        </p>
                      )}
                      <p className="mt-2 text-xs text-muted-foreground">
                        {ADDRESSES_CLOUD_SYNC_AVAILABLE
                          ? "Synced to your account."
                          : "Saved on this device only — not synced to your account yet."}
                      </p>
                    </HubPreviewPanel>
                  </div>

                  <div className="rounded-2xl border border-dashed border-border bg-white/60 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                      Account shortcuts
                    </p>
                    <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
                      <li>
                        <button
                          type="button"
                          className="font-semibold text-brand-red underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2 rounded-md"
                          onClick={() => goTo("profile")}
                        >
                          Profile
                        </button>
                      </li>
                      <li>
                        <button
                          type="button"
                          className="font-semibold text-brand-red underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2 rounded-md"
                          onClick={() => goTo("security")}
                        >
                          Security
                        </button>
                      </li>
                      <li>
                        <button
                          type="button"
                          className="font-semibold text-brand-red underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2 rounded-md"
                          onClick={() => goTo("notifications")}
                        >
                          Notification prefs
                        </button>
                      </li>
                      <li>
                        <Link
                          href="/notifications"
                          className="font-semibold text-brand-red underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2 rounded-md"
                        >
                          Device inbox
                        </Link>
                      </li>
                      <li className="text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <Heart className="h-3.5 w-3.5" aria-hidden="true" />
                          Favorites — coming soon
                        </span>
                      </li>
                      <li className="text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <Star className="h-3.5 w-3.5" aria-hidden="true" />
                          Reviews — coming soon
                        </span>
                      </li>
                    </ul>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-border/80 bg-muted/10 p-4 space-y-2">
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <Store className="w-4 h-4 text-brand-red" aria-hidden="true" />
                        Preferred branch
                      </div>
                      <p className="font-bold text-brand-charcoal">{selectedBranch.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Selected on this device only. Saving a preferred branch to your account is
                        coming later.
                      </p>
                      <Button asChild type="button" variant="outline" size="sm" className="rounded-2xl">
                        <Link href="/branches">Change branch</Link>
                      </Button>
                    </div>
                    <div className="rounded-2xl border border-border/80 bg-muted/10 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold">Profile completion</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {completion.missing.length === 0
                              ? "Looking good — you are set for faster checkout."
                              : completion.missing[0]}
                          </p>
                        </div>
                        <p className="font-[var(--font-accent)] font-bold text-brand-red text-lg">
                          {completion.score}%
                        </p>
                      </div>
                      <div
                        className="mt-3 h-2 rounded-full bg-brand-cream overflow-hidden"
                        role="progressbar"
                        aria-valuenow={completion.score}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label="Profile completion"
                      >
                        <div
                          className="h-full bg-brand-red motion-safe:transition-all"
                          style={{ width: `${completion.score}%` }}
                        />
                      </div>
                      {completion.missing.length > 0 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="mt-2 rounded-2xl px-2 text-brand-red"
                          onClick={() => goTo(completion.missing[0]?.includes("address") ? "addresses" : "profile")}
                        >
                          Finish next step
                          <ChevronRight className="ml-1 h-4 w-4" aria-hidden="true" />
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  {lastCompleted || lastOrder ? (
                    <div className="rounded-2xl border border-border/80 bg-muted/10 p-4 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">Quick reorder</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {(lastCompleted ?? lastOrder)!.orderNumber} · review live prices before
                          adding to cart
                        </p>
                      </div>
                      <Button
                        type="button"
                        className="rounded-2xl brand-gradient text-white font-semibold"
                        disabled={catalogLoading}
                        onClick={() => openReorderReview((lastCompleted ?? lastOrder)!)}
                      >
                        Review &amp; reorder
                      </Button>
                    </div>
                  ) : null}
                </section>

                                <HubSupportCard
                  orderNumber={activeOrder?.orderNumber}
                  contactPhone={activeOrder?.contactPhone}
                />
              </div>
            ) : null}

            {section === "profile" ? (
              <form
                onSubmit={(event) => void handleSaveProfile(event)}
                className="rounded-3xl border border-border bg-white p-4 shadow-sm sm:p-6 space-y-5"
                noValidate
              >
                <div>
                  <h2 className="font-bold text-lg">Profile</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Keep your contact details up to date for faster ordering and delivery.
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
                  <p className="text-xs font-[var(--font-accent)] font-semibold text-brand-charcoal flex flex-wrap items-center gap-2">
                    <span>Email status:</span>
                    <StatusBadge
                      label={emailVerified ? "✓ Verified" : "⚠ Verification Pending"}
                      tone={emailVerified ? "success" : "warning"}
                    />
                    {!emailVerified ? (
                      <span className="font-normal text-muted-foreground">
                        — confirm via email link
                      </span>
                    ) : null}
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
                  <div className="flex flex-wrap items-center gap-2 text-xs font-[var(--font-accent)] font-semibold text-brand-charcoal">
                    <span>Phone status:</span>
                    <StatusBadge label={phoneStatusBadgeLabel} tone={phoneStatusTone} />
                    {profile?.phone && !profile.phoneVerified ? (
                      <span className="font-normal text-muted-foreground">
                        — verification by WhatsApp OTP is not available yet
                      </span>
                    ) : null}
                  </div>
                  {profile?.phone && !profile.phoneVerified ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-2xl"
                      disabled
                      title="Phone verification is coming soon"
                      aria-disabled="true"
                    >
                      Verify phone (Coming Soon)
                    </Button>
                  ) : null}
                </div>
                {profileError ? (
                  <p className="text-sm text-brand-red" role="alert">
                    {profileError}
                  </p>
                ) : null}
                {profileNotice ? (
                  <p className="text-sm text-emerald-700" role="status" aria-live="polite">
                    {profileNotice}
                  </p>
                ) : null}
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
              <section className="rounded-3xl border border-border bg-white p-4 shadow-sm sm:p-6 space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-bold text-lg">Addresses</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Device drafts for faster checkout in this browser. They are not synced to your
                      Telepizza account yet.
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
                      Add device draft
                    </Button>
                  ) : null}
                </div>

                <div
                  className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm space-y-2"
                  role="status"
                >
                  <p className="font-semibold text-amber-950">
                    Address book sync is not available yet
                  </p>
                  <p className="text-amber-900/90">
                    Drafts below stay on this browser only. We will not treat them as your full
                    account address book until cloud sync launches.
                  </p>
                </div>

                {addresses.length === 0 && !showAddressForm ? (
                  <div className="rounded-2xl border border-dashed border-border px-6 py-10 text-center space-y-4">
                    <MapPin className="w-14 h-14 text-brand-red mx-auto" aria-hidden="true" />
                    <div>
                      <p className="font-semibold text-lg">No device address drafts yet</p>
                      <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                        Add a Multan delivery draft for quicker checkout on this browser.
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="lg"
                      className="rounded-2xl brand-gradient text-white font-semibold px-8"
                      onClick={() => {
                        setShowAddressForm(true);
                        setEditingAddressId(null);
                        setAddressIsDefault(true);
                        setAddressError(null);
                        setAddressNotice(null);
                      }}
                      aria-label="Add your first delivery address draft"
                    >
                      Add device draft
                    </Button>
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
                        className="flex h-10 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2"
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

                {addressNotice ? (
                  <p className="text-sm text-emerald-700" role="status" aria-live="polite">
                    {addressNotice}
                  </p>
                ) : null}
              </section>
            ) : null}

            {section === "security" ? (
              <section className="rounded-3xl border border-border bg-white p-4 shadow-sm sm:p-6 space-y-5">
                <div>
                  <h2 className="font-bold text-lg">Security & login methods</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Review how you sign in and keep your Telepizza customer account secure.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <SecurityFact
                    label="Email"
                    value={
                      <StatusBadge
                        label={emailVerified ? "Verified" : "Unverified"}
                        tone={emailVerified ? "success" : "warning"}
                      />
                    }
                  />
                  <SecurityFact
                    label="Phone"
                    value={
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge label={phoneStatusBadgeLabel} tone={phoneStatusTone} />
                        {profile?.phone && !profile.phoneVerified ? (
                          <span className="text-xs text-muted-foreground font-normal">
                            Verification coming soon
                          </span>
                        ) : null}
                      </div>
                    }
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
                  Only this device's session is shown. Use Logout above to end it.
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
                    <div
                      className="rounded-2xl border border-border bg-muted/30 p-4 space-y-2"
                      aria-live="polite"
                    >
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Password requirements
                      </p>
                      <p className="text-sm text-brand-charcoal">{AUTH_PASSWORD_REQUIREMENTS_COPY}</p>
                      <ul className="space-y-1.5 text-xs" aria-label="Password strength checklist">
                        {passwordChecks.map((check) => (
                          <li
                            key={check.id}
                            className={
                              check.met
                                ? "text-emerald-700 font-semibold"
                                : "text-muted-foreground"
                            }
                          >
                            {check.met ? "✓" : "○"} {check.label}
                          </li>
                        ))}
                      </ul>
                    </div>
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
                          className="absolute inset-y-0 right-0 rounded-r-2xl px-3 text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-inset"
                          onClick={() => setShowPassword((value) => !value)}
                          aria-label={showPassword ? "Hide password" : "Show password"}
                          disabled={passwordBusy}
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" aria-hidden="true" />
                          ) : (
                            <Eye className="w-4 h-4" aria-hidden="true" />
                          )}
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
                    </div>
                    {passwordError ? (
                      <p className="text-sm text-brand-red" role="alert">
                        {passwordError}
                      </p>
                    ) : null}
                    {passwordNotice ? (
                      <p className="text-sm text-emerald-700" role="status" aria-live="polite">
                        {passwordNotice}
                      </p>
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
                    <Button asChild type="button" variant="ghost" className="rounded-2xl">
                      <Link href="/forgot-password">Forgot password?</Link>
                    </Button>
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
                    Your account stays the same. Confirm the new address by email before it becomes
                    active; you may also be asked to approve the change from your current inbox.
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
                    <p className="text-sm text-emerald-700" role="status" aria-live="polite">
                      {emailChangeNotice}
                    </p>
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
              <section
                className="rounded-3xl border border-border bg-white p-4 shadow-sm sm:p-6 space-y-4"
                aria-labelledby="hub-orders-section-heading"
              >
                <div>
                  <h2 id="hub-orders-section-heading" className="font-bold text-lg">
                    Recent Orders
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {!profile?.phone
                      ? "Add a phone number in Profile so we can match your checkout orders on this device."
                      : localOrders.length === 0
                        ? "You have no recent orders on this device yet."
                        : localOrders.length === 1
                          ? "You have 1 recent order on this device."
                          : `You have ${localOrders.length} recent orders on this device.`}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Real checkout history for this browser/phone only — not a fabricated list.
                  </p>
                </div>
                {!profile?.phone ? (
                  <div className="rounded-2xl border border-dashed border-border bg-brand-cream/20 p-6 text-center">
                    <Package className="w-8 h-8 text-brand-red mx-auto mb-2" aria-hidden="true" />
                    <p className="font-semibold">Add a phone number to match orders</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Orders are matched by the phone used at checkout. Save your phone in Profile
                      first.
                    </p>
                    <Button
                      type="button"
                      className="mt-4 rounded-2xl brand-gradient text-white font-semibold"
                      onClick={() => goTo("profile")}
                    >
                      Go to Profile
                    </Button>
                  </div>
                ) : hubOrders.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border bg-brand-cream/20 p-6 text-center">
                    <Package className="w-8 h-8 text-brand-red mx-auto mb-2" aria-hidden="true" />
                    <p className="font-semibold">No orders yet</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      When you place an order with this phone, it will appear here.
                    </p>
                    <Button asChild className="mt-4 rounded-2xl brand-gradient text-white font-semibold">
                      <Link href="/menu">Browse menu</Link>
                    </Button>
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {localOrders.slice(0, 5).map((order) => (
                      <li
                        key={order.id}
                        className="rounded-2xl border border-border bg-gradient-to-br from-white to-brand-cream/20 p-4 space-y-3"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-semibold text-brand-red">{order.orderNumber}</div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {new Date(order.createdAt).toLocaleString()} · {order.branchName}
                            </p>
                            <p className="text-sm font-semibold mt-1">
                              Rs {order.totalAmount.toLocaleString()}
                            </p>
                          </div>
                          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold capitalize">
                            {order.status}
                          </span>
                        </div>
                        <OrderStatusTimeline status={order.status} compact />
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="rounded-2xl"
                            disabled={catalogLoading}
                            onClick={() => openReorderReview(order)}
                          >
                            Reorder
                          </Button>
                          <Button asChild type="button" variant="outline" size="sm" className="rounded-2xl">
                            <Link
                              href={`/track/${encodeURIComponent(order.orderNumber)}?phone=${encodeURIComponent(order.contactPhone)}`}
                            >
                              Track
                            </Link>
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <Button
                    asChild
                    className="w-full rounded-2xl brand-gradient text-white font-semibold sm:w-auto"
                  >
                    <Link href="/orders">View Order History</Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full rounded-2xl sm:w-auto">
                    <Link href="/menu">Browse menu</Link>
                  </Button>
                </div>
              </section>
            ) : null}

            {section === "loyalty" ? (
              <section className="rounded-3xl border border-border bg-white p-4 shadow-sm sm:p-6 space-y-5">
                <div>
                  <h2 className="font-bold text-lg">Telepizza Rewards</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Offers will appear here when Rewards launches — no points are earned yet.
                  </p>
                </div>
                <div className="rounded-2xl border border-dashed border-border p-6 sm:p-8 text-center space-y-4">
                  <Gift className="w-10 h-10 text-brand-red mx-auto" aria-hidden="true" />
                  <div>
                    <StatusBadge label="Coming Soon" tone="warning" />
                    <h3 className="font-semibold text-lg mt-3">Coming soon</h3>
                    <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                      Offers will appear here. We will not show fake balances or invented savings.
                    </p>
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-2 text-left max-w-sm mx-auto list-disc pl-5">
                    <li>Earn points on eligible orders (when the ledger ships)</li>
                    <li>Redeem real rewards on future pizzas and sides</li>
                    <li>Member offers when the program launches</li>
                  </ul>
                </div>
              </section>
            ) : null}

            {section === "notifications" ? (
              <section
                className="rounded-3xl border border-border bg-white p-4 shadow-sm sm:p-6 space-y-4"
                aria-labelledby="hub-notifications-section-heading"
              >
                <div>
                  <h2 id="hub-notifications-section-heading" className="font-bold text-lg">
                    Notifications &amp; checkout prefs
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Prefer how you hear from Telepizza. Preference controls are coming soon —
                    nothing can be saved yet.
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-brand-cream/30 p-4 text-sm space-y-2">
                  <p className="font-semibold">Payment preferences</p>
                  <p className="text-muted-foreground">
                    Checkout supports paying with your order (cash / pay on delivery or pickup) when
                    you place it. JazzCash, EasyPaisa, and saved cards are <strong>not live</strong>{" "}
                    yet — we will not pretend they are.
                  </p>
                </div>
                <div
                  className="space-y-2"
                  role="group"
                  aria-label="Notification preferences coming soon"
                >
                  <PreferenceSwitch
                    label="Order Updates"
                    description="Status changes from kitchen to delivery"
                  />
                  <PreferenceSwitch
                    label="Promotions"
                    description="Seasonal deals and limited-time offers"
                  />
                  <PreferenceSwitch
                    label="Delivery Alerts"
                    description="Rider and arrival updates for your order"
                  />
                  <PreferenceSwitch
                    label="Special Offers"
                    description="Member-only discounts when Rewards launches"
                  />
                </div>
                <div className="rounded-2xl border border-dashed border-border p-4">
                  <p className="text-sm font-semibold text-brand-charcoal">Device inbox</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Order update messages stored on this browser appear in your notifications inbox.
                  </p>
                  <Button asChild type="button" variant="outline" size="sm" className="mt-3 rounded-2xl">
                    <Link href="/notifications">Open notifications inbox</Link>
                  </Button>
                </div>
              </section>
            ) : null}
          </div>
        </div>
      </div>

      <ReorderReviewDialog
        open={reorderOpen}
        preview={reorderPreview}
        onOpenChange={(open) => {
          setReorderOpen(open);
          if (!open) setReorderPreview(null);
        }}
        onConfirm={confirmReorder}
      />
    </div>
  );
}

function SecurityFact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-2xl border border-border p-4 min-w-0">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="font-semibold mt-1 break-words">{value}</div>
    </div>
  );
}

function StatusBadge({ label, tone }: { label: string; tone: StatusTone }) {
  const toneClass =
    tone === "success"
      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
      : tone === "warning"
        ? "bg-amber-50 text-amber-900 border-amber-200"
        : "bg-muted text-muted-foreground border-border";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${toneClass}`}
    >
      {label}
    </span>
  );
}

function PreferenceSwitch({ label, description }: { label: string; description: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-muted/20 p-4 text-sm">
      <div className="min-w-0">
        <div className="font-semibold">{label}</div>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        <p className="text-xs text-amber-800 font-semibold mt-1">Coming Soon — not available yet</p>
      </div>
      <input
        type="checkbox"
        disabled
        aria-label={`${label}: coming soon, not available yet`}
        className="h-4 w-4 shrink-0 accent-brand-red opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2"
      />
    </div>
  );
}

const quickActionClassName =
  "group flex h-full min-h-[6.5rem] w-full flex-col items-start gap-2 rounded-2xl border border-border bg-gradient-to-br from-white to-brand-cream/40 p-3 text-left shadow-sm transition-colors hover:border-brand-red/25 hover:bg-brand-cream/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 sm:min-h-[7rem] sm:p-3.5";

function QuickActionCard({
  icon: Icon,
  title,
  description,
  href,
  onClick,
  disabled = false,
}: {
  icon: typeof Package;
  title: string;
  description: string;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const content = (
    <>
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-brand-red/10 text-brand-red">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span>
        <span className="block text-sm font-semibold text-brand-charcoal">{title}</span>
        <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground sm:text-xs">
          {description}
        </span>
      </span>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={quickActionClassName}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={quickActionClassName}
      disabled={disabled}
      onClick={onClick}
    >
      {content}
    </button>
  );
}

function HubPreviewPanel({
  id,
  icon: Icon,
  title,
  children,
  actionLabel,
  onAction,
  actionHref,
}: {
  id: string;
  icon: typeof Package;
  title: string;
  children: ReactNode;
  actionLabel: string;
  onAction?: () => void;
  actionHref?: string;
}) {
  const headingId = `${id}-heading`;
  return (
    <section
      className="flex h-full flex-col rounded-2xl border border-border bg-white p-4 shadow-[0_1px_0_rgba(31,31,31,0.03)]"
      aria-labelledby={headingId}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-cream text-brand-red">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
          <h3 id={headingId} className="truncate text-sm font-semibold text-brand-charcoal">
            {title}
          </h3>
        </div>
        {actionHref ? (
          <Button
            asChild
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 shrink-0 rounded-xl px-2 text-brand-red"
          >
            <Link href={actionHref}>
              {actionLabel}
              <ChevronRight className="ml-0.5 h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 shrink-0 rounded-xl px-2 text-brand-red"
            onClick={onAction}
          >
            {actionLabel}
            <ChevronRight className="ml-0.5 h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        )}
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </section>
  );
}

function getPasswordRequirementChecks(password: string) {
  return [
    {
      id: "length",
      label: `At least ${AUTH_MIN_PASSWORD_LENGTH} characters`,
      met: password.length >= AUTH_MIN_PASSWORD_LENGTH,
    },
    {
      id: "upper",
      label: "One uppercase letter",
      met: /[A-Z]/.test(password),
    },
    {
      id: "lower",
      label: "One lowercase letter",
      met: /[a-z]/.test(password),
    },
    {
      id: "digit",
      label: "One number",
      met: /\d/.test(password),
    },
    {
      id: "symbol",
      label: "One special character",
      met: /[^A-Za-z0-9]/.test(password),
    },
  ] as const;
}
