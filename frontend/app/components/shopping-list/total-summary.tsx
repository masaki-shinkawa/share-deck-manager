'use client';

import type { CardItem, Store, OptimalPurchase } from '@/app/lib/types';

interface TotalSummaryProps {
  items: CardItem[];
  stores: Store[];
  onApplyOptimal: (optimal: OptimalPurchase) => void;
}

export function TotalSummary({ items, stores, onApplyOptimal }: TotalSummaryProps) {
  // Calculate current total
  const currentTotal = items.reduce((sum, item) => {
    if (item.purchaseStoreId) {
      const price = item.prices.find((p) => p.storeId === item.purchaseStoreId);
      if (price?.price) {
        return sum + price.price * item.quantity;
      }
    }
    return sum;
  }, 0);

  // Calculate store totals
  const storeTotals = stores.map((store) => {
    const total = items.reduce((sum, item) => {
      if (item.purchaseStoreId === store.id) {
        const price = item.prices.find((p) => p.storeId === store.id);
        if (price?.price) {
          return sum + price.price * item.quantity;
        }
      }
      return sum;
    }, 0);
    return { store, total };
  });

  // Calculate optimal plan
  const calculateOptimal = () => {
    const plans: { storeId: string; cardIds: string[] }[] = [];
    let totalPrice = 0;

    items.forEach((item) => {
      // Find cheapest available price
      const availablePrices = item.prices.filter((p) => p.price !== null && p.price !== undefined);
      if (availablePrices.length === 0) return;

      const cheapest = availablePrices.reduce((min, p) =>
        p.price! < min.price! ? p : min
      );

      totalPrice += cheapest.price! * item.quantity;

      const existingPlan = plans.find((p) => p.storeId === cheapest.storeId);
      if (existingPlan) {
        existingPlan.cardIds.push(item.id);
      } else {
        plans.push({ storeId: cheapest.storeId, cardIds: [item.id] });
      }
    });

    return { plans, totalPrice };
  };

  const handleApplyOptimal = () => {
    const optimal = calculateOptimal();
    onApplyOptimal(optimal);
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-4 sticky bottom-0">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-white">合計金額</h3>
        <span className="text-2xl font-bold text-white">
          ¥{currentTotal.toLocaleString()}
        </span>
      </div>

      {storeTotals.some((st) => st.total > 0) && (
        <div className="space-y-2">
          <h4 className="text-sm text-gray-400">ショップ別内訳</h4>
          {storeTotals
            .filter((st) => st.total > 0)
            .map(({ store, total }) => (
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

      <button
        onClick={handleApplyOptimal}
        className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors font-medium"
      >
        最適プランを適用
      </button>
    </div>
  );
}
