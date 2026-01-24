/**
 * Tests for GroupedDeckList component
 *
 * This test verifies that the leader card name is displayed WITHOUT the "Leader:" prefix.
 */

import { render, screen } from '@testing-library/react';
import GroupedDeckList from './GroupedDeckList';

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

describe('GroupedDeckList', () => {
  const mockUsers = [
    {
      id: 'user-1',
      email: 'user1@example.com',
      nickname: 'User 1',
      image: null,
    },
  ];

  const mockDecks = [
    {
      id: 'deck-1',
      name: 'テストデッキ',
      user: mockUsers[0],
      leader_card: {
        id: 'card-1',
        card_id: 'OP01-001',
        name: 'モンキー・D・ルフィ',
        color: '赤',
        block_icon: 5,
        image_path: 'https://example.com/card.jpg',
      },
      created_at: '2024-01-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Leader card name display', () => {
    it('should NOT display leader card name', () => {
      render(
        <GroupedDeckList users={mockUsers} decks={mockDecks} totalCount={1} />
      );

      // Leader card name should NOT be visible
      expect(screen.queryByText('モンキー・D・ルフィ')).not.toBeInTheDocument();

      // "Leader:" prefix should NOT be in the document
      expect(screen.queryByText(/Leader:/)).not.toBeInTheDocument();
    });

    it('should only display deck name and user info', () => {
      render(
        <GroupedDeckList users={mockUsers} decks={mockDecks} totalCount={1} />
      );

      // Deck name should be visible
      const deckName = screen.getByRole('heading', {
        level: 3,
        name: 'テストデッキ',
      });
      expect(deckName).toBeInTheDocument();

      // User nickname should be visible
      expect(screen.getByText('User 1')).toBeInTheDocument();

      // Leader name should NOT be visible
      expect(screen.queryByText('モンキー・D・ルフィ')).not.toBeInTheDocument();
    });
  });

  describe('Multiple decks with different leaders', () => {
    it('should NOT display any leader names', () => {
      const multipleDecks = [
        {
          ...mockDecks[0],
          id: 'deck-1',
          leader_card: { ...mockDecks[0].leader_card, name: 'ルフィ' },
        },
        {
          ...mockDecks[0],
          id: 'deck-2',
          leader_card: { ...mockDecks[0].leader_card, name: 'ゾロ' },
        },
        {
          ...mockDecks[0],
          id: 'deck-3',
          leader_card: { ...mockDecks[0].leader_card, name: 'ナミ' },
        },
      ];

      render(
        <GroupedDeckList
          users={mockUsers}
          decks={multipleDecks}
          totalCount={3}
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

  describe('Empty state', () => {
    it('should not display any leader names when no decks exist', () => {
      render(<GroupedDeckList users={[]} decks={[]} totalCount={0} />);

      // No leader names should be visible
      expect(screen.queryByText(/モンキー・D・ルフィ/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Leader:/)).not.toBeInTheDocument();
    });
  });
});
