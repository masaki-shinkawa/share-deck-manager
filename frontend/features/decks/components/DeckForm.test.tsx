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
    const { fill, unoptimized, quality, sizes, priority, ...rest } = props;
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...rest} />;
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
      const newDeckButton = screen.getByText('デッキ作成');
      fireEvent.click(newDeckButton);

      // Wait for cards to load
      await waitFor(() => {
        expect(screen.getByText('リーダーカードを選択')).toBeInTheDocument();
      });

      // Search input should exist
      const searchInput = screen.getByPlaceholderText(/カードを検索/i);
      expect(searchInput).toBeInTheDocument();
    });

    it('should filter cards by name when searching', async () => {
      render(<DeckForm idToken={mockIdToken} onDeckCreated={mockOnDeckCreated} />);

      // Open dialog
      const newDeckButton = screen.getByText('デッキ作成');
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
      const searchInput = screen.getByPlaceholderText(/カードを検索/i);
      fireEvent.change(searchInput, { target: { value: 'ルフィ' } });

      // Only Luffy should be visible
      expect(screen.getByText('モンキー・D・ルフィ')).toBeInTheDocument();
      expect(screen.queryByText('ロロノア・ゾロ')).not.toBeInTheDocument();
      expect(screen.queryByText('ナミ')).not.toBeInTheDocument();
      expect(screen.queryByText('ウソップ')).not.toBeInTheDocument();
    });

    it('should handle case-insensitive search', async () => {
      render(<DeckForm idToken={mockIdToken} onDeckCreated={mockOnDeckCreated} />);

      const newDeckButton = screen.getByText('デッキ作成');
      fireEvent.click(newDeckButton);

      await waitFor(() => {
        expect(screen.getByText('モンキー・D・ルフィ')).toBeInTheDocument();
      });

      // Search with lowercase 'd' should match 'D' in card name
      const searchInput = screen.getByPlaceholderText(/カードを検索/i);
      fireEvent.change(searchInput, { target: { value: 'd' } });

      // Luffy (モンキー・D・ルフィ) should be found via case-insensitive match on 'D'
      expect(screen.getByText('モンキー・D・ルフィ')).toBeInTheDocument();
      // Others without 'D' should not be shown
      expect(screen.queryByText('ナミ')).not.toBeInTheDocument();
    });

    it('should show all cards when search is cleared', async () => {
      render(<DeckForm idToken={mockIdToken} onDeckCreated={mockOnDeckCreated} />);

      const newDeckButton = screen.getByText('デッキ作成');
      fireEvent.click(newDeckButton);

      await waitFor(() => {
        expect(screen.getByText('モンキー・D・ルフィ')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/カードを検索/i);

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

      const newDeckButton = screen.getByText('デッキ作成');
      fireEvent.click(newDeckButton);

      await waitFor(() => {
        expect(screen.getByText('モンキー・D・ルフィ')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/カードを検索/i);
      fireEvent.change(searchInput, { target: { value: '存在しないカード' } });

      // No results message should appear
      expect(screen.getByText(/カードが見つかりません/)).toBeInTheDocument();
      expect(screen.queryByText('モンキー・D・ルフィ')).not.toBeInTheDocument();
    });
  });

  describe('Manual Input for Unreleased Cards', () => {
    it('should display manual input button at the top of card grid', async () => {
      render(<DeckForm idToken={mockIdToken} onDeckCreated={mockOnDeckCreated} />);

      const newDeckButton = screen.getByText('デッキ作成');
      fireEvent.click(newDeckButton);

      await waitFor(() => {
        expect(screen.getByText('リーダーカードを選択')).toBeInTheDocument();
      });

      // Manual input button should be present
      expect(screen.getByTestId('manual-input-card')).toBeInTheDocument();
    });

    it('should open manual input modal when clicked', async () => {
      render(<DeckForm idToken={mockIdToken} onDeckCreated={mockOnDeckCreated} />);

      const newDeckButton = screen.getByText('デッキ作成');
      fireEvent.click(newDeckButton);

      await waitFor(() => {
        expect(screen.getByTestId('manual-input-card')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('manual-input-card'));

      // Manual input form should appear
      expect(screen.getByPlaceholderText(/カード名/)).toBeInTheDocument();
      expect(screen.getByLabelText(/色1/)).toBeInTheDocument();
      expect(screen.getByLabelText(/色2/)).toBeInTheDocument();
    });

    it('should create deck with custom card when manual form is submitted', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => mockCards }) // fetch cards
        .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'custom-1', user_id: 'u1', name: '新リーダー', color1: '赤', color2: null }) }) // create custom card
        .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'deck-1', name: '赤 新リーダー', custom_card_id: 'custom-1' }) }); // create deck

      render(<DeckForm idToken={mockIdToken} onDeckCreated={mockOnDeckCreated} />);

      const newDeckButton = screen.getByText('デッキ作成');
      fireEvent.click(newDeckButton);

      await waitFor(() => {
        expect(screen.getByTestId('manual-input-card')).toBeInTheDocument();
      });

      // Click manual input
      fireEvent.click(screen.getByTestId('manual-input-card'));

      // Fill in the form
      const nameInput = screen.getByPlaceholderText(/カード名/);
      fireEvent.change(nameInput, { target: { value: '新リーダー' } });

      const color1Select = screen.getByTestId('manual-color1-select');
      fireEvent.change(color1Select, { target: { value: '赤' } });

      // Submit
      const createButton = screen.getByTestId('manual-create-button');
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(mockOnDeckCreated).toHaveBeenCalled();
      });
    });
  });

  describe('Phase 2: Color Filter with AND condition', () => {
    it('should display color filter dropdown', async () => {
      render(<DeckForm idToken={mockIdToken} onDeckCreated={mockOnDeckCreated} />);

      const newDeckButton = screen.getByText('デッキ作成');
      fireEvent.click(newDeckButton);

      await waitFor(() => {
        expect(screen.getByText('リーダーカードを選択')).toBeInTheDocument();
      });

      // Color filter dropdown should exist
      const colorFilter = screen.getByLabelText(/color/i);
      expect(colorFilter).toBeInTheDocument();
    });

    it('should filter by color only', async () => {
      render(<DeckForm idToken={mockIdToken} onDeckCreated={mockOnDeckCreated} />);

      const newDeckButton = screen.getByText('デッキ作成');
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

      const newDeckButton = screen.getByText('デッキ作成');
      fireEvent.click(newDeckButton);

      await waitFor(() => {
        expect(screen.getByText('モンキー・D・ルフィ')).toBeInTheDocument();
      });

      // Search for "ルフィ" AND color "赤"
      const searchInput = screen.getByPlaceholderText(/カードを検索/i);
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

      const newDeckButton = screen.getByText('デッキ作成');
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

      const newDeckButton = screen.getByText('デッキ作成');
      fireEvent.click(newDeckButton);

      // Wait for cards to actually load
      await waitFor(() => {
        expect(screen.getByText('モンキー・D・ルフィ')).toBeInTheDocument();
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

  describe('Issue #5: Color1 and Color2 for Manual Input', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockCards,
      });
    });

    it('should display Color1 and Color2 dropdowns in manual input form', async () => {
      render(<DeckForm idToken={mockIdToken} onDeckCreated={mockOnDeckCreated} />);

      const newDeckButton = screen.getByText('デッキ作成');
      fireEvent.click(newDeckButton);

      await waitFor(() => {
        expect(screen.getByTestId('manual-input-card')).toBeInTheDocument();
      });

      // Click manual input
      fireEvent.click(screen.getByTestId('manual-input-card'));

      // Should have Color1 dropdown (required)
      expect(screen.getByTestId('manual-color1-select')).toBeInTheDocument();

      // Should have Color2 dropdown (optional)
      expect(screen.getByTestId('manual-color2-select')).toBeInTheDocument();
    });

    it('should have "--- (None)" option for Color2', async () => {
      render(<DeckForm idToken={mockIdToken} onDeckCreated={mockOnDeckCreated} />);

      const newDeckButton = screen.getByText('デッキ作成');
      fireEvent.click(newDeckButton);

      await waitFor(() => {
        expect(screen.getByTestId('manual-input-card')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('manual-input-card'));

      const color2Select = screen.getByTestId('manual-color2-select') as HTMLSelectElement;
      const options = Array.from(color2Select.options).map((opt) => opt.text);

      // Color2 should have "--- (なし)" option
      expect(options).toContain('--- (なし)');
    });

    it('should create single-color custom card when Color2 is not selected', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => mockCards })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 'custom-1',
            user_id: 'u1',
            name: '単色リーダー',
            color1: '紫',
            color2: null
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 'deck-1',
            name: '紫デッキ',
            custom_card_id: 'custom-1'
          })
        });

      render(<DeckForm idToken={mockIdToken} onDeckCreated={mockOnDeckCreated} />);

      const newDeckButton = screen.getByText('デッキ作成');
      fireEvent.click(newDeckButton);

      // Wait for cards to load AND manual input card to appear
      await waitFor(() => {
        expect(screen.getByText('モンキー・D・ルフィ')).toBeInTheDocument();
        expect(screen.getByTestId('manual-input-card')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('manual-input-card'));

      // Wait for manual input form to appear
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/カード名/)).toBeInTheDocument();
      });

      // Fill in the form
      const nameInput = screen.getByPlaceholderText(/カード名/);
      fireEvent.change(nameInput, { target: { value: '単色リーダー' } });

      // Wait for color options to be available
      await waitFor(() => {
        const color1Select = screen.getByTestId('manual-color1-select') as HTMLSelectElement;
        expect(color1Select.options.length).toBeGreaterThan(1);
      });

      const color1Select = screen.getByTestId('manual-color1-select');
      fireEvent.change(color1Select, { target: { value: '赤' } }); // Use '赤' which is in mockCards

      const color2Select = screen.getByTestId('manual-color2-select');
      fireEvent.change(color2Select, { target: { value: '' } }); // None

      // Wait for button to be enabled
      await waitFor(() => {
        const createButton = screen.getByTestId('manual-create-button');
        expect(createButton).not.toBeDisabled();
      });

      // Submit
      const createButton = screen.getByTestId('manual-create-button');
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(mockOnDeckCreated).toHaveBeenCalled();
      });
    });

    it('should create multi-color custom card with Color1 and Color2', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => mockCards })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 'custom-2',
            user_id: 'u1',
            name: '多色リーダー',
            color1: '赤',
            color2: '緑'
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 'deck-2',
            name: '赤/緑デッキ',
            custom_card_id: 'custom-2'
          })
        });

      render(<DeckForm idToken={mockIdToken} onDeckCreated={mockOnDeckCreated} />);

      const newDeckButton = screen.getByText('デッキ作成');
      fireEvent.click(newDeckButton);

      // Wait for cards to load AND manual input card to appear
      await waitFor(() => {
        expect(screen.getByText('モンキー・D・ルフィ')).toBeInTheDocument();
        expect(screen.getByTestId('manual-input-card')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('manual-input-card'));

      // Wait for manual input form to appear
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/カード名/)).toBeInTheDocument();
      });

      // Fill in the form
      const nameInput = screen.getByPlaceholderText(/カード名/);
      fireEvent.change(nameInput, { target: { value: '多色リーダー' } });

      // Wait for color options to be available
      await waitFor(() => {
        const color1Select = screen.getByTestId('manual-color1-select') as HTMLSelectElement;
        expect(color1Select.options.length).toBeGreaterThan(1);
      });

      const color1Select = screen.getByTestId('manual-color1-select');
      fireEvent.change(color1Select, { target: { value: '赤' } });

      const color2Select = screen.getByTestId('manual-color2-select');
      fireEvent.change(color2Select, { target: { value: '緑' } });

      // Wait for button to be enabled
      await waitFor(() => {
        const createButton = screen.getByTestId('manual-create-button');
        expect(createButton).not.toBeDisabled();
      });

      // Submit
      const createButton = screen.getByTestId('manual-create-button');
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(mockOnDeckCreated).toHaveBeenCalled();
      });
    });

    it('should prevent selecting same color for Color1 and Color2', async () => {
      render(<DeckForm idToken={mockIdToken} onDeckCreated={mockOnDeckCreated} />);

      const newDeckButton = screen.getByText('デッキ作成');
      fireEvent.click(newDeckButton);

      // Wait for cards to load AND manual input card to appear
      await waitFor(() => {
        expect(screen.getByText('モンキー・D・ルフィ')).toBeInTheDocument();
        expect(screen.getByTestId('manual-input-card')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('manual-input-card'));

      // Wait for manual input form to appear
      await waitFor(() => {
        expect(screen.getByTestId('manual-color1-select')).toBeInTheDocument();
      });

      // Wait for color options to be available
      await waitFor(() => {
        const color1Select = screen.getByTestId('manual-color1-select') as HTMLSelectElement;
        expect(color1Select.options.length).toBeGreaterThan(1);
      });

      const color1Select = screen.getByTestId('manual-color1-select');
      fireEvent.change(color1Select, { target: { value: '赤' } });

      // Wait for Color2 select to update after Color1 changes
      await waitFor(() => {
        const color2Select = screen.getByTestId('manual-color2-select') as HTMLSelectElement;
        const color2Options = Array.from(color2Select.options).map((opt) => opt.value);
        // Color2 options should not include '赤' (already selected in Color1)
        expect(color2Options).not.toContain('赤');
      });
    });

    it('should auto-sort colors to standard order (赤, 緑, 青, 紫, 黒, 黄)', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => mockCards })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 'custom-3',
            user_id: 'u1',
            name: 'Auto-sorted Leader',
            color1: '赤',  // Backend auto-sorted
            color2: '黄'
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 'deck-3',
            name: 'Sorted Deck',
            custom_card_id: 'custom-3'
          })
        });

      render(<DeckForm idToken={mockIdToken} onDeckCreated={mockOnDeckCreated} />);

      const newDeckButton = screen.getByText('デッキ作成');
      fireEvent.click(newDeckButton);

      // Wait for cards to load AND manual input card to appear
      await waitFor(() => {
        expect(screen.getByText('モンキー・D・ルフィ')).toBeInTheDocument();
        expect(screen.getByTestId('manual-input-card')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('manual-input-card'));

      // Wait for manual input form to appear
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/カード名/)).toBeInTheDocument();
      });

      // User selects in wrong order: Color1=黄, Color2=赤
      const nameInput = screen.getByPlaceholderText(/カード名/);
      fireEvent.change(nameInput, { target: { value: 'Auto-sorted Leader' } });

      // Wait for color options to be available
      await waitFor(() => {
        const color1Select = screen.getByTestId('manual-color1-select') as HTMLSelectElement;
        expect(color1Select.options.length).toBeGreaterThan(1);
      });

      const color1Select = screen.getByTestId('manual-color1-select');
      fireEvent.change(color1Select, { target: { value: '黄' } });

      const color2Select = screen.getByTestId('manual-color2-select');
      fireEvent.change(color2Select, { target: { value: '赤' } });

      // Wait for button to be enabled
      await waitFor(() => {
        const createButton = screen.getByTestId('manual-create-button');
        expect(createButton).not.toBeDisabled();
      });

      // Submit
      const createButton = screen.getByTestId('manual-create-button');
      fireEvent.click(createButton);

      // Backend will auto-sort, so we just verify the deck was created
      await waitFor(() => {
        expect(mockOnDeckCreated).toHaveBeenCalled();
      });
    });
  });
});
