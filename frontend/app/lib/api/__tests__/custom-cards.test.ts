/**
 * Custom Cards API Tests
 * Tests for custom card API client functions
 */

import { customCardsApi, CustomCardCreate } from '../custom-cards';

// Mock fetch globally
global.fetch = jest.fn();

describe('customCardsApi', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    // Reset environment variable (without /api/v1, matches .env.local)
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8000';
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('create', () => {
    const mockToken = 'mock-jwt-token';
    const mockCardData: CustomCardCreate = {
      name: 'Test Card',
      color1: 'Red',
      color2: 'Blue',
    };

    const mockResponse: any = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      user_id: 'user-123',
      name: 'Test Card',
      color1: 'Red',
      color2: 'Blue',
      created_at: '2026-01-31T00:00:00Z',
      updated_at: '2026-01-31T00:00:00Z',
    };

    it('should construct correct API URL without duplicating /api/v1', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      // Act
      await customCardsApi.create(mockCardData, mockToken);

      // Assert - verify the URL does NOT contain /api/v1/api/v1
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/custom-cards/',
        expect.any(Object)
      );

      // Verify it was NOT called with duplicate path
      expect(global.fetch).not.toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/api/v1/custom-cards/',
        expect.any(Object)
      );
    });

    it('should include Bearer token in Authorization header', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      // Act
      await customCardsApi.create(mockCardData, mockToken);

      // Assert
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': `Bearer ${mockToken}`,
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should use POST method with correct body', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      // Act
      await customCardsApi.create(mockCardData, mockToken);

      // Assert
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(mockCardData),
          credentials: 'include',
        })
      );
    });

    it('should return created custom card on success', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      // Act
      const result = await customCardsApi.create(mockCardData, mockToken);

      // Assert
      expect(result).toEqual(mockResponse);
    });

    it('should throw error when API returns 404', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ detail: 'Not Found' }),
      });

      // Act & Assert
      await expect(
        customCardsApi.create(mockCardData, mockToken)
      ).rejects.toThrow('Not Found');
    });

    it('should throw error when API returns 400', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ detail: 'Invalid card data' }),
      });

      // Act & Assert
      await expect(
        customCardsApi.create(mockCardData, mockToken)
      ).rejects.toThrow('Invalid card data');
    });

    it('should handle network errors gracefully', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network error')
      );

      // Act & Assert
      await expect(
        customCardsApi.create(mockCardData, mockToken)
      ).rejects.toThrow('Network error');
    });
  });
});
