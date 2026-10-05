/**
 * FUTURE INTERFACE ONLY — there are no purchases in this prototype. If cosmetic purchases are
 * ever added (via RevenueCat), they must never be chance-based (no loot boxes), never sell
 * gameplay boosters behind pressure prompts, and never involve real-money contests or prizes.
 */
export interface PurchaseProduct {
  id: string;
  title: string;
  /** Localized price string supplied by the store. */
  price: string;
  kind: 'cosmetic';
}

export interface PurchaseService {
  readonly available: boolean;
  listProducts(): Promise<PurchaseProduct[]>;
  restorePurchases(): Promise<void>;
}

export const purchases: PurchaseService = {
  available: false,
  listProducts: async () => [],
  restorePurchases: async () => undefined,
};
