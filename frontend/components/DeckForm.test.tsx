/**
 * Tests for DeckForm component - Leader Card Search
 *
 * This test verifies that the leader card selection dialog has search functionality.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DeckForm from './DeckForm';

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

// Mock fetch
global.fetch = jest.fn();

describe('DeckForm - Leader Card Search', () => {
  const mockIdToken = 'mock-token';
  const mockOnDeckCreated = jest.fn();

  const mockCards = [
    {
      id: '1',
      card_id: 'OP01-001',
      name: 'モンキー・D・ルフィ',
      color: '赤',
      image_path: 'https://example.com/luffy.jpg',
    },
    {
      id: '2',
      card_id: 'OP01-002',
      name: 'ロロノア・ゾロ',
      color: '緑',
      image_path: 'https://example.com/zoro.jpg',
    },
    {
      id: '3',
      card_id: 'OP01-003',
      name: 'ナミ',
      color: '赤',
      image_path: 'https://example.com/nami.jpg',
    },
    {
      id: '4',
      card_id: 'OP01-004',
      name: 'ウソップ',
      color: '黄',
      image_path: 'https://example.com/usopp.jpg',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockCards,
    });
  });

  describe('Phase 1: Name Search', () => {
    it('should display search input in the dialog', async () => {
      render(<DeckForm idToken={mockIdToken} onDeckCreated={mockOnDeckCreated} />);

      // Open dialog
      const newDeckButton = screen.getByText('New Deck');
      fireEvent.click(newDeckButton);

      // Wait for cards to load
      await waitFor(() => {
        expect(screen.getByText('Select Leader Card')).toBeInTheDocument();
      });

      // Search input should exist
      const searchInput = screen.getByPlaceholderText(/search/i);
      expect(searchInput).toBeInTheDocument();
    });

    it('should filter cards by name when searching', async () => {
      render(<DeckForm idToken={mockIdToken} onDeckCreated={mockOnDeckCreated} />);

      // Open dialog
      const newDeckButton = screen.getByText('New Deck');
      fireEvent.click(newDeckButton);

      await waitFor(() => {
        expect(screen.getByText('モンキー・D・ルフィ')).toBeInTheDocument();
      });

      // Initially all cards should be visible
      expect(screen.getByText('モンキー・D・ルフィ')).toBeInTheDocument();
      expect(screen.getByText('ロロノア・ゾロ')).toBeInTheDocument();
      expect(screen.getByText('ナミ')).toBeInTheDocument();
      expect(screen.getByText('ウソップ')).toBeInTheDocument();

      // Search for "ルフィ"
      const searchInput = screen.getByPlaceholderText(/search/i);
      fireEvent.change(searchInput, { target: { value: 'ルフィ' } });

      // Only Luffy should be visible
      expect(screen.getByText('モンキー・D・ルフィ')).toBeInTheDocument();
      expect(screen.queryByText('ロロノア・ゾロ')).not.toBeInTheDocument();
      expect(screen.queryByText('ナミ')).not.toBeInTheDocument();
      expect(screen.queryByText('ウソップ')).not.toBeInTheDocument();
    });

    it('should handle case-insensitive search', async () => {
      render(<DeckForm idToken={mockIdToken} onDeckCreated={mockOnDeckCreated} />);

      const newDeckButton = screen.getByText('New Deck');
      fireEvent.click(newDeckButton);

      await waitFor(() => {
        expect(screen.getByText('ナミ')).toBeInTheDocument();
      });

      // Search with lowercase
      const searchInput = screen.getByPlaceholderText(/search/i);
      fireEvent.change(searchInput, { target: { value: 'なみ' } });

      // Nami should still be found (case-insensitive)
      expect(screen.getByText('ナミ')).toBeInTheDocument();
    });

    it('should show all cards when search is cleared', async () => {
      render(<DeckForm idToken={mockIdToken} onDeckCreated={mockOnDeckCreated} />);

      const newDeckButton = screen.getByText('New Deck');
      fireEvent.click(newDeckButton);

      await waitFor(() => {
        expect(screen.getByText('モンキー・D・ルフィ')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search/i);

      // Search for something
      fireEvent.change(searchInput, { target: { value: 'ゾロ' } });
      expect(screen.queryByText('ナミ')).not.toBeInTheDocument();

      // Clear search
      fireEvent.change(searchInput, { target: { value: '' } });

      // All cards should be visible again
      expect(screen.getByText('モンキー・D・ルフィ')).toBeInTheDocument();
      expect(screen.getByText('ロロノア・ゾロ')).toBeInTheDocument();
      expect(screen.getByText('ナミ')).toBeInTheDocument();
      expect(screen.getByText('ウソップ')).toBeInTheDocument();
    });

    it('should show "No cards found" when no matches', async () => {
      render(<DeckForm idToken={mockIdToken} onDeckCreated={mockOnDeckCreated} />);

      const newDeckButton = screen.getByText('New Deck');
      fireEvent.click(newDeckButton);

      await waitFor(() => {
        expect(screen.getByText('モンキー・D・ルフィ')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search/i);
      fireEvent.change(searchInput, { target: { value: '存在しないカード' } });

      // No results message should appear
      expect(screen.getByText(/no cards found/i)).toBeInTheDocument();
      expect(screen.queryByText('モンキー・D・ルフィ')).not.toBeInTheDocument();
    });
  });

  describe('Phase 2: Color Filter with AND condition', () => {
    it('should display color filter dropdown', async () => {
      render(<DeckForm idToken={mockIdToken} onDeckCreated={mockOnDeckCreated} />);

      const newDeckButton = screen.getByText('New Deck');
      fireEvent.click(newDeckButton);

      await waitFor(() => {
        expect(screen.getByText('Select Leader Card')).toBeInTheDocument();
      });

      // Color filter dropdown should exist
      const colorFilter = screen.getByLabelText(/color/i);
      expect(colorFilter).toBeInTheDocument();
    });

    it('should filter by color only', async () => {
      render(<DeckForm idToken={mockIdToken} onDeckCreated={mockOnDeckCreated} />);

      const newDeckButton = screen.getByText('New Deck');
      fireEvent.click(newDeckButton);

      await waitFor(() => {
        expect(screen.getByText('モンキー・D・ルフィ')).toBeInTheDocument();
      });

      // Select "赤" color
      const colorFilter = screen.getByLabelText(/color/i);
      fireEvent.change(colorFilter, { target: { value: '赤' } });

      // Only red cards should be visible
      expect(screen.getByText('モンキー・D・ルフィ')).toBeInTheDocument();
      expect(screen.getByText('ナミ')).toBeInTheDocument();
      expect(screen.queryByText('ロロノア・ゾロ')).not.toBeInTheDocument();
      expect(screen.queryByText('ウソップ')).not.toBeInTheDocument();
    });

    it('should filter by name AND color', async () => {
      render(<DeckForm idToken={mockIdToken} onDeckCreated={mockOnDeckCreated} />);

      const newDeckButton = screen.getByText('New Deck');
      fireEvent.click(newDeckButton);

      await waitFor(() => {
        expect(screen.getByText('モンキー・D・ルフィ')).toBeInTheDocument();
      });

      // Search for "ルフィ" AND color "赤"
      const searchInput = screen.getByPlaceholderText(/search/i);
      const colorFilter = screen.getByLabelText(/color/i);

      fireEvent.change(searchInput, { target: { value: 'ルフィ' } });
      fireEvent.change(colorFilter, { target: { value: '赤' } });

      // Only Luffy should match both conditions
      expect(screen.getByText('モンキー・D・ルフィ')).toBeInTheDocument();
      expect(screen.queryByText('ナミ')).not.toBeInTheDocument(); // Red but not "ルフィ"
      expect(screen.queryByText('ロロノア・ゾロ')).not.toBeInTheDocument();
    });

    it('should show "All Colors" option to clear color filter', async () => {
      render(<DeckForm idToken={mockIdToken} onDeckCreated={mockOnDeckCreated} />);

      const newDeckButton = screen.getByText('New Deck');
      fireEvent.click(newDeckButton);

      await waitFor(() => {
        expect(screen.getByText('モンキー・D・ルフィ')).toBeInTheDocument();
      });

      const colorFilter = screen.getByLabelText(/color/i);

      // Select a color
      fireEvent.change(colorFilter, { target: { value: '赤' } });
      expect(screen.queryByText('ロロノア・ゾロ')).not.toBeInTheDocument();

      // Select "All Colors"
      fireEvent.change(colorFilter, { target: { value: '' } });

      // All cards should be visible again
      expect(screen.getByText('モンキー・D・ルフィ')).toBeInTheDocument();
      expect(screen.getByText('ロロノア・ゾロ')).toBeInTheDocument();
    });

    it('should extract unique colors from cards', async () => {
      render(<DeckForm idToken={mockIdToken} onDeckCreated={mockOnDeckCreated} />);

      const newDeckButton = screen.getByText('New Deck');
      fireEvent.click(newDeckButton);

      await waitFor(() => {
        expect(screen.getByText('Select Leader Card')).toBeInTheDocument();
      });

      const colorFilter = screen.getByLabelText(/color/i) as HTMLSelectElement;

      // Should have options: All Colors, 赤, 緑, 黄
      const options = Array.from(colorFilter.options).map((opt) => opt.value);
      expect(options).toContain('');
      expect(options).toContain('赤');
      expect(options).toContain('緑');
      expect(options).toContain('黄');
    });
  });
});
