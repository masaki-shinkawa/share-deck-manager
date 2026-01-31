const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export interface CustomCard {
  id: string;
  user_id: string;
  name: string;
  color1: string;
  color2: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomCardCreate {
  name: string;
  color1: string;
  color2?: string | null;
}

export const customCardsApi = {
  /**
   * Create a new custom card
   */
  create: async (data: CustomCardCreate, token: string): Promise<CustomCard> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}/custom-cards/`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to create custom card' }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
  },
};
