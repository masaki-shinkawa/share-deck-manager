// import { Deck } from "@/api/models"; // Removed invalid import
// Since we can't easily import python models to TS, let's define TS interface
// Actually, we should probably define types in a separate file or just inline for now.

interface Deck {
  id: string;
  name: string;
  description?: string;
  recipe_url?: string;
  user_id: string;
  group_id: string;
}

interface DeckCardProps {
  deck: Deck;
  currentUserId?: string;
  onEdit?: (deck: Deck) => void;
  onDelete?: (deckId: string) => void;
}

import { ExternalLink, Edit, Trash2 } from "lucide-react";

export function DeckCard({ deck, currentUserId, onEdit, onDelete }: DeckCardProps) {
  const isOwner = currentUserId === deck.user_id;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white truncate flex-1 mr-2">
          {deck.name}
        </h3>
        {isOwner && (
          <div className="flex space-x-2">
            <button
              onClick={() => onEdit?.(deck)}
              className="text-gray-500 hover:text-blue-500 transition-colors"
              aria-label="Edit deck"
            >
              <Edit size={18} />
            </button>
            <button
              onClick={() => onDelete?.(deck.id)}
              className="text-gray-500 hover:text-red-500 transition-colors"
              aria-label="Delete deck"
            >
              <Trash2 size={18} />
            </button>
          </div>
        )}
      </div>
      
      {deck.description && (
        <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-3">
          {deck.description}
        </p>
      )}
      
      {deck.recipe_url && (
        <a
          href={deck.recipe_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
        >
          <span className="mr-1">View Recipe</span>
          <ExternalLink size={16} />
        </a>
      )}
    </div>
  );
}
