"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import DeckForm from "./DeckForm";

interface Card {
  id: string;
  card_id: string;
  name: string;
  image_path: string;
}

interface Deck {
  id: string;
  name: string;
  leader_card_id: string;
  leader_card: Card;
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
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/decks/`, {
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
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/decks/${deckId}`,
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {decks.map((deck) => (
            <div
              key={deck.id}
              className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:shadow-md dark:border-gray-800 dark:bg-zinc-900"
            >
              <div className="flex items-center gap-4">
                <div className="relative h-20 w-14 flex-shrink-0 overflow-hidden rounded shadow-sm">
                  <Image
                    src={deck.leader_card.image_path}
                    alt={deck.leader_card.name}
                    width={224}
                    height={320}
                    quality={95}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    style={{ imageRendering: 'auto' }}
                    unoptimized
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="truncate font-bold text-gray-900 dark:text-white">
                    {deck.name}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Leader: {deck.leader_card.name}
                  </p>
                  <p className="mt-1 text-[10px] text-gray-400 dark:text-gray-500">
                    Created: {new Date(deck.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleDelete(deck.id)}
                className="absolute top-2 right-2 rounded-full p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
