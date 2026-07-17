export interface StoredUser {
  id: string;
  name: string;
  phone: string;
  email?: string;
  createdAt: string;
}

export interface OrderLineExtra {
  label: string;
  price: number;
}

export interface StoredOrderItem {
  menuItemSlug?: string;
  productName: string;
  variantName?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  instructions?: string;
  extras?: OrderLineExtra[];
}

export interface StoredOrder {
  id: string;
  orderNumber: string;
  status: string;
  orderType: "delivery" | "pickup" | "dine-in";
  branchCode: string;
  branchName: string;
  contactName: string;
  contactPhone: string;
  deliveryAddress?: string;
  notes?: string;
  couponCode?: string;
  subtotal: number;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  source: "api" | "local";
  items: StoredOrderItem[];
}

export interface CreateWebsiteOrderPayload {
  branchCode: string;
  branchName: string;
  orderType: "delivery" | "pickup";
  contactName: string;
  contactPhone: string;
  deliveryAddress?: string;
  notes?: string;
  couponCode?: string;
  items: Array<{
    menuItemSlug: string;
    variantLabel?: string;
    quantity: number;
    unitPrice: number;
    productName: string;
    variantName?: string;
    instructions?: string;
    extras?: OrderLineExtra[];
  }>;
}

export interface CreatedOrderResult {
  orderNumber: string;
  status: string;
  subtotal: number;
  totalAmount: number;
  createdAt: string;
  source: "api" | "local";
}

const ORDERS_KEY = "telepizza.orders";
const AUTH_KEY = "telepizza.auth.user";

function readOrders(): StoredOrder[] {
  try {
    const raw = localStorage.getItem(ORDERS_KEY);
    return raw ? (JSON.parse(raw) as StoredOrder[]) : [];
  } catch {
    return [];
  }
}

function writeOrders(orders: StoredOrder[]) {
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
}

export function generateLocalOrderNumber() {
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `LOC-${Date.now().toString(36).toUpperCase()}-${suffix}`;
}

export function saveLocalOrder(
  payload: CreateWebsiteOrderPayload,
  overrides?: Partial<Pick<CreatedOrderResult, "orderNumber" | "status" | "source">>,
): CreatedOrderResult {
  const now = new Date().toISOString();
  const orderNumber = overrides?.orderNumber ?? generateLocalOrderNumber();

  const items: StoredOrderItem[] = payload.items.map((item) => {
    const extrasTotal = (item.extras ?? []).reduce((sum, extra) => sum + extra.price, 0);
    const lineUnit = item.unitPrice + extrasTotal;
    return {
      menuItemSlug: item.menuItemSlug,
      productName: item.productName,
      variantName: item.variantName,
      quantity: item.quantity,
      unitPrice: lineUnit,
      totalPrice: lineUnit * item.quantity,
      instructions: item.instructions,
      extras: item.extras,
    };
  });

  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);

  const order: StoredOrder = {
    id: crypto.randomUUID(),
    orderNumber,
    status: overrides?.status ?? "pending",
    orderType: payload.orderType,
    branchCode: payload.branchCode,
    branchName: payload.branchName,
    contactName: payload.contactName,
    contactPhone: payload.contactPhone,
    deliveryAddress: payload.deliveryAddress,
    notes: payload.notes,
    couponCode: payload.couponCode,
    subtotal,
    totalAmount: subtotal,
    createdAt: now,
    updatedAt: now,
    source: overrides?.source ?? "local",
    items,
  };

  writeOrders([order, ...readOrders()]);

  return {
    orderNumber: order.orderNumber,
    status: order.status,
    subtotal: order.subtotal,
    totalAmount: order.totalAmount,
    createdAt: order.createdAt,
    source: order.source,
  };
}

export function listLocalOrders(phone?: string): StoredOrder[] {
  const orders = readOrders();
  if (!phone) return orders;
  const normalized = phone.replace(/\D/g, "");
  return orders.filter((order) => order.contactPhone.replace(/\D/g, "") === normalized);
}

export function getLocalOrder(orderNumber: string, phone: string): StoredOrder | null {
  const normalized = phone.replace(/\D/g, "");
  return (
    readOrders().find(
      (order) =>
        order.orderNumber === orderNumber &&
        order.contactPhone.replace(/\D/g, "") === normalized,
    ) ?? null
  );
}

/**
 * @deprecated Preview localStorage identity. Sprint 3 uses Supabase Auth.
 * Kept only to clear leftover keys on logout and for emergency tooling.
 */
export function loadStoredUser(): StoredUser | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? (JSON.parse(raw) as StoredUser) : null;
  } catch {
    return null;
  }
}

export function saveStoredUser(user: StoredUser) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
}

/** Clears legacy preview identity only — does not clear cart/orders keys. */
export function clearStoredUser() {
  localStorage.removeItem(AUTH_KEY);
}

/** @deprecated Use Supabase Auth signUp via AuthContext. */
export function registerStoredUser(input: {
  name: string;
  phone: string;
  email?: string;
}): StoredUser {
  const user: StoredUser = {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    phone: input.phone.trim(),
    email: input.email?.trim() || undefined,
    createdAt: new Date().toISOString(),
  };
  saveStoredUser(user);
  return user;
}

/** @deprecated Use Supabase Auth signIn via AuthContext. */
export function loginStoredUser(phone: string): StoredUser | null {
  const user = loadStoredUser();
  if (!user) return null;
  if (user.phone.replace(/\D/g, "") !== phone.replace(/\D/g, "")) return null;
  return user;
}

export const LOYALTY_POINTS_KEY = "telepizza.loyalty.points";

export function getLoyaltyPoints(phone: string): number {
  try {
    const raw = localStorage.getItem(LOYALTY_POINTS_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, number>) : {};
    return map[phone.replace(/\D/g, "")] ?? 0;
  } catch {
    return 0;
  }
}

export function addLoyaltyPoints(phone: string, points: number) {
  const key = phone.replace(/\D/g, "");
  const raw = localStorage.getItem(LOYALTY_POINTS_KEY);
  const map = raw ? (JSON.parse(raw) as Record<string, number>) : {};
  map[key] = (map[key] ?? 0) + points;
  localStorage.setItem(LOYALTY_POINTS_KEY, JSON.stringify(map));
}

export interface StoredNotification {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
}

const NOTIFICATIONS_KEY = "telepizza.notifications";

export function listNotifications(phone: string): StoredNotification[] {
  try {
    const raw = localStorage.getItem(`${NOTIFICATIONS_KEY}.${phone.replace(/\D/g, "")}`);
    return raw ? (JSON.parse(raw) as StoredNotification[]) : [];
  } catch {
    return [];
  }
}

export function pushNotification(phone: string, title: string, body: string) {
  const key = `${NOTIFICATIONS_KEY}.${phone.replace(/\D/g, "")}`;
  const current = listNotifications(phone);
  const next: StoredNotification[] = [
    {
      id: crypto.randomUUID(),
      title,
      body,
      createdAt: new Date().toISOString(),
      read: false,
    },
    ...current,
  ];
  localStorage.setItem(key, JSON.stringify(next.slice(0, 20)));
}

export function markNotificationsRead(phone: string) {
  const key = `${NOTIFICATIONS_KEY}.${phone.replace(/\D/g, "")}`;
  const next = listNotifications(phone).map((entry) => ({ ...entry, read: true }));
  localStorage.setItem(key, JSON.stringify(next));
}
