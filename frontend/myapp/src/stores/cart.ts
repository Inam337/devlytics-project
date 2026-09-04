import { create } from 'zustand';

import type { Cart } from '@/models';
import { addToCart, clearCart, getCart } from '@/services/cart';
import { removeCartItem, updateCartItem } from '@/services/cart-items';

function countCartItems(cart: Cart | null): number {
  if (!cart?.items?.length) {
    return 0;
  }

  return cart.items.reduce((sum, item) => sum + item.quantity, 0);
}

interface CartState {
  cart: Cart | null;
  itemCount: number;
  isLoading: boolean;
  error: string | null;
  fetchCart: () => Promise<void>;
  addProduct: (productId: number, quantity: number) => Promise<boolean>;
  updateQuantity: (cartItemId: number, quantity: number) => Promise<boolean>;
  removeLine: (cartItemId: number) => Promise<boolean>;
  clear: () => Promise<boolean>;
  reset: () => void;
}

const initialState = {
  cart: null,
  itemCount: 0,
  isLoading: false,
  error: null,
};

export const useCartStore = create<CartState>((set, get) => ({
  ...initialState,
  fetchCart: async () => {
    set({ isLoading: true, error: null });

    const result = await getCart();

    if (!result.ok) {
      set({ isLoading: false, error: result.error.message });

      return;
    }

    set({
      cart: result.data,
      itemCount: countCartItems(result.data),
      isLoading: false,
    });
  },
  addProduct: async (productId, quantity) => {
    set({ isLoading: true, error: null });

    const result = await addToCart({ productId, quantity });

    if (!result.ok) {
      set({ isLoading: false, error: result.error.message });

      return false;
    }

    set({
      cart: result.data,
      itemCount: countCartItems(result.data),
      isLoading: false,
    });

    return true;
  },
  updateQuantity: async (cartItemId, quantity) => {
    set({ isLoading: true, error: null });

    const result = await updateCartItem(cartItemId, { quantity });

    if (!result.ok) {
      set({ isLoading: false, error: result.error.message });

      return false;
    }

    await get().fetchCart();

    return true;
  },
  removeLine: async (cartItemId) => {
    set({ isLoading: true, error: null });

    const result = await removeCartItem(cartItemId);

    if (!result.ok) {
      set({ isLoading: false, error: result.error.message });

      return false;
    }

    await get().fetchCart();

    return true;
  },
  clear: async () => {
    set({ isLoading: true, error: null });

    const result = await clearCart();

    if (!result.ok) {
      set({ isLoading: false, error: result.error.message });

      return false;
    }

    set({
      cart: result.data,
      itemCount: 0,
      isLoading: false,
    });

    return true;
  },
  reset: () => set(initialState),
}));
