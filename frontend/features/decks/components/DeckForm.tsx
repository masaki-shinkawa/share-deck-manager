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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [status, setStatus] = useState<"built" | "planning">("built");

  // Manual input state
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualColor1, setManualColor1] = useState("");
  const [manualColor2, setManualColor2] = useState("");

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

  // Filter cards based on search query and color
  const filteredCards = (cards || []).filter((card) => {
    const matchesSearch =
      searchQuery === "" ||
      card.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesColor = selectedColor === "" || card.color === selectedColor;
    return matchesSearch && matchesColor;
  });

  // Get unique colors from all cards
  const colors = ["赤", "緑", "青", "紫", "黒", "黄"];

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
          leader_card_id: selectedCardId,
          status: status,
        }),
      });

      if (response.ok) {
        setIsOpen(false);
        setSelectedCardId(null);
        setSearchQuery("");
        setSelectedColor("");
        setStatus("built");
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

  const handleManualSubmit = async () => {
    if (!manualName || !manualColor1) return;

    const [color1, color2 = null] = colors.filter((color) => [manualColor1, manualColor2].includes(color));

    setIsLoading(true);
    try {
      // Step 1: Create custom card
      const customCardResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/custom-cards/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ name: manualName, color1, color2 }),
        }
      );

      if (!customCardResponse.ok) {
        console.error("Failed to create custom card");
        return;
      }

      const customCard = await customCardResponse.json();

      // Step 2: Create deck with custom card
      const colorDisplay = manualColor2 ? `${manualColor1}/${manualColor2}` : manualColor1;
      const deckName = `${colorDisplay} ${manualName}`;
      const deckResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/decks/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            name: deckName,
            custom_card_id: customCard.id,
            status: status,
          }),
        }
      );

      if (deckResponse.ok) {
        setIsOpen(false);
        setShowManualInput(false);
        setManualName("");
        setManualColor1("");
        setManualColor2("");
        setSearchQuery("");
        setSelectedColor("");
        setStatus("built");
        onDeckCreated();
      } else {
        console.error("Failed to create deck");
      }
    } catch (error) {
      console.error("Error creating deck with custom card:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setShowManualInput(false);
    setSelectedCardId(null);
    setSearchQuery("");
    setSelectedColor("");
    setManualName("");
    setManualColor1("");
    setManualColor2("");
    setStatus("built");
  };

  return (
    <>
      <div className="mb-6">
        <button
          onClick={() => setIsOpen(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none dark:bg-blue-500 dark:hover:bg-blue-600"
        >
          デッキ作成
        </button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold dark:text-white">リーダーカードを選択</h2>
              <button
                onClick={handleClose}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {showManualInput ? (
              /* Manual Input Form */
              <div className="flex-1 space-y-4 py-4">
                <div>
                  <input
                    type="text"
                    placeholder="カード名"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-zinc-800 dark:text-white"
                  />
                </div>
                <div>
                  <label htmlFor="manual-color1-input" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    色1 <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="manual-color1-input"
                    data-testid="manual-color1-select"
                    value={manualColor1}
                    onChange={(e) => setManualColor1(e.target.value)}
                    className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-zinc-800 dark:text-white"
                  >
                    <option value="">色1を選択</option>
                    {colors.map((color) => (
                      <option key={color} value={color}>
                        {color}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="manual-color2-input" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    色2 <span className="text-xs text-gray-500">(任意)</span>
                  </label>
                  <select
                    id="manual-color2-input"
                    data-testid="manual-color2-select"
                    value={manualColor2}
                    onChange={(e) => setManualColor2(e.target.value)}
                    className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-zinc-800 dark:text-white"
                  >
                    <option value="">--- (なし)</option>
                    {colors
                      .filter((color) => color !== manualColor1)
                      .map((color) => (
                        <option key={color} value={color}>
                          {color}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    ステータス
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as "built" | "planning")}
                    className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-zinc-800 dark:text-white"
                  >
                    <option value="built">構築済み</option>
                    <option value="planning">検討中</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    レギュレーション
                  </label>
                  <select
                    value={regulation}
                    onChange={(e) => setRegulation(e.target.value as "standard" | "extra")}
                    className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-zinc-800 dark:text-white"
                  >
                    <option value="standard">スタンダード</option>
                    <option value="extra">エクストラ</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowManualInput(false)}
                    className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-zinc-800"
                  >
                    戻る
                  </button>
                  <button
                    data-testid="manual-create-button"
                    onClick={handleManualSubmit}
                    disabled={!manualName || !manualColor1 || isLoading}
                    className="rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
                  >
                    {isLoading ? "Creating..." : "Create Deck"}
                  </button>
                </div>
              </div>
            ) : (
              /* Card Selection Grid */
              <>
                {/* Search and Filter */}
                <div className="mb-4 flex flex-col gap-3 sm:flex-row">
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="カードを検索..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-zinc-800 dark:text-white"
                    />
                  </div>
                  <div className="sm:w-48">
                    <select
                      aria-label="Color filter"
                      value={selectedColor}
                      onChange={(e) => setSelectedColor(e.target.value)}
                      className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-zinc-800 dark:text-white"
                    >
                      <option value="">全ての色</option>
                      {colors.map((color) => (
                        <option key={color} value={color}>
                          {color}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid flex-1 grid-cols-2 gap-4 overflow-y-auto pr-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {/* Manual Input Card - always first */}
                  <div
                    data-testid="manual-input-card"
                    onClick={() => setShowManualInput(true)}
                    className="group relative cursor-pointer rounded-lg border-2 border-dashed border-gray-300 p-1 transition-all hover:border-blue-400 dark:border-gray-600 dark:hover:border-blue-500"
                  >
                    <div className="flex aspect-[2.5/3.5] items-center justify-center">
                      <div className="text-center">
                        <svg className="mx-auto h-8 w-8 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">手入力</p>
                      </div>
                    </div>
                  </div>

                  {filteredCards.length === 0 ? (
                    <div className="col-span-full py-12 text-center text-gray-500 dark:text-gray-400">
                      カードが見つかりません
                    </div>
                  ) : (
                    filteredCards.map((card) => (
                      <div
                        key={card.id}
                        onClick={() => setSelectedCardId(card.id)}
                        className={`group relative cursor-pointer rounded-lg border-2 p-1 transition-all ${selectedCardId === card.id
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                          : "border-transparent bg-gray-50 hover:border-gray-300 dark:bg-zinc-800 dark:hover:border-gray-600"
                          }`}
                      >
                        <div className="relative aspect-[2.5/3.5] overflow-hidden rounded">
                          <Image
                            src={card.image_path}
                            alt={card.name}
                            fill
                            sizes="(max-width: 768px) 33vw, 200px"
                            quality={95}
                            className="object-cover transition-transform group-hover:scale-105"
                            style={{ imageRendering: 'auto' }}
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
                    ))
                  )}
                </div>

                {/* Status Selection */}
                <div className="mt-4 border-t pt-4 dark:border-gray-800">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    ステータス
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as "built" | "planning")}
                    className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-zinc-800 dark:text-white"
                  >
                    <option value="built">構築済み</option>
                    <option value="planning">検討中</option>
                  </select>
                </div>

                <div className="mt-6 flex justify-end gap-3 border-t pt-4 dark:border-gray-800">
                  <button
                    onClick={handleClose}
                    className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-zinc-800"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={!selectedCardId || isLoading}
                    className="rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
                  >
                    {isLoading ? "Creating..." : "Create Deck"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
