export type Shop = {
  id: string;
  name: string;
  slug: string;
  currency: string;
  timezone: string;
  storeAddress: string | null;
  targetProfitMargin: string;
  hourlyLaborCost: string;
  /** Default delivery fee for new orders; zero is valid. */
  deliveryBaseFee: string;
  /** Legacy stored value, no longer edited in shop settings. */
  deliveryRatePerKm: string;
  createdAt: string;
  updatedAt: string;
};

export type ShopMembership = {
  shopId: string;
  role: 'owner' | 'admin' | 'member';
  shops: Shop;
};
