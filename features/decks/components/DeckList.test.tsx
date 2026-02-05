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
    const { fill, unoptimized, quality, sizes, priority, ...rest } = props;
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...rest} />;
  },
}));

describe('DeckList', () => {
  const mockDecks = [
    {
      id: '1',
      name: 'テストユーザー',
      status: 'built' as const,
      leaderCard: {
        id: 'card-1',
        cardId: 'OP01-001',
        name: 'モンキー・D・ルフィ',
        color: '赤',
        blockIcon: 5,
        imagePath: 'https://example.com/card.jpg',
      },
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
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
      expect(screen.getByText(/作成日:/)).toBeInTheDocument();

      // Leader name should NOT be visible
      expect(screen.queryByText('モンキー・D・ルフィ')).not.toBeInTheDocument();
    });
  });

  describe('Custom card deck display', () => {
    it('should display custom card name and color as text when no image', () => {
      const customCardDecks = [
        {
          id: 'deck-custom',
          name: '赤 未発売リーダー',
          status: 'built' as const,
          leaderCard: null,
          customCard: {
            id: 'custom-1',
            name: '未発売リーダー',
            color1: '赤',
            color2: null,
          },
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];

      render(
        <DeckList
          decks={customCardDecks}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      // Deck name should be visible (as h3)
      expect(screen.getByRole('heading', { level: 3, name: '赤 未発売リーダー' })).toBeInTheDocument();
      // Custom card color and name should be displayed as text (in multiple places)
      const customCardTexts = screen.getAllByText('赤 未発売リーダー');
      expect(customCardTexts.length).toBeGreaterThan(0);
    });
  });

  describe('Multiple decks', () => {
    it('should NOT display any leader names', () => {
      const multipleDecks = [
        {
          ...mockDecks[0],
          id: '1',
          status: 'built' as const,
          leaderCard: { ...mockDecks[0].leaderCard, name: 'ルフィ' },
        },
        {
          ...mockDecks[0],
          id: '2',
          status: 'built' as const,
          leaderCard: { ...mockDecks[0].leaderCard, name: 'ゾロ' },
        },
        {
          ...mockDecks[0],
          id: '3',
          status: 'built' as const,
          leaderCard: { ...mockDecks[0].leaderCard, name: 'ナミ' },
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
