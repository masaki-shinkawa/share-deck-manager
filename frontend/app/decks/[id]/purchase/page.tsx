'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  storesApi,
  purchaseListsApi,
  purchaseItemsApi,
  pricesApi,
  optimalPlanApi,
  type Store,
  type PurchaseList,
  type PurchaseItemWithCard,
  type OptimalPurchasePlan,
} from '@/app/lib/api/purchases';

export default function PurchasePage() {
  const params = useParams();
  const router = useRouter();
  const deckId = params.id as string;

  const [stores, setStores] = useState<Store[]>([]);
  const [purchaseList, setPurchaseList] = useState<PurchaseList | null>(null);
  const [items, setItems] = useState<PurchaseItemWithCard[]>([]);
  const [optimalPlan, setOptimalPlan] = useState<OptimalPurchasePlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load data
  useEffect(() => {
    loadData();
  }, [deckId]);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      // Load stores
      const storesData = await storesApi.list();
      setStores(storesData);

      // Create or get purchase list for this deck
      const lists = await purchaseListsApi.list();
      let list = lists.find((l) => l.deck_id === deckId);

      if (!list) {
        list = await purchaseListsApi.create({ deck_id: deckId, status: 'planning' });
      }

      setPurchaseList(list);

      // Load items
      const itemsData = await purchaseItemsApi.list(list.id);
      setItems(itemsData);

      // Calculate optimal plan if items exist
      if (itemsData.length > 0) {
        const plan = await optimalPlanApi.calculate(list.id);
        setOptimalPlan(plan);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
      console.error('Error loading purchase data:', err);
    } finally {
      setLoading(false);
    }
  }

  // Add store
  async function handleAddStore(name: string, color: string) {
    try {
      await storesApi.create({ name, color });
      await loadData();
    } catch (err) {
      alert('Failed to add store: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-lg font-medium">Loading purchase data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-lg font-medium text-red-600">Error: {error}</div>
          <button
            onClick={() => router.push('/decks')}
            className="mt-4 px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700"
          >
            Back to Decks
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Card Purchase Management</h1>
          <button
            onClick={() => router.push('/decks')}
            className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700"
          >
            Back to Decks
          </button>
        </div>

        {/* Stores Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold">Stores ({stores.length})</h2>
            <AddStoreButton onAdd={handleAddStore} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {stores.map((store) => (
              <div
                key={store.id}
                className="p-4 bg-gray-800 rounded-lg border-l-4"
                style={{ borderLeftColor: store.color }}
              >
                <div className="font-medium">{store.name}</div>
                <div className="text-sm text-gray-400">
                  Created: {new Date(store.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
          {stores.length === 0 && (
            <div className="text-center text-gray-400 py-8">
              No stores yet. Add your first store to get started!
            </div>
          )}
        </div>

        {/* Items Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Purchase Items ({items.length})</h2>
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.id} className="p-4 bg-gray-800 rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium text-lg">{item.card_name || 'Unknown Card'}</div>
                    <div className="text-sm text-gray-400">Quantity: {item.quantity}</div>
                    {item.card_color && (
                      <div className="text-sm text-gray-400">Color: {item.card_color}</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {items.length === 0 && (
            <div className="text-center text-gray-400 py-8">
              No items in purchase list. Add cards to start planning your purchase!
            </div>
          )}
        </div>

        {/* Optimal Plan Section */}
        {optimalPlan && (
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Optimal Purchase Plan</h2>
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="text-3xl font-bold mb-4">
                Total: ¥{optimalPlan.total_price.toLocaleString()}
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-medium mb-2">Store Summary:</h3>
                {Object.entries(optimalPlan.store_summary).map(([storeName, total]) => (
                  <div key={storeName} className="flex justify-between text-sm">
                    <span>{storeName}</span>
                    <span className="font-medium">¥{total.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Coming Soon Notice */}
        <div className="mt-8 p-6 bg-blue-900 bg-opacity-30 border border-blue-700 rounded-lg">
          <h3 className="text-xl font-semibold mb-2">🚧 Feature In Development</h3>
          <p className="text-gray-300">
            Full purchase management UI is coming soon! This page currently shows basic data.
            Full features including:
          </p>
          <ul className="list-disc list-inside mt-2 text-gray-300 space-y-1">
            <li>Add/edit/delete cards to purchase list</li>
            <li>Set prices for each store</li>
            <li>Apply optimal purchase plan automatically</li>
            <li>Track purchase status</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// Simple Add Store Button Component
function AddStoreButton({ onAdd }: { onAdd: (name: string, color: string) => void }) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#3B82F6');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onAdd(name.trim(), color);
      setName('');
      setColor('#3B82F6');
      setShowForm(false);
    }
  };

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        + Add Store
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Store name"
        className="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
        required
      />
      <input
        type="color"
        value={color}
        onChange={(e) => setColor(e.target.value)}
        className="w-12 h-10 bg-gray-800 border border-gray-700 rounded cursor-pointer"
      />
      <button
        type="submit"
        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
      >
        Save
      </button>
      <button
        type="button"
        onClick={() => setShowForm(false)}
        className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
      >
        Cancel
      </button>
    </form>
  );
}
