import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  Bell,
  ChevronRight,
  Eye,
  EyeOff,
  Gift,
  Heart,
  Loader2,
  MapPin,
  Package,
  RotateCcw,
  Settings,
  Shield,
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
import { CustomerAccountMenu } from "@/components/my-telepizza/CustomerAccountMenu";
import { CustomerPageHeader } from "@/components/my-telepizza/CustomerPageHeader";
import { CustomerShell } from "@/components/my-telepizza/CustomerShell";
import { HubSupportCard } from "@/components/my-telepizza/HubSupportCard";
import { OrderStatusTimeline } from "@/components/my-telepizza/OrderStatusTimeline";
import { ReorderReviewDialog } from "@/components/my-telepizza/ReorderReviewDialog";
import {
  AUTH_MIN_PASSWORD_LENGTH,
  AUTH_PASSWORD_REQUIREMENTS_COPY,
  hasEmailIdentity,
  hasFacebookIdentity,
  hasGoogleIdentity,
  isFirstTimePasswordAttach,
} from "@/lib/auth-utils";
import { rememberAuthNextPath } from "@/lib/auth-redirect";
import {
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
  cloudAddressToSaved,
  cloudAddressesAvailable,
  createCloudAddress,
  fetchCloudAddresses,
  importCloudAddresses,
  updateCloudAddress,
} from "@/lib/customer-addresses-api";
import { toCustomerMessage } from "@/lib/customer-errors";
import { listLocalOrders, type StoredOrder } from "@/lib/customer-store";
import {
  cloudDetailToStored,
  cloudListItemToStored,
  cloudOrdersAvailable,
  fetchCloudOrderDetail,
  fetchCloudOrders,
} from "@/lib/customer-orders-api";
import {
  computeProfileCompletion,
  legacyHashCanonicalPath,
  pathForSection,
  phoneStatusLabel,
  primaryTabForSection,
  resolveDisplayName,
  sectionFromLocation,
  type HubSection,
} from "@/lib/my-telepizza-nav";
import { toast } from "sonner";
import { CustomerEmptyState } from "@/components/my-telepizza/CustomerEmptyState";
import { CustomerRetryCard } from "@/components/my-telepizza/CustomerRetryCard";
import { BRAND } from "@/lib/brand";
import { bucketForOrderStatus } from "@/lib/order-status";
import {
  buildReorderPreview,
  confirmedReorderCartItems,
  type ReorderPreview,
} from "@/lib/reorder";
import { normalizePakistaniMobileE164 } from "@/lib/phone";

type StatusTone = "success" | "warning" | "neutral";

export default function MyTelepizza() {
  const {
    profile,
    user,
    session,
    isAuthenticated,
    isLoading,
    isProfileSyncDegraded,
    signOut,
    updateProfile,
    setPassword,
    requestEmailChange,
    refreshProfile,
  } = useAuth();
  const { selectedBranch } = useBranch();
  const { items: catalogItems, isLoading: catalogLoading } = useMenuCatalog();
  const { addItem, setOrderDetails } = useCart();
  const [location, navigate] = useLocation();

  const [section, setSection] = useState<HubSection>(() =>
    typeof window === "undefined"
      ? "overview"
      : sectionFromLocation(window.location.pathname, window.location.hash),
  );
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
  const [ordersLoading, setOrdersLoading] = useState(false);

  useEffect(() => {
    setFullName(profile?.fullName ?? "");
    setPhone(profile?.phone ?? "");
  }, [profile]);

  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    const legacy = legacyHashCanonicalPath(location.split("?")[0], hash);
    if (legacy) {
      navigate(legacy, { replace: true });
      return;
    }
    setSection(sectionFromLocation(location.split("?")[0], hash));
  }, [location, navigate]);

  useEffect(() => {
    const onHash = () => {
      const path = typeof window !== "undefined" ? window.location.pathname : location;
      const hash = typeof window !== "undefined" ? window.location.hash : "";
      const legacy = legacyHashCanonicalPath(path, hash);
      if (legacy) {
        navigate(legacy, { replace: true });
        return;
      }
      setSection(sectionFromLocation(path, hash));
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [location, navigate]);

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
    setAddressLine2("");
    setAddressLandmark("");
    setAddressRecipientName(fullName || profile?.fullName || "");
    setAddressPhone(phone || profile?.phone || "");
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
  const usingCloudAddresses = Boolean(
    isAuthenticated && session?.access_token && cloudAddressesAvailable(),
  );
  const addressSaveAvailable =
    !cloudAddressesAvailable() || Boolean(session?.access_token);
  const usingCloudOrders = Boolean(
    isAuthenticated && session?.access_token && cloudOrdersAvailable,
  );

  useEffect(() => {
    if (!ownerKey) {
      setAddresses([]);
      return;
    }
    setAddresses(listSavedAddresses(ownerKey));
  }, [ownerKey]);

  useEffect(() => {
    if (!usingCloudAddresses || !session?.access_token) {
      setCloudAddresses([]);
      return;
    }
    setAddressesLoading(true);
    setAddressesError(null);
    void fetchCloudAddresses(session.access_token)
      .then((rows) => setCloudAddresses(rows.map(cloudAddressToSaved)))
      .catch((error) =>
        setAddressesError(toCustomerMessage(error, "addresses")),
      )
      .finally(() => setAddressesLoading(false));
  }, [usingCloudAddresses, session?.access_token]);

  useEffect(() => {
    if (!usingCloudOrders || !session?.access_token) {
      setCloudOrders([]);
      return;
    }
    setOrdersLoading(true);
    void fetchCloudOrders(session.access_token, { limit: 20, offset: 0 })
      .then((result) => {
        setCloudOrders(result.orders.map(cloudListItemToStored));
      })
      .catch(() => {
        setCloudOrders([]);
      })
      .finally(() => setOrdersLoading(false));
  }, [usingCloudOrders, session?.access_token]);

  const displayedAddresses = usingCloudAddresses ? cloudAddresses : addresses;

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
    navigate(pathForSection(next));
  }

  async function openReorderReview(order: StoredOrder) {
    if (catalogLoading) return;
    try {
      let target = order;
      if (usingCloudOrders && session?.access_token && order.items.length === 0) {
        const detail = await fetchCloudOrderDetail(session.access_token, order.orderNumber);
        target = cloudDetailToStored(detail);
      }
      setReorderPreview(buildReorderPreview(target, catalogItems));
      setReorderOpen(true);
    } catch {
      // Reorder preview stays closed when detail fetch fails.
    }
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
            <div className="hidden lg:block">
              <div className="flex flex-col gap-1 rounded-3xl border border-border bg-white p-3 shadow-sm">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-10 rounded-2xl bg-muted/60 animate-pulse motion-reduce:animate-none"
                  />
                ))}
              </div>
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
              <div className="grid w-full min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                <Button
                  asChild
                  className="h-auto min-h-12 w-full min-w-0 whitespace-normal rounded-2xl brand-gradient px-3 text-white font-semibold"
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
                  className="h-auto min-h-12 w-full min-w-0 whitespace-normal rounded-2xl px-3 font-semibold"
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
  const providerFullName =
    (user.user_metadata?.full_name as string | undefined)?.trim() ||
    (user.user_metadata?.name as string | undefined)?.trim() ||
    null;
  const avatarUrl =
    (user.user_metadata?.avatar_url as string | undefined)?.trim() ||
    (user.user_metadata?.picture as string | undefined)?.trim() ||
    null;
  const displayName = resolveDisplayName({
    editedOrStoredName: fullName || profile?.fullName,
    providerFullName,
    email,
  });
  const googleConnected = hasGoogleIdentity(user);
  const facebookConnected = hasFacebookIdentity(user);
  const emailPasswordAvailable = hasEmailIdentity(user);
  const firstTimePassword = isFirstTimePasswordAttach(user);
  const canSetPassword = Boolean(email);
  const emailVerified = Boolean(user.email_confirmed_at);
  // Badge follows the visible field so a typed/persisted number never says "Add phone".
  const effectivePhone = (profile?.phone || phone.trim() || "").trim() || null;
  const phoneStatus = phoneStatusLabel({
    phone: effectivePhone,
    phoneVerified: profile?.phoneVerified,
  });
  // Completion uses persisted account data only — never unsaved form drafts.
  const persistedPhone = (profile?.phone ?? "").trim();
  const persistedName = (profile?.fullName ?? "").trim();
  const phoneStatusTone: StatusTone = phoneStatus.tone;
  const phoneStatusBadgeLabel = phoneStatus.label;
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
      setProfileNotice("Profile updated successfully.");
      toast.success("Profile updated successfully.");
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
      const successMessage = firstTimePassword
        ? "Password created successfully."
        : "Password changed.";
      setPasswordNotice(successMessage);
      toast.success(successMessage);
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
        "Verification pending — check your inbox (and spam) to confirm the new email. Keep using your current address until then.",
      );
      toast.success("Email verification sent.");
    } finally {
      setEmailChangeBusy(false);
    }
  }

  async function handleSaveAddress(event: FormEvent) {
    event.preventDefault();
    if (!addressSaveAvailable) {
      setAddressError("Saving addresses is temporarily unavailable. Please try again shortly.");
      return;
    }
    setAddressError(null);
    setAddressNotice(null);

    if (usingCloudAddresses && session?.access_token) {
      try {
        const payload = {
          label: addressLabel,
          recipientName: addressRecipientName.trim() || fullName.trim() || "Customer",
          phone: addressPhone.trim() || phone.trim() || profile?.phone || "",
          line1: addressLine1,
          line2: addressLine2 || undefined,
          landmark: addressLandmark || undefined,
          area: addressArea || undefined,
          city: addressCity || undefined,
          isDefault: addressIsDefault,
        };
        if (editingAddressId) {
          await updateCloudAddress(session.access_token, editingAddressId, payload);
        } else {
          await createCloudAddress(session.access_token, payload);
        }
        setCloudAddresses((await fetchCloudAddresses(session.access_token)).map(cloudAddressToSaved));
        resetAddressForm();
        setAddressNotice(
          editingAddressId ? "Address updated in your account." : "Address saved to your account.",
        );
      } catch (error) {
        setAddressError(toCustomerMessage(error, "addresses"));
      }
      return;
    }

    const input = {
      label: addressLabel,
      line1: addressLine1,
      line2: addressLine2,
      area: addressArea,
      city: addressCity,
      landmark: addressLandmark,
      notes: addressNotes,
      recipientName: addressRecipientName.trim() || fullName.trim() || "Customer",
      phone: addressPhone.trim() || phone.trim(),
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

  async function handleImportDeviceDrafts() {
    if (!usingCloudAddresses || !session?.access_token || !ownerKey) return;
    const drafts = listSavedAddresses(ownerKey);
    if (!drafts.length) return;
    setAddressError(null);
    setAddressNotice(null);
    try {
      await importCloudAddresses(
        session.access_token,
        drafts.map((draft) =>
          draftToImportPayload(draft, {
            recipientName: profile?.fullName ?? fullName,
            phone: profile?.phone ?? phone,
          }),
        ),
      );
      markAddressImportCompleted(ownerKey);
      setCloudAddresses((await fetchCloudAddresses(session.access_token)).map(cloudAddressToSaved));
      setAddressNotice("Device drafts imported to your account.");
    } catch (error) {
      setAddressError(toCustomerMessage(error, "addresses"));
    }
  }

  async function handleRemoveAddress(addressId: string) {
    if (!window.confirm("Delete this saved address?")) return;
    if (usingCloudAddresses && session?.access_token) {
      try {
        await archiveCloudAddress(session.access_token, addressId);
        setCloudAddresses((await fetchCloudAddresses(session.access_token)).map(cloudAddressToSaved));
        setAddressNotice("Address removed from your account.");
      } catch (error) {
        setAddressError(toCustomerMessage(error, "addresses"));
      }
      return;
    }
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
    setAddressRecipientName(address.recipientName || fullName);
    setAddressPhone(address.phone || phone);
    setAddressLine2(address.line2);
    setAddressLandmark(address.landmark);
    setAddressNotes(address.notes);
    setAddressIsDefault(address.isDefault);
    setAddressError(null);
    setAddressNotice(null);
    setShowAddressForm(true);
  }

  async function handleSetDefaultAddress(addressId: string) {
    if (usingCloudAddresses && session?.access_token) {
      const target = cloudAddresses.find((entry) => entry.id === addressId);
      if (!target) return;
      try {
        await updateCloudAddress(session.access_token, addressId, {
          label: target.label,
          recipientName: target.recipientName,
          phone: target.phone,
          line1: target.line1,
          line2: target.line2,
          landmark: target.landmark,
          area: target.area,
          city: target.city,
          deliveryZone: target.deliveryZone,
          preferredBranchId: target.preferredBranchId,
          isDefault: true,
        });
        setCloudAddresses((await fetchCloudAddresses(session.access_token)).map(cloudAddressToSaved));
        setAddressNotice("Default delivery address updated.");
      } catch (error) {
        setAddressError(toCustomerMessage(error, "addresses"));
      }
      return;
    }
    setDefaultSavedAddress(ownerKey, addressId);
    setAddresses(listSavedAddresses(ownerKey));
    setAddressNotice("Default delivery address updated.");
  }

  const recentOrdersPreview = hubOrders.slice(0, 2);
  const defaultAddress =
    displayedAddresses.find((address) => address.isDefault) ?? displayedAddresses[0] ?? null;
  const deviceDraftCount = addresses.length;
  const showImportDrafts =
    usingCloudAddresses &&
    deviceDraftCount > 0 &&
    !hasCompletedAddressImport(ownerKey);
  const persistedAddresses =
    usingCloudAddresses && !addressesError ? cloudAddresses : [];
  const needsBasics = !persistedPhone || persistedAddresses.length === 0;
  const profileCompletion = computeProfileCompletion({
    emailVerified,
    hasName: Boolean(persistedName),
    hasPhone: Boolean(persistedPhone),
    hasAddress: persistedAddresses.length > 0,
  });
  const hasPastOrders =
    hubOrders.some((order) => bucketForOrderStatus(order.status) !== "active") ||
    Boolean(lastCompleted || lastOrder);

  function reloadAddresses() {
    if (!usingCloudAddresses || !session?.access_token) return;
    setAddressesLoading(true);
    setAddressesError(null);
    void fetchCloudAddresses(session.access_token)
      .then((rows) => setCloudAddresses(rows.map(cloudAddressToSaved)))
      .catch((error) => setAddressesError(toCustomerMessage(error, "addresses")))
      .finally(() => setAddressesLoading(false));
  }

  return (
    <CustomerShell
      activeTab={primaryTabForSection(section)}
      identity={
        <CustomerPageHeader
          displayName={displayName}
          email={email}
          avatarUrl={avatarUrl}
          emailVerified={emailVerified}
          phoneLabel={phoneStatusBadgeLabel}
          phoneTone={phoneStatusTone}
          profileCompletion={profileCompletion}
          phoneHint={
            effectivePhone ? (
              <p className="mt-1 text-sm text-muted-foreground">{effectivePhone}</p>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">
                Add a phone number in Account for faster checkout.
              </p>
            )
          }
          onLogout={() => {
            void signOut();
          }}
        />
      }
    >
            {section === "overview" ? (
              <div className="space-y-6">
                <section
                  className="rounded-3xl border border-border bg-white p-4 shadow-sm sm:p-6 space-y-5"
                  aria-labelledby="hub-overview-heading"
                >
                  {activeOrder ? (
                    <>
                      <div>
                        <h2 id="hub-overview-heading" className="font-bold text-lg">
                          Current Order
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1">
                          Track your order in real time.
                        </p>
                      </div>

                      <article className="rounded-2xl border border-brand-red/20 bg-brand-cream/50 p-4 space-y-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0 space-y-1">
                            <p className="text-xs font-semibold uppercase tracking-wide text-brand-red">
                              Order {activeOrder.orderNumber}
                            </p>
                            <h3 className="font-bold text-brand-charcoal break-words capitalize">
                              {activeOrder.status}
                            </h3>
                            <dl className="grid gap-1 text-sm text-muted-foreground">
                              <div>
                                <dt className="inline font-medium text-brand-charcoal">
                                  Restaurant:{" "}
                                </dt>
                                <dd className="inline break-words">{activeOrder.branchName}</dd>
                              </div>
                              {activeOrder.deliveryAddress ? (
                                <div>
                                  <dt className="inline font-medium text-brand-charcoal">
                                    Delivery:{" "}
                                  </dt>
                                  <dd className="inline break-words">
                                    {activeOrder.deliveryAddress}
                                  </dd>
                                </div>
                              ) : null}
                              <div>
                                <dt className="inline font-medium text-brand-charcoal">Total: </dt>
                                <dd className="inline">
                                  Rs {activeOrder.totalAmount.toLocaleString()}
                                </dd>
                              </div>
                            </dl>
                          </div>
                        </div>
                        <OrderStatusTimeline status={activeOrder.status} />
                        <div className="flex flex-wrap gap-2">
                          <Button
                            asChild
                            className="min-h-11 rounded-2xl brand-gradient text-white font-semibold"
                          >
                            <Link
                              href={`/track/${encodeURIComponent(activeOrder.orderNumber)}?phone=${encodeURIComponent(activeOrder.contactPhone)}`}
                            >
                              Track Order
                            </Link>
                          </Button>
                          <Button asChild variant="outline" className="min-h-11 rounded-2xl">
                            <Link href="/menu">
                              <UtensilsCrossed className="mr-2 h-4 w-4" aria-hidden="true" />
                              Browse Menu
                            </Link>
                          </Button>
                          <Button asChild variant="outline" className="min-h-11 rounded-2xl">
                            <a
                              href={`https://wa.me/92${BRAND.phone.replace(/\D/g, "").replace(/^0/, "")}?text=${encodeURIComponent(`Hi Telepizza, I need help with order ${activeOrder.orderNumber}.`)}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Support
                            </a>
                          </Button>
                        </div>
                      </article>
                    </>
                  ) : (
                    <>
                      <div>
                        <h2 id="hub-overview-heading" className="font-bold text-lg">
                          Ready for your next order?
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1">
                          Browse the menu
                          {needsBasics ? " or finish a quick delivery detail" : ""} — we keep this
                          hub quiet until you have something to track.
                        </p>
                      </div>

                      <Button
                        asChild
                        className="min-h-12 w-full rounded-2xl brand-gradient text-white font-semibold sm:w-auto"
                      >
                        <Link href="/menu">
                          <UtensilsCrossed className="mr-2 h-4 w-4" aria-hidden="true" />
                          Browse the menu
                        </Link>
                      </Button>

                      {hasPastOrders ? (
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            className="min-h-11 rounded-2xl"
                            disabled={catalogLoading || (!lastCompleted && !lastOrder)}
                            onClick={() => {
                              const target = lastCompleted ?? lastOrder;
                              if (target) void openReorderReview(target);
                            }}
                          >
                            <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
                            Reorder last
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            className="min-h-11 rounded-2xl text-brand-red"
                            onClick={() => goTo("orders")}
                          >
                            View orders
                          </Button>
                        </div>
                      ) : null}
                    </>
                  )}
                </section>

                {needsBasics ? (
                  <div className="rounded-2xl border border-border bg-muted/20 px-4 py-4 sm:px-5 sm:py-5 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-brand-charcoal">
                        Complete your account
                      </p>
                      <p className="text-xs font-semibold text-muted-foreground">
                        {profileCompletion.percent}% complete
                      </p>
                    </div>
                    <div
                      className="h-2 overflow-hidden rounded-full bg-muted"
                      role="progressbar"
                      aria-valuenow={profileCompletion.percent}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div
                        className="h-full rounded-full brand-gradient motion-safe:transition-[width]"
                        style={{ width: `${profileCompletion.percent}%` }}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">Remaining:</p>
                    <ul className="space-y-1 text-sm text-brand-charcoal">
                      {profileCompletion.remaining.map((item) => (
                        <li key={item.id}>• {item.id === "phone" ? "Add phone" : item.id === "address" ? "Add delivery address" : item.label}</li>
                      ))}
                    </ul>
                    <div className="grid w-full min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
                      {!effectivePhone ? (
                        <Button
                          type="button"
                          className="min-h-11 w-full rounded-2xl brand-gradient text-white"
                          onClick={() => goTo("profile")}
                        >
                          Add phone
                        </Button>
                      ) : null}
                      {displayedAddresses.length === 0 ? (
                        <Button
                          type="button"
                          variant="outline"
                          className="min-h-11 w-full rounded-2xl"
                          onClick={() => goTo("addresses")}
                        >
                          Add delivery address
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div
                    className="rounded-2xl border border-emerald-200 bg-emerald-50/60 px-4 py-3 text-sm text-emerald-900"
                    role="status"
                  >
                    Your account is ready.
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {!ordersLoading && recentOrdersPreview.length > 0 ? (
                    <HubPreviewPanel
                      id="hub-recent-orders"
                      icon={Package}
                      title="Recent Orders"
                      actionLabel="View all"
                      onAction={() => goTo("orders")}
                    >
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
                    </HubPreviewPanel>
                  ) : null}

                  {defaultAddress ? (
                    <HubPreviewPanel
                      id="hub-saved-addresses"
                      icon={MapPin}
                      title="Saved Addresses"
                      actionLabel="Manage"
                      onAction={() => goTo("addresses")}
                    >
                      <p className="font-bold text-brand-charcoal">
                        {displayedAddresses.length} saved address
                        {displayedAddresses.length === 1 ? "" : "es"}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                        {defaultAddress.isDefault ? "Default · " : ""}
                        {formatSavedAddress(defaultAddress)}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {usingCloudAddresses
                          ? "Synced to your Telepizza account."
                          : "Saved on this device only — not synced to your account yet."}
                      </p>
                    </HubPreviewPanel>
                  ) : null}

                  {selectedBranch?.name ? (
                    <div className="rounded-2xl border border-border/80 bg-muted/10 p-4 space-y-2 sm:col-span-2">
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <Store className="w-4 h-4 text-brand-red" aria-hidden="true" />
                        Preferred branch
                      </div>
                      <p className="font-bold text-brand-charcoal break-words">{selectedBranch.name}</p>
                      <Button
                        asChild
                        type="button"
                        variant="outline"
                        size="sm"
                        className="min-h-11 rounded-2xl"
                      >
                        <Link href="/branches">Change branch</Link>
                      </Button>
                    </div>
                  ) : null}
                </div>

                {activeOrder ? (
                  <HubSupportCard
                    orderNumber={activeOrder.orderNumber}
                    contactPhone={activeOrder.contactPhone}
                  />
                ) : null}
              </div>
            ) : null}

            {section === "account" ? (
              <CustomerAccountMenu
                onLogout={() => {
                  void signOut();
                }}
                extra={
                  <div className="rounded-2xl border border-dashed border-border bg-brand-cream/20 px-4 py-3 text-sm">
                    <p className="font-semibold text-brand-charcoal">Settings</p>
                    <p className="mt-1 text-muted-foreground">
                      Notification and checkout preferences live in Settings.
                    </p>
                    <Button
                      asChild
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-3 min-h-11 rounded-2xl"
                    >
                      <Link href="/settings">
                        <Settings className="mr-2 h-4 w-4" aria-hidden="true" />
                        Open Settings preferences
                      </Link>
                    </Button>
                  </div>
                }
              />
            ) : null}

            {section === "profile" || section === "security" || section === "notifications" ? (
              <nav
                aria-label="Account options"
                className="rounded-2xl border border-border bg-white p-2 shadow-sm"
              >
                <ul className="grid grid-cols-2 gap-1 sm:flex sm:flex-wrap">
                  {(
                    [
                      { id: "profile" as const, label: "Profile", icon: UserRound },
                      { id: "security" as const, label: "Security", icon: Shield },
                      { id: "notifications" as const, label: "Notifications", icon: Bell },
                    ] as const
                  ).map((item) => {
                    const Icon = item.icon;
                    const active = section === item.id;
                    return (
                      <li key={item.id} className="min-w-0">
                        <button
                          type="button"
                          onClick={() => goTo(item.id)}
                          className={`inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2 sm:w-auto sm:justify-start ${
                            active
                              ? "bg-brand-red/10 text-brand-red"
                              : "text-brand-charcoal/80 hover:bg-muted/50"
                          }`}
                          aria-current={active ? "page" : undefined}
                        >
                          <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          <span className="truncate">{item.label}</span>
                        </button>
                      </li>
                    );
                  })}
                  <li className="min-w-0">
                    <Link
                      href="/my-telepizza/favorites"
                      className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-brand-charcoal/80 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2 sm:w-auto sm:justify-start"
                    >
                      <Heart className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span className="truncate">Favorites</span>
                    </Link>
                  </li>
                  <li className="min-w-0 col-span-2 sm:col-span-1">
                    <Link
                      href="/my-telepizza/account"
                      className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-brand-charcoal/80 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2 sm:w-auto sm:justify-start"
                    >
                      Account
                    </Link>
                  </li>
                </ul>
              </nav>
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

                {isProfileSyncDegraded ? (
                  <div
                    className="rounded-2xl border border-border bg-muted/20 px-4 py-4 text-sm space-y-2"
                    role="status"
                    aria-live="polite"
                  >
                    <p className="font-medium text-brand-charcoal">
                      We couldn&apos;t prepare your account details right now. Please try again.
                    </p>
                    <p className="text-muted-foreground leading-relaxed">
                      You are still signed in. Profile edits may be unavailable until we reconnect.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="min-h-11 rounded-2xl"
                      onClick={() => void refreshProfile()}
                    >
                      Try again
                    </Button>
                  </div>
                ) : null}

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
                    {[
                      googleConnected ? "Google" : null,
                      facebookConnected ? "Facebook" : null,
                      emailPasswordAvailable ? "Email/password" : null,
                    ]
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
                    onBlur={() => {
                      if (!phone.trim()) return;
                      const normalized = normalizePakistaniMobileE164(phone);
                      if (normalized.ok) setPhone(normalized.e164);
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
                    {effectivePhone && !profile?.phoneVerified ? (
                      <span className="font-normal text-muted-foreground">
                        — verification coming soon
                      </span>
                    ) : null}
                  </div>
                  {effectivePhone && !profile?.phoneVerified ? (
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
                      {usingCloudAddresses
                        ? "Delivery addresses synced to your Telepizza account."
                        : "Saved on this device only until account sync is available."}
                    </p>
                  </div>
                  {!showAddressForm ? (
                    <Button
                      type="button"
                      className="rounded-2xl brand-gradient text-white font-semibold"
                      onClick={() => {
                        setShowAddressForm(true);
                        setEditingAddressId(null);
                        setAddressRecipientName(fullName || profile?.fullName || "");
                        setAddressPhone(phone || profile?.phone || "");
                        setAddressIsDefault(displayedAddresses.length === 0);
                        setAddressError(null);
                        setAddressNotice(null);
                      }}
                    >
                      {usingCloudAddresses ? "Add address" : "Add address draft"}
                    </Button>
                  ) : null}
                </div>

                {addressesLoading ? (
                  <p className="text-sm text-muted-foreground">Loading addresses…</p>
                ) : null}

                {!addressesLoading && addressesError ? (
                  <CustomerRetryCard
                    title="We couldn't load your saved addresses."
                    description="Your details below are safe. Try loading saved addresses again."
                    onRetry={reloadAddresses}
                    busy={addressesLoading}
                  />
                ) : null}

                {!addressesLoading && !addressesError && !usingCloudAddresses ? (
                  <p className="text-sm text-muted-foreground rounded-2xl border border-border bg-muted/10 px-4 py-3">
                    Addresses on this page are saved on this device only until account sync is
                    available.
                  </p>
                ) : null}

                {showImportDrafts ? (
                  <div className="rounded-2xl border border-border bg-muted/15 p-4 text-sm space-y-2">
                    <p className="font-semibold text-brand-charcoal">
                      Import {deviceDraftCount} device draft{deviceDraftCount === 1 ? "" : "s"}?
                    </p>
                    <p className="text-muted-foreground">
                      One-time import copies browser drafts into your account without duplicates.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="min-h-11 rounded-2xl"
                      onClick={() => void handleImportDeviceDrafts()}
                    >
                      Import drafts
                    </Button>
                  </div>
                ) : null}

                {displayedAddresses.length === 0 && !showAddressForm && !addressesError ? (
                  <CustomerEmptyState
                    icon={MapPin}
                    title={usingCloudAddresses ? "No saved addresses yet." : "No address drafts yet."}
                    description={
                      usingCloudAddresses
                        ? "Add your first delivery address to make checkout faster."
                        : "Add a Multan delivery draft for quicker checkout on this browser."
                    }
                    action={
                      <Button
                        type="button"
                        size="lg"
                        className="rounded-2xl brand-gradient text-white font-semibold px-8 min-h-11"
                        onClick={() => {
                          setShowAddressForm(true);
                          setEditingAddressId(null);
                          setAddressIsDefault(true);
                          setAddressError(null);
                          setAddressNotice(null);
                        }}
                        aria-label={
                          usingCloudAddresses
                            ? "Add your first delivery address"
                            : "Add your first delivery address draft"
                        }
                      >
                        {usingCloudAddresses ? "Add address" : "Add address draft"}
                      </Button>
                    }
                  />
                ) : null}

                <ul className="space-y-3">
                  {displayedAddresses.map((address) => (
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
                        {address.recipientName ? (
                          <p className="text-xs text-muted-foreground mt-1">
                            {address.recipientName}
                            {address.phone ? ` · ${address.phone}` : ""}
                          </p>
                        ) : null}
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
                            onClick={() => void handleSetDefaultAddress(address.id)}
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
                          onClick={() => void handleRemoveAddress(address.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>

                {showAddressForm ? (
                  <form
                    onSubmit={(event) => void handleSaveAddress(event)}
                    className="space-y-3 border-t border-border pt-4"
                    noValidate
                  >
                    <h3 className="font-semibold">
                      {editingAddressId ? "Edit address" : "Add address"}
                    </h3>
                    {usingCloudAddresses ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="addressRecipientName">Recipient name</Label>
                          <Input
                            id="addressRecipientName"
                            value={addressRecipientName}
                            onChange={(e) => setAddressRecipientName(e.target.value)}
                            className="rounded-2xl"
                            autoComplete="name"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="addressPhone">Phone</Label>
                          <Input
                            id="addressPhone"
                            value={addressPhone}
                            onChange={(e) => setAddressPhone(e.target.value)}
                            className="rounded-2xl"
                            inputMode="tel"
                            autoComplete="tel"
                            required
                          />
                        </div>
                      </div>
                    ) : null}
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
                    {usingCloudAddresses ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="addressLine2">Line 2 (optional)</Label>
                          <Input
                            id="addressLine2"
                            value={addressLine2}
                            onChange={(e) => setAddressLine2(e.target.value)}
                            className="rounded-2xl"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="addressLandmark">Landmark (optional)</Label>
                          <Input
                            id="addressLandmark"
                            value={addressLandmark}
                            onChange={(e) => setAddressLandmark(e.target.value)}
                            className="rounded-2xl"
                          />
                        </div>
                      </div>
                    ) : null}
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
                      <Button
                        type="submit"
                        className="rounded-2xl brand-gradient text-white font-semibold"
                        disabled={!addressSaveAvailable}
                      >
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
                        {effectivePhone && !profile?.phoneVerified ? (
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
                      <div className="font-semibold">Facebook</div>
                      <p className="text-muted-foreground mt-0.5">
                        {facebookConnected
                          ? "Connected — you can sign in with Facebook on this account."
                          : "Not connected on this account yet."}
                      </p>
                    </div>
                    <span className="text-xs font-semibold shrink-0">
                      {facebookConnected ? "Connected" : "Not connected"}
                    </span>
                  </li>
                  <li className="rounded-2xl border border-border p-4 flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">Email & password</div>
                      <p className="text-muted-foreground mt-0.5">
                        {emailPasswordAvailable
                          ? "Ready — you can sign in with email and your Telepizza password."
                          : "Not set yet — attach a Telepizza password below (never your Google or Facebook password)."}
                      </p>
                    </div>
                    <span className="text-xs font-semibold shrink-0">
                      {emailPasswordAvailable ? "Ready" : "Not set"}
                    </span>
                  </li>
                  <li className="rounded-2xl border border-dashed border-border p-4 flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">Apple</div>
                      <p className="text-muted-foreground mt-0.5">
                        Sign in with Apple is planned. It is not available yet.
                      </p>
                    </div>
                    <span className="text-xs font-semibold shrink-0 text-muted-foreground">
                      Coming soon
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
                        ? "Attaches a Telepizza password to this same account — never asks for your social-login password and does not create a second login."
                        : "Enter your current Telepizza password to change it. Never enter your Google or Facebook password here."}
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
                            className={`motion-safe:transition-colors motion-reduce:transition-none ${
                              check.met
                                ? "text-emerald-700 font-semibold"
                                : "text-muted-foreground"
                            }`}
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
                        Never enter your social-login password — only the Telepizza password you set for
                        this account.
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Social-only accounts can request an email change while signed in; confirm both
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
                    {usingCloudOrders
                      ? hubOrders.length === 0
                        ? "You have no account orders yet."
                        : hubOrders.length === 1
                          ? "You have 1 order in your account."
                          : `You have ${hubOrders.length} recent account orders.`
                      : !profile?.phone
                        ? "Add a phone number in Profile so we can match your checkout orders on this device."
                        : localOrders.length === 0
                          ? "You have no recent orders on this device yet."
                          : localOrders.length === 1
                            ? "You have 1 recent order on this device."
                            : `You have ${localOrders.length} recent orders on this device.`}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {usingCloudOrders
                      ? "Account order history — also viewable on the full Orders page."
                      : "Real checkout history for this browser/phone only — not a fabricated list."}
                  </p>
                </div>
                {ordersLoading ? (
                  <p className="text-sm text-muted-foreground">Loading orders…</p>
                ) : !usingCloudOrders && !profile?.phone ? (
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
                    {hubOrders.slice(0, 5).map((order) => (
                      <li
                        key={order.id}
                        className="rounded-2xl border border-border bg-gradient-to-br from-white to-brand-cream/20 p-4 space-y-3"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0 space-y-1">
                            <div className="font-semibold text-brand-red">{order.orderNumber}</div>
                            <p className="text-xs text-muted-foreground">
                              {new Date(order.createdAt).toLocaleString()}
                            </p>
                            <dl className="grid gap-0.5 text-sm text-muted-foreground">
                              <div>
                                <dt className="inline font-medium text-brand-charcoal">
                                  Restaurant:{" "}
                                </dt>
                                <dd className="inline">{order.branchName}</dd>
                              </div>
                              {order.deliveryAddress ? (
                                <div>
                                  <dt className="inline font-medium text-brand-charcoal">
                                    Delivery:{" "}
                                  </dt>
                                  <dd className="inline break-words">{order.deliveryAddress}</dd>
                                </div>
                              ) : null}
                              <div>
                                <dt className="inline font-medium text-brand-charcoal">Total: </dt>
                                <dd className="inline font-semibold text-brand-charcoal">
                                  Rs {order.totalAmount.toLocaleString()}
                                </dd>
                              </div>
                            </dl>
                          </div>
                          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold capitalize">
                            {order.status}
                          </span>
                        </div>
                        <OrderStatusTimeline status={order.status} compact />
                        <div className="flex flex-wrap gap-2">
                          <Button asChild size="sm" className="min-h-11 rounded-2xl brand-gradient text-white">
                            <Link
                              href={`/track/${encodeURIComponent(order.orderNumber)}?phone=${encodeURIComponent(order.contactPhone)}`}
                            >
                              Track
                            </Link>
                          </Button>
                          <Button asChild size="sm" variant="outline" className="min-h-11 rounded-2xl">
                            <a
                              href={`https://wa.me/92${BRAND.phone.replace(/\D/g, "").replace(/^0/, "")}?text=${encodeURIComponent(`Hi Telepizza, I need help with order ${order.orderNumber}.`)}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Support
                            </a>
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="min-h-11 rounded-2xl"
                            disabled={catalogLoading}
                            onClick={() => void openReorderReview(order)}
                          >
                            <RotateCcw className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                            Reorder
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
                  <h2 className="font-bold text-lg">Rewards</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Loyalty points and member offers
                  </p>
                </div>
                <CustomerEmptyState
                  icon={Gift}
                  title="Rewards are coming soon."
                  description="We'll share exclusive offers here when Rewards launches. No points balance is shown until then."
                  action={
                    <Button asChild className="min-h-11 rounded-2xl brand-gradient text-white">
                      <Link href="/menu">Browse Menu</Link>
                    </Button>
                  }
                />
              </section>
            ) : null}

            {section === "notifications" ? (
              <section
                className="rounded-3xl border border-border bg-white p-4 shadow-sm sm:p-6 space-y-4"
                aria-labelledby="hub-notifications-section-heading"
              >
                <div>
                  <h2 id="hub-notifications-section-heading" className="font-bold text-lg">
                    Notifications
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Order updates and offers — prefs save on this device for now.
                  </p>
                </div>
                <CustomerEmptyState
                  icon={Bell}
                  title="No notifications yet."
                  description="We'll notify you about orders and exclusive offers."
                  action={
                    <>
                      <Button asChild className="min-h-11 rounded-2xl brand-gradient text-white">
                        <Link href="/settings#prefs">Notification preferences</Link>
                      </Button>
                      <Button asChild variant="outline" className="min-h-11 rounded-2xl">
                        <Link href="/notifications">Open inbox</Link>
                      </Button>
                    </>
                  }
                />
                <div className="rounded-2xl border border-border bg-muted/10 p-4 text-sm space-y-1.5">
                  <p className="font-semibold text-brand-charcoal">Payment preferences</p>
                  <p className="text-muted-foreground leading-relaxed">
                    Checkout supports paying with your order (cash / pay on delivery or pickup).
                    JazzCash, EasyPaisa, and saved cards are <strong>not live</strong> yet.
                  </p>
                </div>
              </section>
            ) : null}

      <ReorderReviewDialog
        open={reorderOpen}
        preview={reorderPreview}
        onOpenChange={(open) => {
          setReorderOpen(open);
          if (!open) setReorderPreview(null);
        }}
        onConfirm={confirmReorder}
      />
    </CustomerShell>
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
        <p className="text-xs text-amber-800 font-semibold mt-1">Coming soon — not available yet</p>
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
