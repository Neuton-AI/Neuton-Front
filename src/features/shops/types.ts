export type Shop = {
  id: string;
  name: string;
  slug: string;
  currency: string;
  timezone: string;
  storeAddress: string | null;
  targetProfitMargin: string;
  hourlyLaborCost: string;
  deliveryBaseFee: string;
  deliveryRatePerKm: string;
  createdAt: string;
  updatedAt: string;
};

export type ShopMembership = {
  shopId: string;
  role: 'owner' | 'admin' | 'member';
  shops: Shop;
};
