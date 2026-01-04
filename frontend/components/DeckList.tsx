"use client";

import { useEffect, useState } from "react";
import DeckForm from "./DeckForm";

interface Deck {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

interface DeckListProps {
  idToken: string;
}

export default function DeckList({ idToken }: DeckListProps) {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDecks = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/v1/decks/", {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDecks(data);
      } else {
        console.error("Failed to fetch decks");
      }
    } catch (error) {
      console.error("Error fetching decks:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDecks();
  }, [idToken]);

  const handleDelete = async (deckId: string) => {
    if (!confirm("Are you sure you want to delete this deck?")) return;

    try {
      const response = await fetch(
        `http://localhost:8000/api/v1/decks/${deckId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        }
      );

      if (response.ok) {
        fetchDecks();
      } else {
        console.error("Failed to delete deck");
      }
    } catch (error) {
      console.error("Error deleting deck:", error);
    }
  };

  if (isLoading) {
    return <div className="text-center text-gray-500">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <DeckForm idToken={idToken} onDeckCreated={fetchDecks} />

      {decks.length === 0 ? (
        <p className="text-center text-gray-500 dark:text-gray-400">
          No decks yet. Create your first deck above!
        </p>
      ) : (
        <ul className="space-y-2">
          {decks.map((deck) => (
            <li
              key={deck.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 p-4 dark:border-gray-700"
            >
              <span className="font-medium text-gray-900 dark:text-white">
                {deck.name}
              </span>
              <button
                onClick={() => handleDelete(deck.id)}
                className="rounded-md bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
