/**
 * Purchase Management API Client
 * Provides type-safe API calls for purchase management features
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

// Types
export interface Store {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface PurchaseList {
  id: string;
  user_id: string;
  deck_id: string | null;
  name: string | null;
  status: 'planning' | 'purchased';
  created_at: string;
  updated_at: string;
}

export interface PurchaseItem {
  id: string;
  list_id: string;
  card_id: string | null;
  custom_card_id: string | null;
  quantity: number;
  selected_store_id: string | null;
  created_at: string;
}

export interface PurchaseItemWithCard extends PurchaseItem {
  card_name: string | null;
  card_color: string | null;
  card_image_path: string | null;
}

export interface PriceEntry {
  id: string;
  item_id: string;
  store_id: string;
  price: number | null;
  updated_at: string;
}

export interface OptimalPurchasePlan {
  total_price: number;
  items: Array<{
    item_id: string;
    card_name: string;
    quantity: number;
    selected_store: string | null;
    selected_store_id: string | null;
    unit_price: number | null;
    subtotal: number | null;
    status: 'available' | 'out_of_stock';
  }>;
  store_summary: Record<string, number>;
}

// Helper function to get auth token
async function getAuthToken(): Promise<string | null> {
  // NextAuth session token will be automatically sent via cookies
  return null;
}

// Helper function for API calls
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = await getAuthToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Include cookies for NextAuth
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `API call failed: ${response.statusText}`);
  }

  return response.json();
}

// Store API
export const storesApi = {
  list: () => apiCall<Store[]>('/stores'),

  create: (data: { name: string; color: string }) =>
    apiCall<Store>('/stores', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (storeId: string, data: { name?: string; color?: string }) =>
    apiCall<Store>(`/stores/${storeId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (storeId: string) =>
    apiCall<void>(`/stores/${storeId}`, {
      method: 'DELETE',
    }),
};

// Purchase List API
export const purchaseListsApi = {
  list: () => apiCall<PurchaseList[]>('/purchases'),

  get: (listId: string) => apiCall<PurchaseList>(`/purchases/${listId}`),

  create: (data: {
    deck_id?: string | null;
    name?: string | null;
    status?: 'planning' | 'purchased';
  }) =>
    apiCall<PurchaseList>('/purchases', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (listId: string, data: {
    deck_id?: string | null;
    name?: string | null;
    status?: 'planning' | 'purchased';
  }) =>
    apiCall<PurchaseList>(`/purchases/${listId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (listId: string) =>
    apiCall<void>(`/purchases/${listId}`, {
      method: 'DELETE',
    }),
};

// Purchase Item API
export const purchaseItemsApi = {
  list: (listId: string) =>
    apiCall<PurchaseItemWithCard[]>(`/purchases/${listId}/items`),

  create: (listId: string, data: {
    card_id?: string | null;
    custom_card_id?: string | null;
    quantity: number;
    selected_store_id?: string | null;
  }) =>
    apiCall<PurchaseItem>(`/purchases/${listId}/items`, {
      method: 'POST',
      body: JSON.stringify({ ...data, list_id: listId }),
    }),

  update: (listId: string, itemId: string, data: {
    quantity?: number;
    selected_store_id?: string | null;
  }) =>
    apiCall<PurchaseItem>(`/purchases/${listId}/items/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (listId: string, itemId: string) =>
    apiCall<void>(`/purchases/${listId}/items/${itemId}`, {
      method: 'DELETE',
    }),
};

// Price API
export const pricesApi = {
  list: (itemId: string) =>
    apiCall<PriceEntry[]>(`/purchases/items/${itemId}/prices`),

  update: (itemId: string, storeId: string, data: { price: number | null }) =>
    apiCall<PriceEntry>(`/purchases/items/${itemId}/prices/${storeId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (itemId: string, storeId: string) =>
    apiCall<void>(`/purchases/items/${itemId}/prices/${storeId}`, {
      method: 'DELETE',
    }),
};

// Optimal Plan API
export const optimalPlanApi = {
  calculate: (listId: string) =>
    apiCall<OptimalPurchasePlan>(`/purchases/${listId}/optimal-plan`),
};
