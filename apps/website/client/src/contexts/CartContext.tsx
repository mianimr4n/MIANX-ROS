import { createContext, useContext, useReducer, type ReactNode } from "react";
import { toast } from "sonner";
import { getLineItemTotal } from "@/data/cart-config";

export interface CartExtra {
  label: string;
  price: number;
  /** Catalog / modifier option code for server re-pricing */
  slug?: string;
  groupCode?: string;
  optionCode?: string;
}

export interface CartItem {
  id: string;
  menuSlug: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
  variant?: string;
  image?: string;
  description?: string;
  extras?: CartExtra[];
  instructions?: string;
}

export type DeliveryMode = "pickup" | "delivery";

export interface OrderDetails {
  deliveryMode: DeliveryMode;
  deliveryAddress: string;
  orderInstructions: string;
  couponCode: string;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  order: OrderDetails;
}

type CartAction =
  | { type: "ADD_ITEM"; payload: Omit<CartItem, "quantity"> & { quantity?: number } }
  | { type: "REMOVE_ITEM"; payload: string }
  | { type: "UPDATE_QUANTITY"; payload: { id: string; quantity: number } }
  | { type: "CLEAR_CART" }
  | { type: "TOGGLE_CART" }
  | { type: "SET_ORDER"; payload: Partial<OrderDetails> };

const defaultOrder: OrderDetails = {
  deliveryMode: "delivery",
  deliveryAddress: "",
  orderInstructions: "",
  couponCode: "",
};

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "ADD_ITEM": {
      const existing = state.items.find((item) => item.id === action.payload.id);
      if (existing) {
        return {
          ...state,
          items: state.items.map((item) =>
            item.id === action.payload.id
              ? { ...item, quantity: item.quantity + (action.payload.quantity || 1) }
              : item,
          ),
          isOpen: true,
        };
      }
      return {
        ...state,
        items: [...state.items, { ...action.payload, quantity: action.payload.quantity || 1 }],
        isOpen: true,
      };
    }
    case "REMOVE_ITEM":
      return { ...state, items: state.items.filter((item) => item.id !== action.payload) };
    case "UPDATE_QUANTITY": {
      if (action.payload.quantity <= 0) {
        return { ...state, items: state.items.filter((item) => item.id !== action.payload.id) };
      }
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.payload.id ? { ...item, quantity: action.payload.quantity } : item,
        ),
      };
    }
    case "CLEAR_CART":
      return { ...state, items: [], order: defaultOrder };
    case "TOGGLE_CART":
      return { ...state, isOpen: !state.isOpen };
    case "SET_ORDER":
      return { ...state, order: { ...state.order, ...action.payload } };
    default:
      return state;
  }
}

interface CartContextType {
  state: CartState;
  addItem: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  toggleCart: () => void;
  setOrderDetails: (details: Partial<OrderDetails>) => void;
  totalItems: number;
  subtotal: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | null>(null);

function calculateSubtotal(items: CartItem[]): number {
  return items.reduce(
    (sum, item) => sum + getLineItemTotal(item.price, item.extras, item.quantity),
    0,
  );
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, {
    items: [],
    isOpen: false,
    order: defaultOrder,
  });

  const addItem = (item: Omit<CartItem, "quantity"> & { quantity?: number }) => {
    dispatch({ type: "ADD_ITEM", payload: item });
    toast.success(`${item.name} added to cart!`);
  };

  const removeItem = (id: string) => dispatch({ type: "REMOVE_ITEM", payload: id });
  const updateQuantity = (id: string, quantity: number) =>
    dispatch({ type: "UPDATE_QUANTITY", payload: { id, quantity } });
  const clearCart = () => dispatch({ type: "CLEAR_CART" });
  const toggleCart = () => dispatch({ type: "TOGGLE_CART" });
  const setOrderDetails = (details: Partial<OrderDetails>) =>
    dispatch({ type: "SET_ORDER", payload: details });

  const totalItems = state.items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = calculateSubtotal(state.items);
  const totalPrice = subtotal;

  return (
    <CartContext.Provider
      value={{
        state,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        toggleCart,
        setOrderDetails,
        totalItems,
        subtotal,
        totalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider");
  return context;
}
