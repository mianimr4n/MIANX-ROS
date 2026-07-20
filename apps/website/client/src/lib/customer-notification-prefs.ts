/** Device-local notification preference toggles (CP-7).
 * Live SMTP / push email delivery is deferred — prefs persist on this browser only.
 */

export type NotificationPreferenceKey =
  | "orderUpdates"
  | "promotions"
  | "deliveryAlerts"
  | "specialOffers";

export type NotificationPreferences = Record<NotificationPreferenceKey, boolean>;

const STORAGE_PREFIX = "telepizza.customer.notification-prefs.";

const DEFAULT_PREFS: NotificationPreferences = {
  orderUpdates: true,
  promotions: false,
  deliveryAlerts: true,
  specialOffers: false,
};

function storageKey(ownerKey: string): string {
  return `${STORAGE_PREFIX}${ownerKey.trim().toLowerCase()}`;
}

export function loadNotificationPreferences(ownerKey: string): NotificationPreferences {
  if (!ownerKey.trim()) return { ...DEFAULT_PREFS };
  try {
    const raw = localStorage.getItem(storageKey(ownerKey));
    if (!raw) return { ...DEFAULT_PREFS };
    const parsed = JSON.parse(raw) as Partial<NotificationPreferences>;
    return { ...DEFAULT_PREFS, ...parsed };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function saveNotificationPreferences(
  ownerKey: string,
  prefs: NotificationPreferences,
): void {
  if (!ownerKey.trim()) return;
  localStorage.setItem(storageKey(ownerKey), JSON.stringify(prefs));
}

export function updateNotificationPreference(
  ownerKey: string,
  key: NotificationPreferenceKey,
  enabled: boolean,
): NotificationPreferences {
  const next = { ...loadNotificationPreferences(ownerKey), [key]: enabled };
  saveNotificationPreferences(ownerKey, next);
  return next;
}

export const NOTIFICATION_PREFS_LABELS: Record<
  NotificationPreferenceKey,
  { label: string; description: string }
> = {
  orderUpdates: {
    label: "Order updates",
    description: "Status changes from kitchen to delivery",
  },
  promotions: {
    label: "Promotions",
    description: "Seasonal deals and limited-time offers",
  },
  deliveryAlerts: {
    label: "Delivery alerts",
    description: "Rider and arrival updates for your order",
  },
  specialOffers: {
    label: "Special offers",
    description: "Member-only discounts when Rewards launches",
  },
};
