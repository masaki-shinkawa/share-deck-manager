'use client';

import type { CardItem, Store } from '@/lib/types';

interface TotalSummaryProps {
  items: CardItem[];
  stores: Store[];
}

export function TotalSummary({ items, stores }: TotalSummaryProps) {
  // Calculate total from allocations
  const calculateTotals = () => {
    let totalPrice = 0;
    const storeTotalsMap = new Map<string, number>();
    const storeItemsMap = new Map<
      string,
      { name: string; quantity: number; price: number }[]
    >();

    items.forEach((item) => {
      item.allocations.forEach((allocation) => {
        const price = item.prices.find((p) => p.storeId === allocation.storeId);
        if (price?.price !== null && price?.price !== undefined) {
          const itemTotal = price.price * allocation.quantity;
          totalPrice += itemTotal;

          const currentTotal = storeTotalsMap.get(allocation.storeId) || 0;
          storeTotalsMap.set(allocation.storeId, currentTotal + itemTotal);

          const currentItems = storeItemsMap.get(allocation.storeId) || [];
          currentItems.push({
            name: item.name,
            quantity: allocation.quantity,
            price: price.price,
          });
          storeItemsMap.set(allocation.storeId, currentItems);
        }
      });
    });

    const storeTotalsArray = stores
      .map((store) => ({
        store,
        total: storeTotalsMap.get(store.id) || 0,
        items: storeItemsMap.get(store.id) || [],
      }))
      .filter((st) => st.total > 0);

    return { totalPrice, storeTotalsArray };
  };

  const { totalPrice, storeTotalsArray } = calculateTotals();

  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-4 sticky bottom-0">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-white">選択中の合計金額</h3>
        <span className="text-2xl font-bold text-white">
          ¥{totalPrice.toLocaleString()}
        </span>
      </div>

      {storeTotalsArray.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm text-gray-400">ショップ別内訳</h4>
          {storeTotalsArray.map(({ store, total, items: storeItems }) => (
            <div key={store.id} className="bg-gray-700/50 rounded-lg p-3 space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: store.color }}
                  ></div>
                  <span className="text-sm font-semibold text-white">{store.name}</span>
                </div>
                <span className="text-sm font-bold text-white">
                  ¥{total.toLocaleString()}
                </span>
              </div>

              {storeItems.length > 0 && (
                <div className="pl-5 space-y-1 border-l-2 border-gray-600">
                  {storeItems.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs">
                      <span className="text-gray-300">
                        {item.name} × {item.quantity}
                      </span>
                      <span className="text-gray-400">
                        ¥{(item.price * item.quantity).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
