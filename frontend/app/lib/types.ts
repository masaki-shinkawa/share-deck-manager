export interface Store {
  id: string;
  name: string;
  color: string;
}

export interface Price {
  storeId: string;
  price: number | null;
}

export interface CardItem {
  id: string;
  name: string;
  quantity: number;
  prices: Price[];
  purchaseStoreId: string | null;
}

export interface OptimalPurchasePlan {
  storeId: string;
  cardIds: string[];
}

export interface OptimalPurchase {
  plans: OptimalPurchasePlan[];
  totalPrice: number;
}
