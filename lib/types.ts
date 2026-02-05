export interface Store {
  id: string;
  name: string;
  color: string;
}

export interface Price {
  storeId: string;
  price: number | null;
}

export interface Allocation {
  id: string;
  storeId: string;
  storeName: string;
  storeColor: string;
  quantity: number;
}

export interface CardItem {
  id: string;
  name: string;
  quantity: number;
  prices: Price[];
  allocations: Allocation[];
}

export interface OptimalPurchasePlan {
  storeId: string;
  cardIds: string[];
}

export interface OptimalPurchase {
  plans: OptimalPurchasePlan[];
  totalPrice: number;
}
