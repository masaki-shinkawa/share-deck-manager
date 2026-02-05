/**
 * Purchase Management API Client
 * Provides type-safe API calls for purchase management features
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// Types
export interface Store {
  id: string;
  userId: string;
  name: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseList {
  id: string;
  userId: string;
  name: string | null;
  status: 'planning' | 'purchased';
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseItem {
  id: string;
  listId: string;
  cardId: string | null;
  customCardId: string | null;
  quantity: number;
  createdAt: string;
}

export interface AllocationInfo {
  id: string;
  storeId: string;
  storeName: string;
  storeColor: string;
  quantity: number;
}

export interface PurchaseItemWithCard extends PurchaseItem {
  cardName: string | null;
  cardColor: string | null;
  cardImagePath: string | null;
  priceEntries?: PriceEntry[];
  allocations: AllocationInfo[];
}

export interface PriceEntry {
  id: string;
  itemId: string;
  storeId: string;
  price: number | null;
  updatedAt: string;
}

export interface OptimalPurchasePlan {
  totalPrice: number;
  items: Array<{
    itemId: string;
    cardName: string;
    quantity: number;
    selectedStore: string | null;
    selectedStoreId: string | null;
    unitPrice: number | null;
    subtotal: number | null;
    status: 'available' | 'out_of_stock';
  }>;
  storeSummary: Record<string, number>;
}

// Helper function for API calls
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
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

  // Handle 204 No Content responses
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// Store API
export const storesApi = {
  list: (token?: string) => apiCall<Store[]>('/api/v1/stores', {}, token),

  create: (data: { name: string; color: string }, token?: string) =>
    apiCall<Store>('/api/v1/stores', {
      method: 'POST',
      body: JSON.stringify(data),
    }, token),

  update: (storeId: string, data: { name?: string; color?: string }, token?: string) =>
    apiCall<Store>(`/api/v1/stores/${storeId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }, token),

  delete: (storeId: string, token?: string) =>
    apiCall<void>(`/api/v1/stores/${storeId}`, {
      method: 'DELETE',
    }, token),
};

// Purchase List API
export const purchaseListsApi = {
  /**
   * List all purchase lists for the current user
   * @param token - Authentication token
   */
  list: (token: string) =>
    apiCall<PurchaseList[]>('/api/v1/purchases', {}, token),

  get: (listId: string, token?: string) =>
    apiCall<PurchaseList>(`/api/v1/purchases/${listId}`, {}, token),

  create: (data: {
    name?: string | null;
    status?: 'planning' | 'purchased';
  }, token?: string) =>
    apiCall<PurchaseList>('/api/v1/purchases', {
      method: 'POST',
      body: JSON.stringify(data),
    }, token),

  update: (listId: string, data: {
    name?: string | null;
    status?: 'planning' | 'purchased';
  }, token?: string) =>
    apiCall<PurchaseList>(`/api/v1/purchases/${listId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }, token),

  delete: (listId: string, token?: string) =>
    apiCall<void>(`/api/v1/purchases/${listId}`, {
      method: 'DELETE',
    }, token),
};

// Purchase Item API
export const purchaseItemsApi = {
  list: (listId: string, token?: string) =>
    apiCall<PurchaseItemWithCard[]>(`/api/v1/purchases/${listId}/items`, {}, token),

  create: (listId: string, data: {
    cardId?: string | null;
    customCardId?: string | null;
    quantity: number;
  }, token?: string) =>
    apiCall<PurchaseItem>(`/api/v1/purchases/${listId}/items`, {
      method: 'POST',
      body: JSON.stringify(data),
    }, token),

  update: (listId: string, itemId: string, data: {
    quantity?: number;
  }, token?: string) =>
    apiCall<PurchaseItem>(`/api/v1/purchases/${listId}/items/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }, token),

  delete: (listId: string, itemId: string, token?: string) =>
    apiCall<void>(`/api/v1/purchases/${listId}/items/${itemId}`, {
      method: 'DELETE',
    }, token),
};

// Allocation API
export const allocationsApi = {
  list: (itemId: string, token?: string) =>
    apiCall<AllocationInfo[]>(`/api/v1/purchases/items/${itemId}/allocations`, {}, token),

  create: (itemId: string, data: { storeId: string; quantity: number }, token?: string) =>
    apiCall<AllocationInfo>(`/api/v1/purchases/items/${itemId}/allocations`, {
      method: 'POST',
      body: JSON.stringify(data),
    }, token),

  update: (allocationId: string, data: { quantity: number }, token?: string) =>
    apiCall<AllocationInfo>(`/api/v1/purchases/allocations/${allocationId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }, token),

  delete: (allocationId: string, token?: string) =>
    apiCall<void>(`/api/v1/purchases/allocations/${allocationId}`, {
      method: 'DELETE',
    }, token),
};

// Price API
export const pricesApi = {
  list: (itemId: string, token?: string) =>
    apiCall<PriceEntry[]>(`/api/v1/purchases/items/${itemId}/prices`, {}, token),

  update: (itemId: string, storeId: string, data: { price: number | null }, token?: string) =>
    apiCall<PriceEntry>(`/api/v1/purchases/items/${itemId}/prices/${storeId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, token),

  delete: (itemId: string, storeId: string, token?: string) =>
    apiCall<void>(`/api/v1/purchases/items/${itemId}/prices/${storeId}`, {
      method: 'DELETE',
    }, token),
};

// Optimal Plan API
export const optimalPlanApi = {
  calculate: (listId: string, token?: string) =>
    apiCall<OptimalPurchasePlan>(`/api/v1/purchases/${listId}/optimal-plan`, {}, token),
};
