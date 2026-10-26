import { useSyncExternalStore } from 'react';

/**
 * Lightweight browser-side cart and favourites for the book shop.
 * Items live in localStorage so the badge survives page navigation.
 */
export type CartItem = {
   id: number;
   title: string;
   thumbnail: string | null;
   price: number;
   href: string;
};

const CART_KEY = 'ubilearn_cart';
const FAVORITES_KEY = 'ubilearn_favorite_books';
const WANT_KEY = 'ubilearn_want_to_read';

const empty: never[] = [];
const listeners = new Set<() => void>();
const caches: Record<string, { raw: string | null; value: unknown }> = {};

function read<T>(key: string): T[] {
   if (typeof window === 'undefined') {
      return empty;
   }

   try {
      const raw = window.localStorage.getItem(key);
      const cached = caches[key];

      if (cached && cached.raw === raw) {
         return cached.value as T[];
      }

      const parsed = raw ? JSON.parse(raw) : [];
      const value = Array.isArray(parsed) ? (parsed as T[]) : [];
      caches[key] = { raw, value };

      return value;
   } catch {
      return empty;
   }
}

function write<T>(key: string, value: T[]): void {
   try {
      window.localStorage.setItem(key, JSON.stringify(value));
   } catch {
      // Storage may be unavailable (private mode); keep the in-memory state.
      caches[key] = { raw: JSON.stringify(value), value };
   }

   listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
   listeners.add(listener);

   const onStorage = (event: StorageEvent) => {
      if (
         event.key === CART_KEY ||
         event.key === FAVORITES_KEY ||
         event.key === WANT_KEY
      ) {
         listener();
      }
   };
   window.addEventListener('storage', onStorage);

   return () => {
      listeners.delete(listener);
      window.removeEventListener('storage', onStorage);
   };
}

export function useCart() {
   const items = useSyncExternalStore(
      subscribe,
      () => read<CartItem>(CART_KEY),
      () => empty as CartItem[],
   );

   return {
      items,
      count: items.length,
      total: items.reduce((sum, item) => sum + (Number(item.price) || 0), 0),
      has: (id: number) => items.some((item) => item.id === id),
   };
}

/** Returns false when the book was already in the cart. */
export function addToCart(item: CartItem): boolean {
   const items = read<CartItem>(CART_KEY);

   if (items.some((existing) => existing.id === item.id)) {
      return false;
   }

   write(CART_KEY, [...items, item]);

   return true;
}

export function removeFromCart(id: number): void {
   write(
      CART_KEY,
      read<CartItem>(CART_KEY).filter((item) => item.id !== id),
   );
}

export function clearCart(): void {
   write(CART_KEY, []);
}

export function useFavoriteBooks() {
   const ids = useSyncExternalStore(
      subscribe,
      () => read<number>(FAVORITES_KEY),
      () => empty as number[],
   );

   return ids;
}

export function toggleFavoriteBook(id: number): boolean {
   const ids = read<number>(FAVORITES_KEY);
   const next = ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id];
   write(FAVORITES_KEY, next);

   return next.includes(id);
}

export function useWantToRead() {
   return useSyncExternalStore(
      subscribe,
      () => read<number>(WANT_KEY),
      () => empty as number[],
   );
}

export function toggleWantToRead(id: number): boolean {
   const ids = read<number>(WANT_KEY);
   const next = ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id];
   write(WANT_KEY, next);

   return next.includes(id);
}
