"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

interface Card {
  id: string;
  card_id: string;
  name: string;
  color: string;
  image_path: string;
}

interface DeckFormProps {
  idToken: string;
  onDeckCreated: () => void;
}

export default function DeckForm({ idToken, onDeckCreated }: DeckFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [cards, setCards] = useState<Card[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && cards.length === 0) {
      fetchCards();
    }
  }, [isOpen, cards]);

  const fetchCards = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/cards/`, {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setCards(data);
      }
    } catch (error) {
      console.error("Error fetching cards:", error);
    }
  };

  const handleSubmit = async () => {
    const selectedCard = cards.find((c) => c.id === selectedCardId);
    if (!selectedCard) return;

    const deckName = `${selectedCard.color} ${selectedCard.name}`;
    setIsLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/decks/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ 
          name: deckName,
          leader_card_id: selectedCardId
        }),
      });

      if (response.ok) {
        setIsOpen(false);
        setSelectedCardId(null);
        onDeckCreated();
      } else {
        console.error("Failed to create deck");
      }
    } catch (error) {
      console.error("Error creating deck:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="mb-6">
        <button
          onClick={() => setIsOpen(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none dark:bg-blue-500 dark:hover:bg-blue-600"
        >
          New Deck
        </button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold dark:text-white">Select Leader Card</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="grid flex-1 grid-cols-2 gap-4 overflow-y-auto pr-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {cards.map((card) => (
                <div
                  key={card.id}
                  onClick={() => setSelectedCardId(card.id)}
                  className={`group relative cursor-pointer rounded-lg border-2 p-1 transition-all ${
                    selectedCardId === card.id
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                      : "border-transparent bg-gray-50 hover:border-gray-300 dark:bg-zinc-800 dark:hover:border-gray-600"
                  }`}
                >
                  <div className="relative aspect-[2.5/3.5] overflow-hidden rounded">
                    <Image
                      src={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/images/${card.card_id}.jpg`}
                      alt={card.name}
                      fill
                      className="object-cover transition-transform group-hover:scale-105"
                      unoptimized
                    />
                  </div>
                  <div className="mt-2 text-center">
                    <p className="line-clamp-1 text-xs font-bold leading-tight dark:text-white">
                      {card.name}
                    </p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">
                      {card.color}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end gap-3 border-t pt-4 dark:border-gray-800">
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!selectedCardId || isLoading}
                className="rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                {isLoading ? "Creating..." : "Create Deck"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
