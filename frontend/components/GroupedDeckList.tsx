"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface UserSummary {
  id: string;
  nickname: string | null;
  email: string;
  image: string | null;
}

interface LeaderCardSummary {
  id: string;
  card_id: string;
  name: string;
  color: string;
  image_path: string;
}

interface CustomCardSummary {
  id: string;
  name: string;
  color1: string;
  color2: string | null;
}

interface DeckWithUser {
  id: string;
  name: string;
  user: UserSummary;
  leader_card: LeaderCardSummary | null;
  custom_card?: CustomCardSummary | null;
  created_at: string;
}

interface GroupedDecksResponse {
  users: UserSummary[];
  decks: DeckWithUser[];
  total_count: number;
}

interface GroupedDeckListProps {
  idToken?: string;
  users?: UserSummary[];
  decks?: DeckWithUser[];
  totalCount?: number;
}

export default function GroupedDeckList({ idToken, users: propUsers, decks: propDecks, totalCount: propTotalCount }: GroupedDeckListProps) {
  const [fetchedData, setFetchedData] = useState<GroupedDecksResponse | null>(null);
  const [isLoading, setIsLoading] = useState(!propDecks);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const users = propUsers ?? fetchedData?.users ?? [];
  const allDecks = propDecks ?? fetchedData?.decks ?? [];
  const totalCount = propTotalCount ?? fetchedData?.total_count ?? 0;

  const fetchGroupedDecks = async () => {
    if (!idToken) return;
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/decks/grouped`,
        {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        }
      );

      if (response.ok) {
        const groupedData = await response.json();
        setFetchedData(groupedData);
      } else {
        console.error("Failed to fetch grouped decks");
      }
    } catch (error) {
      console.error("Error fetching grouped decks:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!propDecks && idToken) {
      fetchGroupedDecks();
    }
  }, [idToken, propDecks]);

  if (isLoading) {
    return <div className="text-center text-gray-500 dark:text-gray-400">Loading...</div>;
  }

  if (!propDecks && !fetchedData) {
    return <div className="text-center text-gray-500 dark:text-gray-400">Failed to load decks.</div>;
  }

  // Filter decks by selected user and search query
  const filteredDecks = allDecks.filter((deck) => {
    const matchesUser = selectedUserId === null || deck.user.id === selectedUserId;
    const matchesSearch =
      searchQuery === "" ||
      deck.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (deck.leader_card && deck.leader_card.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (deck.custom_card && deck.custom_card.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (deck.user.nickname && deck.user.nickname.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesUser && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="flex items-center gap-4">
        <input
          type="text"
          placeholder="Search decks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-zinc-800 dark:text-white"
        />
      </div>

      {/* User Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-800">
        <div className="flex gap-4 overflow-x-auto">
          <button
            onClick={() => setSelectedUserId(null)}
            className={`whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition-colors ${selectedUserId === null
              ? "border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400"
              : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-300"
              }`}
          >
            All ({totalCount})
          </button>
          {users.map((user) => {
            const userDeckCount = allDecks.filter((d) => d.user.id === user.id).length;
            return (
              <button
                key={user.id}
                onClick={() => setSelectedUserId(user.id)}
                className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition-colors ${selectedUserId === user.id
                  ? "border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-300"
                  }`}
              >
                {user.image && (
                  <Image
                    src={user.image}
                    alt={user.nickname || user.email}
                    width={20}
                    height={20}
                    className="rounded-full"
                  />
                )}
                {user.nickname || user.email.split("@")[0]} ({userDeckCount})
              </button>
            );
          })}
        </div>
      </div>

      {/* Deck Grid */}
      {filteredDecks.length === 0 ? (
        <p className="text-center text-gray-500 dark:text-gray-400">
          No decks found{selectedUserId ? " for this user" : ""}.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredDecks.map((deck) => (
            <div
              key={deck.id}
              className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:shadow-md dark:border-gray-800 dark:bg-zinc-900"
            >
              <div className="flex items-center gap-4">
                {deck.custom_card && !deck.leader_card ? (
                  <div className="relative flex h-20 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded bg-gray-200 shadow-sm dark:bg-zinc-700">
                    <span className="text-xs font-bold text-gray-600 dark:text-gray-300">
                      {deck.custom_card.color2 ?
                        `${deck.custom_card.color1}/${deck.custom_card.color2} ${deck.custom_card.name}`
                        : `${deck.custom_card.color1} ${deck.custom_card.name}`
                      }
                    </span>
                  </div>
                ) : deck.leader_card ? (
                  <div className="relative h-20 w-14 flex-shrink-0 overflow-hidden rounded shadow-sm">
                    <Image
                      src={deck.leader_card.image_path}
                      alt={deck.leader_card.name}
                      width={224}
                      height={320}
                      quality={95}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      style={{ imageRendering: "auto" }}
                      unoptimized
                    />
                  </div>
                ) : null}
                <div className="flex-1 min-w-0">
                  <h3 className="truncate font-bold text-gray-900 dark:text-white">
                    {deck.name}
                  </h3>
                  <div className="mt-1 flex items-center gap-2">
                    {deck.user.image && (
                      <Image
                        src={deck.user.image}
                        alt={deck.user.nickname || deck.user.email}
                        width={16}
                        height={16}
                        className="rounded-full"
                      />
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {deck.user.nickname || deck.user.email.split("@")[0]}
                    </p>
                  </div>
                  <p className="mt-1 text-[10px] text-gray-400 dark:text-gray-500">
                    Created: {new Date(deck.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
