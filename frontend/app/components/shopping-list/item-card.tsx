'use client';

import { useState } from 'react';
import type { CardItem, Store } from '@/app/lib/types';

interface ItemCardProps {
  item: CardItem;
  stores: Store[];
  onSelectStore: (itemId: string, storeId: string | null) => void;
  onUpdatePrice: (itemId: string, storeId: string, price: number | null) => void;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onDelete: (itemId: string) => void;
}

export function ItemCard({
  item,
  stores,
  onSelectStore,
  onUpdatePrice,
  onUpdateQuantity,
  onDelete,
}: ItemCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  // Local state for price editing (not saved until "完了" button is clicked)
  const [localPrices, setLocalPrices] = useState<Record<string, number | null>>({});

  const selectedStore = stores.find((s) => s.id === item.purchaseStoreId);
  const selectedPrice = item.prices.find((p) => p.storeId === item.purchaseStoreId);

  // Handle entering edit mode - initialize local prices
  const handleStartEditing = () => {
    const pricesMap: Record<string, number | null> = {};
    item.prices.forEach((p) => {
      pricesMap[p.storeId] = p.price;
    });
    setLocalPrices(pricesMap);
    setIsEditing(true);
  };

  // Handle finishing edit mode - save all changed prices
  const handleFinishEditing = async () => {
    // Save all changed prices to the server
    const updatePromises: Promise<void>[] = [];

    Object.entries(localPrices).forEach(([storeId, price]) => {
      const originalPrice = item.prices.find((p) => p.storeId === storeId)?.price;
      // Only update if the price has changed
      if (price !== originalPrice) {
        updatePromises.push(
          Promise.resolve(onUpdatePrice(item.id, storeId, price))
        );
      }
    });

    // Wait for all updates to complete
    await Promise.all(updatePromises);

    setIsEditing(false);
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-3">
      {/* Card Name and Actions */}
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="font-medium text-lg text-white">{item.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-gray-400">数量:</span>
            <input
              type="number"
              min="1"
              max="10"
              value={item.quantity}
              onChange={(e) => onUpdateQuantity(item.id, parseInt(e.target.value) || 1)}
              className="w-16 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={isEditing ? handleFinishEditing : handleStartEditing}
            className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors text-sm"
          >
            {isEditing ? '完了' : '価格編集'}
          </button>
          <button
            onClick={() => onDelete(item.id)}
            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
          >
            削除
          </button>
        </div>
      </div>

      {/* Store Selection */}
      {!isEditing && (
        <div className="space-y-2">
          <label className="text-sm text-gray-400">購入先:</label>
          <select
            value={item.purchaseStoreId || ''}
            onChange={(e) => onSelectStore(item.id, e.target.value || null)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
          >
            <option value="">選択してください</option>
            {stores.map((store) => {
              const price = item.prices.find((p) => p.storeId === store.id);
              const priceText =
                price?.price !== null && price?.price !== undefined
                  ? `¥${price.price.toLocaleString()}`
                  : '在庫なし';
              return (
                <option key={store.id} value={store.id} disabled={price?.price === null}>
                  {store.name} - {priceText}
                </option>
              );
            })}
          </select>
          {selectedStore && selectedPrice && selectedPrice.price !== null && (
            <div className="flex justify-between items-center p-2 bg-gray-700 rounded">
              <span className="text-sm" style={{ color: selectedStore.color }}>
                {selectedStore.name}
              </span>
              <span className="font-medium text-white">
                ¥{(selectedPrice.price * item.quantity).toLocaleString()}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Price Editing */}
      {isEditing && (
        <div className="space-y-2">
          <label className="text-sm text-gray-400">各ショップの価格:</label>
          {stores.map((store) => {
            const localPrice = localPrices[store.id];
            return (
              <div key={store.id} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: store.color }}
                ></div>
                <span className="text-sm text-white flex-1">{store.name}</span>
                <input
                  type="number"
                  min="0"
                  placeholder="在庫なし"
                  value={localPrice ?? ''}
                  onChange={(e) =>
                    setLocalPrices({
                      ...localPrices,
                      [store.id]: e.target.value ? parseInt(e.target.value) : null,
                    })
                  }
                  className="w-24 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                />
                <span className="text-sm text-gray-400">円</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
