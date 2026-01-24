/**
 * Tests for DeckList component
 *
 * This test verifies that the leader card name is displayed WITHOUT the "Leader:" prefix.
 */

import { render, screen } from '@testing-library/react';
import DeckList from './DeckList';

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

describe('DeckList', () => {
  const mockDecks = [
    {
      id: '1',
      name: 'テストユーザー',
      leader_card: {
        id: 'card-1',
        card_id: 'OP01-001',
        name: 'モンキー・D・ルフィ',
        color: '赤',
        block_icon: 5,
        image_path: 'https://example.com/card.jpg',
      },
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ];

  const mockOnEdit = jest.fn();
  const mockOnDelete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Leader card name display', () => {
    it('should NOT display leader card name', () => {
      render(
        <DeckList
          decks={mockDecks}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      // Leader card name should NOT be visible
      expect(screen.queryByText('モンキー・D・ルフィ')).not.toBeInTheDocument();

      // "Leader:" prefix should NOT be in the document
      expect(screen.queryByText(/Leader:/)).not.toBeInTheDocument();
    });

    it('should only display deck name and created date', () => {
      render(
        <DeckList
          decks={mockDecks}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      // Deck name should be visible
      const deckName = screen.getByRole('heading', { level: 3, name: 'テストユーザー' });
      expect(deckName).toBeInTheDocument();

      // Created date should be visible
      expect(screen.getByText(/Created:/)).toBeInTheDocument();

      // Leader name should NOT be visible
      expect(screen.queryByText('モンキー・D・ルフィ')).not.toBeInTheDocument();
    });
  });

  describe('Multiple decks', () => {
    it('should NOT display any leader names', () => {
      const multipleDecks = [
        {
          ...mockDecks[0],
          id: '1',
          leader_card: { ...mockDecks[0].leader_card, name: 'ルフィ' },
        },
        {
          ...mockDecks[0],
          id: '2',
          leader_card: { ...mockDecks[0].leader_card, name: 'ゾロ' },
        },
        {
          ...mockDecks[0],
          id: '3',
          leader_card: { ...mockDecks[0].leader_card, name: 'ナミ' },
        },
      ];

      render(
        <DeckList
          decks={multipleDecks}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      // No leader names should be visible
      expect(screen.queryByText('ルフィ')).not.toBeInTheDocument();
      expect(screen.queryByText('ゾロ')).not.toBeInTheDocument();
      expect(screen.queryByText('ナミ')).not.toBeInTheDocument();

      // No "Leader:" prefix should exist
      expect(screen.queryByText(/Leader:/)).not.toBeInTheDocument();
    });
  });
});
