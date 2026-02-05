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
    // Allow empty input during editing, default to min on blur if invalid
    const newValue = isNaN(parsed) || parsed < min ? min : Math.min(parsed, props.max as number || 99);

    // Update local value immediately to prevent flicker
    setLocalValue(newValue.toString());

    if (newValue !== value) {
      onCommit(newValue);
    }

    // Set isFocused to false after all updates
    setIsFocused(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow empty string for mobile input (user can delete and retype)
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
  const [localAllocations, setLocalAllocations] = useState<Record<string, number>>({});

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

  // Calculate remaining quantity using local state if available
  const allocatedTotal = item.allocations.reduce((sum, alloc) => {
    const quantity = localAllocations[alloc.id] ?? alloc.quantity;
    return sum + quantity;
  }, 0);
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
              max={99}
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
        <div className="border-t border-gray-700 pt-3">
          <label className="text-sm text-gray-400 mb-2 block">各ショップの価格:</label>
          <div className="overflow-x-auto -mx-4 px-4">
            <div className="flex flex-col gap-3 min-w-max pb-2">
              {stores.map((store) => {
                const localPrice = localPrices[store.id];
                return (
                  <div
                    key={store.id}
                    className="flex items-center gap-2 p-3 bg-gray-700 rounded-lg min-w-[120px]"
                    style={{ borderTop: `3px solid ${store.color}` }}
                  >
                    <span className="text-sm flex-1 text-white text-left font-medium">
                      {store.name}
                    </span>
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
                      className="w-20 px-2 py-2 bg-gray-600 border border-gray-500 rounded text-white text-sm text-center"
                    />
                    <span className="text-xs text-gray-400">円</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Allocations Display (Normal Mode) */}
      {!isEditing && (
        <div className="border-t border-gray-700 pt-3">
          <label className="text-sm text-gray-400 mb-2 block">購入先:</label>
          {item.allocations.length === 0 ? (
            <p className="text-sm text-gray-500">購入先が未設定です</p>
          ) : (
            <div className="overflow-x-auto -mx-4 px-4">
              <div className="flex flex-col gap-3 min-w-max pb-2">
                {item.allocations.map((alloc) => {
                  const price = item.prices.find((p) => p.storeId === alloc.storeId);
                  const pricePerUnit = price?.price ?? null;
                  const currentQuantity = localAllocations[alloc.id] ?? alloc.quantity;
                  const subtotal = pricePerUnit !== null ? pricePerUnit * currentQuantity : null;

                  return (
                    <div
                      key={alloc.id}
                      className="flex w-full items-center gap-2 p-3 bg-gray-700 rounded-lg min-w-[120px] relative"
                      style={{ borderTop: `3px solid ${alloc.storeColor}` }}
                    >
                      <button
                        onClick={() => onDeleteAllocation(alloc.id)}
                        className="absolute top-1 right-1 text-red-400 hover:text-red-300 text-xs w-5 h-5 flex items-center justify-center"
                        title="削除"
                      >
                        ×
                      </button>
                      <span className="text-sm flex-1 text-white text-left font-medium pt-2">
                        {alloc.storeName}
                      </span>
                      <input
                        type="number"
                        min={0}
                        max={item.quantity}
                        value={currentQuantity}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          if (val <= 0) {
                            setLocalAllocations((prev) => {
                              const next = { ...prev };
                              delete next[alloc.id];
                              return next;
                            });
                            onDeleteAllocation(alloc.id);
                          } else if (val <= item.quantity) {
                            setLocalAllocations((prev) => ({ ...prev, [alloc.id]: val }));
                            onUpdateAllocation(alloc.id, val);
                          }
                        }}
                        className="w-20 px-2 py-2 bg-gray-600 border border-gray-500 rounded text-white text-sm text-center"
                      />
                      <span className="text-xs text-gray-400">枚</span>
                      <div className="text-center w-20">
                        <div className="text-base text-white font-semibold">
                          {subtotal !== null ? `¥${subtotal.toLocaleString()}` : '－'}
                        </div>
                        {pricePerUnit !== null && (
                          <div className="text-xs text-gray-400">
                            @¥{pricePerUnit.toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Add Allocation */}
          {availableStores.length > 0 && remainingQuantity > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <select
                className="flex-1 px-2 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
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
                      ? `¥${price.price.toLocaleString()}`
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
