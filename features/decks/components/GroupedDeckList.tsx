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
  cardId: string;
  name: string;
  color: string;
  imagePath: string;
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
  leaderCard: LeaderCardSummary | null;
  customCard?: CustomCardSummary | null;
  status: "built" | "planning";
  regulation: "standard" | "extra";
  createdAt: string;
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
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/api/v1/decks/grouped`,
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
    return <div className="text-center text-gray-500 dark:text-gray-400">読み込み中...</div>;
  }

  if (!propDecks && !fetchedData) {
    return <div className="text-center text-gray-500 dark:text-gray-400">デッキの読み込みに失敗しました。</div>;
  }

  // Filter decks by selected user and search query
  const filteredDecks = allDecks.filter((deck) => {
    const matchesUser = selectedUserId === null || deck.user.id === selectedUserId;
    const matchesSearch =
      searchQuery === "" ||
      deck.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (deck.leaderCard && deck.leaderCard.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (deck.customCard && deck.customCard.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (deck.user.nickname && deck.user.nickname.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesUser && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="flex items-center gap-4">
        <input
          type="text"
          placeholder="デッキを検索..."
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
          デッキが見つかりません{selectedUserId ? "（選択されたユーザー）" : ""}。
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredDecks.map((deck) => (
            <div
              key={deck.id}
              className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:shadow-md dark:border-gray-800 dark:bg-zinc-900"
            >
              {/* Status and Regulation Badges */}
              <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
                {deck.status === "planning" && (
                  <span className="px-3 py-1 bg-yellow-500/90 text-gray-900 text-xs font-semibold rounded-full">
                    検討中
                  </span>
                )}
                {deck.regulation === "extra" && (
                  <span className="px-3 py-1 bg-purple-500/90 text-white text-xs font-semibold rounded-full">
                    エクストラ
                  </span>
                )}
              </div>

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
                    Created: {new Date(deck.createdAt).toLocaleDateString()}
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
