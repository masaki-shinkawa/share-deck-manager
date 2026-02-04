import type { Store } from '@/lib/types';

interface StoreTabsProps {
  stores: Store[];
  onAddStore: () => void;
  onRemoveStore: (storeId: string) => void;
}

export function StoreTabs({ stores, onAddStore, onRemoveStore }: StoreTabsProps) {
  return (
    <div className="bg-gray-800 border-b border-gray-700 overflow-x-auto">
      <div className="flex p-2 gap-2 min-w-max">
        {stores.map((store) => (
          <div
            key={store.id}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-700 text-white text-sm whitespace-nowrap"
            style={{ borderLeft: `4px solid ${store.color}` }}
          >
            <span>{store.name}</span>
            <button
              onClick={() => onRemoveStore(store.id)}
              className="text-gray-400 hover:text-red-500 transition-colors"
              title="ショップを削除"
            >
              ×
            </button>
          </div>
        ))}
        <button
          onClick={onAddStore}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm whitespace-nowrap"
        >
          + ショップ追加
        </button>
      </div>
    </div>
  );
}
