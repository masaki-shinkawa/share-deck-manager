'use client';

import type { CardItem, Store } from '@/app/lib/types';

interface TotalSummaryProps {
  items: CardItem[];
  stores: Store[];
  optimalTotal: number;
  optimalStoreTotals: { store: Store; total: number }[];
}

export function TotalSummary({ items, stores, optimalTotal, optimalStoreTotals }: TotalSummaryProps) {
  // Calculate current total (selected items)
  const currentTotal = items.reduce((sum, item) => {
    if (item.purchaseStoreId) {
      const price = item.prices.find((p) => p.storeId === item.purchaseStoreId);
      if (price?.price) {
        return sum + price.price * item.quantity;
      }
    }
    return sum;
  }, 0);

  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-4 sticky bottom-0">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-white">最適合計金額</h3>
        <span className="text-2xl font-bold text-white">
          ¥{optimalTotal.toLocaleString()}
        </span>
      </div>

      {optimalStoreTotals.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm text-gray-400">ショップ別内訳</h4>
          {optimalStoreTotals.map(({ store, total }) => (
            <div key={store.id} className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: store.color }}
                ></div>
                <span className="text-sm text-white">{store.name}</span>
              </div>
              <span className="text-sm font-medium text-white">
                ¥{total.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
