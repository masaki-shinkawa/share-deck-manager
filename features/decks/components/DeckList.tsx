"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Pencil, ShoppingCart } from "lucide-react";
import DeckForm from "./DeckForm";

interface Card {
  id: string;
  cardId: string;
  name: string;
  color?: string;
  imagePath: string;
}

interface CustomCardSummary {
  id: string;
  name: string;
  color1: string;
  color2: string | null;
}

interface Deck {
  id: string;
  name: string;
  leaderCardId?: string;
  leaderCard: Card | null;
  customCard?: CustomCardSummary | null;
  status: "built" | "planning";
  regulation: "standard" | "extra";
  createdAt: string;
  updatedAt: string;
}

interface DeckListProps {
  idToken?: string;
  decks?: Deck[];
  onEdit?: (deck: Deck) => void;
  onDelete?: (deckId: string) => void;
}

export default function DeckList({ idToken, decks: propDecks, onEdit, onDelete }: DeckListProps) {
  const [fetchedDecks, setFetchedDecks] = useState<Deck[]>([]);
  const [isLoading, setIsLoading] = useState(!propDecks);
  const [editingDeck, setEditingDeck] = useState<Deck | null>(null);
  const [editStatus, setEditStatus] = useState<"built" | "planning">("built");
  const [editRegulation, setEditRegulation] = useState<"standard" | "extra">("standard");
  const [isUpdating, setIsUpdating] = useState(false);

  const decks = propDecks ?? fetchedDecks;

  const fetchDecks = async () => {
    if (!idToken) return;
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/api/v1/decks/`, {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setFetchedDecks(data);
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
    if (!propDecks && idToken) {
      fetchDecks();
    }
  }, [idToken, propDecks]);

  const handleDelete = async (deckId: string) => {
    if (onDelete) {
      onDelete(deckId);
      return;
    }

    if (!idToken) return;
    if (!confirm("本当にこのデッキを削除しますか？")) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/api/v1/decks/${deckId}`,
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

  const handleEditClick = (deck: Deck) => {
    setEditingDeck(deck);
    setEditStatus(deck.status);
    setEditRegulation(deck.regulation);
  };

  const handleUpdateStatus = async () => {
    if (!editingDeck || !idToken) return;

    setIsUpdating(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/api/v1/decks/${editingDeck.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ status: editStatus, regulation: editRegulation }),
        }
      );

      if (response.ok) {
        fetchDecks();
        setEditingDeck(null);
      } else {
        console.error("Failed to update deck status");
      }
    } catch (error) {
      console.error("Error updating deck status:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return <div className="text-center text-gray-500">読み込み中...</div>;
  }

  return (
    <div className="space-y-6">
      {idToken && <DeckForm idToken={idToken} onDeckCreated={fetchDecks} />}

      {decks.length === 0 ? (
        <p className="text-center text-gray-500 dark:text-gray-400">
          デッキがまだありません。上で最初のデッキを作成しましょう！
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {decks.map((deck) => (
            <div
              key={deck.id}
              className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:shadow-md dark:border-gray-800 dark:bg-zinc-900"
            >
              <div className="flex items-center gap-4">
                {deck.customCard && !deck.leaderCard ? (
                  <div className="relative flex h-20 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded bg-gray-200 shadow-sm dark:bg-zinc-700">
                    <span className="text-xs font-bold text-gray-600 dark:text-gray-300">
                      {deck.customCard.color2 ?
                        `${deck.customCard.color1}/${deck.customCard.color2} ${deck.customCard.name}`
                        : `${deck.customCard.color1} ${deck.customCard.name}`
                      }
                    </span>
                  </div>
                ) : deck.leaderCard ? (
                  <div className="relative h-20 w-14 flex-shrink-0 overflow-hidden rounded shadow-sm">
                    <Image
                      src={deck.leaderCard.imagePath}
                      alt={deck.leaderCard.name}
                      width={224}
                      height={320}
                      quality={95}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      style={{ imageRendering: 'auto' }}
                      unoptimized
                    />
                  </div>
                ) : null}
                <div className="flex-1 min-w-0">
                  {/* Line 1: Title + Created Date (right-aligned) */}
                  <div className="flex items-baseline gap-2">
                    <h3 className="truncate font-bold text-gray-900 dark:text-white">
                      {deck.name}
                    </h3>
                    <span className="flex-shrink-0 text-[10px] text-gray-400 dark:text-gray-500">
                      作成日: {new Date(deck.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {/* Line 3: Status + Regulation Badges */}
                  {(deck.status === "planning" || deck.regulation === "extra") && (
                    <div className="mt-1 flex items-center gap-1.5">
                      {deck.status === "planning" && (
                        <span className="px-2 py-0.5 bg-yellow-500/90 text-gray-900 text-[10px] font-semibold rounded-full">
                          検討中
                        </span>
                      )}
                      {deck.regulation === "extra" && (
                        <span className="px-2 py-0.5 bg-purple-500/90 text-white text-[10px] font-semibold rounded-full">
                          エクストラ
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="absolute top-2 right-2 flex gap-1">
                <button
                  onClick={() => handleEditClick(deck)}
                  className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-zinc-800 dark:hover:text-gray-300"
                  title="編集"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => handleDelete(deck.id)}
                  className="rounded-full p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                  title="削除"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editingDeck && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 w-full max-w-md shadow-xl">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">デッキステータスの編集</h2>

            <div className="mb-4">
              <p className="text-gray-700 dark:text-gray-300 mb-2">{editingDeck.name}</p>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                ステータス
              </label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as "built" | "planning")}
                className="w-full px-4 py-2 bg-white dark:bg-zinc-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="built">構築済み</option>
                <option value="planning">検討中</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                レギュレーション
              </label>
              <select
                value={editRegulation}
                onChange={(e) => setEditRegulation(e.target.value as "standard" | "extra")}
                className="w-full px-4 py-2 bg-white dark:bg-zinc-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="standard">スタンダード</option>
                <option value="extra">エクストラ</option>
              </select>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setEditingDeck(null)}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-zinc-700"
              >
                キャンセル
              </button>
              <button
                onClick={handleUpdateStatus}
                disabled={isUpdating}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isUpdating ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
