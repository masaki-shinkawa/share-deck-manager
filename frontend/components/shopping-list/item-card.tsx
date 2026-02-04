'use client';

import { useState, useEffect } from 'react';
import type { CardItem, Store } from '@/lib/types';

interface ItemCardProps {
  item: CardItem;
  stores: Store[];
  onUpdatePrice: (itemId: string, storeId: string, price: number | null) => void;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onAddAllocation: (itemId: string, storeId: string, quantity: number) => void;
  onUpdateAllocation: (allocationId: string, quantity: number) => void;
  onDeleteAllocation: (allocationId: string) => void;
  onDelete: (itemId: string) => void;
}

interface QuantityInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: number;
  onCommit: (value: number) => void;
  min?: number;
}

function QuantityInput({ value, onCommit, min = 1, className, ...props }: QuantityInputProps) {
  const [localValue, setLocalValue] = useState<string>(value.toString());
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    // Only sync with external value when not focused and value actually changed
    if (!isFocused && localValue !== value.toString()) {
      setLocalValue(value.toString());
    }
  }, [value, isFocused, localValue]);

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    const parsed = parseInt(localValue);
    const newValue = isNaN(parsed) ? min : parsed;

    // Update local value immediately to prevent flicker
    setLocalValue(newValue.toString());

    if (newValue !== value) {
      onCommit(newValue);
    }

    // Set isFocused to false after all updates
    setIsFocused(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value);
  };

  return (
    <input
      type="number"
      min={min}
      value={localValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={className}
      {...props}
    />
  );
}

export function ItemCard({
  item,
  stores,
  onUpdatePrice,
  onUpdateQuantity,
  onAddAllocation,
  onUpdateAllocation,
  onDeleteAllocation,
  onDelete,
}: ItemCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [localPrices, setLocalPrices] = useState<Record<string, number | null>>({});

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
    const updatePromises: Promise<void>[] = [];

    Object.entries(localPrices).forEach(([storeId, price]) => {
      const originalPrice = item.prices.find((p) => p.storeId === storeId)?.price;
      if (price !== originalPrice) {
        updatePromises.push(
          Promise.resolve(onUpdatePrice(item.id, storeId, price))
        );
      }
    });

    await Promise.all(updatePromises);
    setIsEditing(false);
  };

  // Calculate remaining quantity
  const allocatedTotal = item.allocations.reduce((sum, alloc) => sum + alloc.quantity, 0);
  const remainingQuantity = item.quantity - allocatedTotal;

  // Get available stores (not yet allocated)
  const availableStores = stores.filter(
    (store) => !item.allocations.some((alloc) => alloc.storeId === store.id)
  );

  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-3">
      {/* Card Name and Actions */}
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="font-medium text-lg text-white">{item.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-gray-400">必要枚数:</span>
            <QuantityInput
              min={1}
              max={10}
              value={item.quantity}
              onCommit={(val) => onUpdateQuantity(item.id, val)}
              className="w-16 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
            />
            {remainingQuantity > 0 && (
              <span className="text-sm text-yellow-400">
                (残り {remainingQuantity}枚)
              </span>
            )}
            {remainingQuantity < 0 && (
              <span className="text-sm text-red-400">
                (超過 {Math.abs(remainingQuantity)}枚)
              </span>
            )}
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

      {/* Price Editing Mode */}
      {isEditing && (
        <div className="space-y-2 border-t border-gray-700 pt-3">
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

      {/* Allocations Display (Normal Mode) */}
      {!isEditing && (
        <div className="space-y-2 border-t border-gray-700 pt-3">
          <label className="text-sm text-gray-400">購入先:</label>
          {item.allocations.length === 0 ? (
            <p className="text-sm text-gray-500">購入先が未設定です</p>
          ) : (
            <div className="space-y-2">
              {item.allocations.map((alloc) => {
                const price = item.prices.find((p) => p.storeId === alloc.storeId);
                const pricePerUnit = price?.price ?? null;
                const subtotal = pricePerUnit !== null ? pricePerUnit * alloc.quantity : null;

                return (
                  <div key={alloc.id} className="flex items-center gap-2 bg-gray-700 p-2 rounded">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: alloc.storeColor }}
                    ></div>
                    <span className="text-sm text-white flex-1">{alloc.storeName}</span>
                    <QuantityInput
                      min={0}
                      max={item.quantity}
                      value={alloc.quantity}
                      onCommit={(val) => {
                        if (val <= 0) {
                          onDeleteAllocation(alloc.id);
                        } else {
                          onUpdateAllocation(alloc.id, val);
                        }
                      }}
                      className="w-12 px-1 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm text-center"
                    />
                    <span className="text-sm text-white min-w-[60px] text-right">
                      {subtotal !== null ? `¥${subtotal}` : '－'}
                    </span>
                    <button
                      onClick={() => onDeleteAllocation(alloc.id)}
                      className="text-red-400 hover:text-red-300 text-sm"
                      title="削除"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add Allocation */}
          {availableStores.length > 0 && remainingQuantity > 0 && (
            <div className="flex items-center gap-2">
              <select
                className="flex-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                onChange={(e) => {
                  if (e.target.value) {
                    const quantity = Math.min(remainingQuantity, 1);
                    onAddAllocation(item.id, e.target.value, quantity);
                    e.target.value = ''; // Reset selection
                  }
                }}
              >
                <option value="">+ 購入先を追加</option>
                {availableStores.map((store) => {
                  const price = item.prices.find((p) => p.storeId === store.id);
                  const priceText =
                    price?.price !== null && price?.price !== undefined
                      ? `¥${price.price}`
                      : '在庫なし';
                  return (
                    <option
                      key={store.id}
                      value={store.id}
                      disabled={price?.price === null}
                    >
                      {store.name} - {priceText}
                    </option>
                  );
                })}
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
