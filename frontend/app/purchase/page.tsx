'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/hooks/useAuth';
import {
  storesApi,
  purchaseListsApi,
  purchaseItemsApi,
  pricesApi,
  optimalPlanApi,
  type Store as ApiStore,
  type PurchaseList,
  type PurchaseItemWithCard,
  type OptimalPurchasePlan,
} from '@/app/lib/api/purchases';
import { customCardsApi } from '@/app/lib/api/custom-cards';
import type { CardItem, Store } from '@/app/lib/types';
import { Header } from '@/app/components/shopping-list/header';
import { StoreTabs } from '@/app/components/shopping-list/store-tabs';
import { ItemCard } from '@/app/components/shopping-list/item-card';
import { AddItemForm } from '@/app/components/shopping-list/add-item-form';
import { AddStoreDialog } from '@/app/components/shopping-list/add-store-dialog';
import { TotalSummary } from '@/app/components/shopping-list/total-summary';

export default function PurchasePage() {
  const router = useRouter();
  const { session, status, isReady, error: authError, idToken } = useAuth();

  const [stores, setStores] = useState<Store[]>([]);
  const [purchaseList, setPurchaseList] = useState<PurchaseList | null>(null);
  const [items, setItems] = useState<CardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddStore, setShowAddStore] = useState(false);
  const [optimalTotal, setOptimalTotal] = useState(0);
  const [optimalStoreTotals, setOptimalStoreTotals] = useState<{ store: Store; total: number }[]>([]);

  // Load data when authenticated
  useEffect(() => {
    if (isReady) {
      loadData();
    }
  }, [isReady]);

  // Calculate optimal plan automatically whenever items or stores change
  useEffect(() => {
    calculateOptimalPlan();
  }, [items, stores]);

  // Convert API data to UI format
  const convertToCardItems = (
    apiItems: PurchaseItemWithCard[],
    apiStores: ApiStore[]
  ): CardItem[] => {
    return apiItems.map((apiItem) => ({
      id: apiItem.id,
      name: apiItem.card_name || '不明なカード',
      quantity: apiItem.quantity,
      prices: apiStores.map((store) => {
        const priceEntry = apiItem.price_entries?.find((p) => p.store_id === store.id);
        return {
          storeId: store.id,
          price: priceEntry?.price ?? null,
        };
      }),
      purchaseStoreId: apiItem.selected_store_id,
    }));
  };

  const convertToStores = (apiStores: ApiStore[]): Store[] => {
    return apiStores.map((s) => ({
      id: s.id,
      name: s.name,
      color: s.color,
    }));
  };

  async function loadData() {
    if (!idToken) {
      setError('認証トークンが見つかりません');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Load stores
      const storesData = await storesApi.list(idToken);
      setStores(convertToStores(storesData));

      // Get or create default purchase list
      const lists = await purchaseListsApi.list(idToken);
      let list = lists.find((l) => l.name === null || l.name === 'Default');

      if (!list) {
        // Create a new default purchase list
        list = await purchaseListsApi.create({ status: 'planning' }, idToken);
      }

      setPurchaseList(list);

      // Load items
      const itemsData = await purchaseItemsApi.list(list.id, idToken);
      console.log('[Load Data] Loaded items with prices:', itemsData);
      setItems(convertToCardItems(itemsData, storesData));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
      console.error('Error loading purchase data:', err);
    } finally {
      setLoading(false);
    }
  }

  // Add store
  async function handleAddStore(name: string, color: string) {
    if (!idToken) return;
    // Already checked idToken above

    try {
      await storesApi.create({ name, color }, idToken);
      await loadData();
    } catch (err) {
      alert('Failed to add store: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  }

  // Remove store
  async function handleRemoveStore(storeId: string) {
    if (!idToken) return;
    if (stores.length <= 1) return;

    if (!confirm('このショップを削除しますか？')) return;

    try {
      await storesApi.delete(storeId, idToken);
      await loadData();
    } catch (err) {
      alert('Failed to remove store: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  }

  // Add item
  async function handleAddItem(name: string, quantity: number) {
    if (!idToken) return;
    if (!purchaseList) return;

    try {
      // Create custom card first
      const customCard = await customCardsApi.create(
        { name, color1: '赤' }, // Default color
        idToken
      );

      // Create purchase item with the new custom_card_id
      await purchaseItemsApi.create(
        purchaseList.id,
        {
          custom_card_id: customCard.id,
          quantity,
        },
        idToken
      );

      await loadData();
    } catch (err) {
      alert('Failed to add item: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  }

  // Select store for item
  async function handleSelectStore(itemId: string, storeId: string | null) {
    if (!idToken) return;
    if (!purchaseList) return;

    try {
      await purchaseItemsApi.update(
        purchaseList.id,
        itemId,
        { selected_store_id: storeId },
        idToken
      );
      // Update local state immediately for better UX
      setItems((prev) =>
        prev.map((item) => (item.id === itemId ? { ...item, purchaseStoreId: storeId } : item))
      );
    } catch (err) {
      alert('Failed to select store: ' + (err instanceof Error ? err.message : 'Unknown error'));
      await loadData(); // Reload on error
    }
  }

  // Update price
  async function handleUpdatePrice(itemId: string, storeId: string, price: number | null) {
    if (!idToken) return;
    // Already checked idToken above

    try {
      console.log('[Price Update] Sending to API:', { itemId, storeId, price });
      await pricesApi.update(itemId, storeId, { price }, idToken);
      console.log('[Price Update] Successfully saved to database');

      // Update local state
      setItems((prev) =>
        prev.map((item) => {
          if (item.id !== itemId) return item;
          return {
            ...item,
            prices: item.prices.map((p) =>
              p.storeId === storeId ? { ...p, price } : p
            ),
          };
        })
      );
    } catch (err) {
      console.error('[Price Update] Error:', err);
      alert('Failed to update price: ' + (err instanceof Error ? err.message : 'Unknown error'));
      await loadData(); // Reload on error
    }
  }

  // Update quantity
  async function handleUpdateQuantity(itemId: string, quantity: number) {
    if (!idToken) return;
    if (!purchaseList) return;

    try {
      await purchaseItemsApi.update(purchaseList.id, itemId, { quantity }, idToken);
      // Update local state
      setItems((prev) =>
        prev.map((item) => (item.id === itemId ? { ...item, quantity } : item))
      );
    } catch (err) {
      alert('Failed to update quantity: ' + (err instanceof Error ? err.message : 'Unknown error'));
      await loadData(); // Reload on error
    }
  }

  // Delete item
  async function handleDeleteItem(itemId: string) {
    if (!idToken) return;
    if (!purchaseList) return;

    if (!confirm('このアイテムを削除しますか？')) return;

    try {
      await purchaseItemsApi.delete(purchaseList.id, itemId, idToken);
      setItems((prev) => prev.filter((item) => item.id !== itemId));
    } catch (err) {
      alert('Failed to delete item: ' + (err instanceof Error ? err.message : 'Unknown error'));
      await loadData(); // Reload on error
    }
  }

  // Calculate optimal plan (client-side greedy algorithm)
  function calculateOptimalPlan() {
    if (items.length === 0 || stores.length === 0) {
      setOptimalTotal(0);
      setOptimalStoreTotals([]);
      return;
    }

    let totalPrice = 0;
    const storeTotalsMap = new Map<string, number>();

    items.forEach((item) => {
      // Find cheapest available price
      const availablePrices = item.prices.filter((p) => p.price !== null && p.price !== undefined);
      if (availablePrices.length === 0) return;

      const cheapest = availablePrices.reduce((min, p) =>
        p.price! < min.price! ? p : min
      );

      const itemTotal = cheapest.price! * item.quantity;
      totalPrice += itemTotal;

      const currentTotal = storeTotalsMap.get(cheapest.storeId) || 0;
      storeTotalsMap.set(cheapest.storeId, currentTotal + itemTotal);
    });

    setOptimalTotal(totalPrice);

    const storeTotalsArray = stores
      .map((store) => ({
        store,
        total: storeTotalsMap.get(store.id) || 0,
      }))
      .filter((st) => st.total > 0);

    setOptimalStoreTotals(storeTotalsArray);
  }

  const selectedCount = items.filter((item) => item.purchaseStoreId !== null).length;

  // Show loading state while authenticating or loading data
  if (status === 'loading' || (isReady && loading)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <div className="text-lg font-medium text-white">購入データを読み込み中...</div>
        </div>
      </div>
    );
  }

  // Show error state for authentication or data loading errors
  if (authError || error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <div className="text-lg font-medium text-red-600">エラー: {authError || error}</div>
          <button
            onClick={() => router.push('/')}
            className="mt-4 px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700"
          >
            ダッシュボードに戻る
          </button>
        </div>
      </div>
    );
  }

  // Don't render until authentication is ready
  if (!isReady) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-900 max-w-md mx-auto">
      <Header cardCount={items.length} selectedCount={selectedCount} />
      <StoreTabs
        stores={stores}
        onAddStore={() => setShowAddStore(true)}
        onRemoveStore={handleRemoveStore}
      />

      <main className="p-4 pb-8 space-y-4">
        <AddItemForm onAdd={handleAddItem} />

        {items.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p>カードがありません</p>
            <p className="text-sm mt-1">上のボタンから追加しましょう</p>
          </div>
        ) : (
          <>
            {items.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                stores={stores}
                onSelectStore={handleSelectStore}
                onUpdatePrice={handleUpdatePrice}
                onUpdateQuantity={handleUpdateQuantity}
                onDelete={handleDeleteItem}
              />
            ))}
            <TotalSummary
              items={items}
              stores={stores}
              optimalTotal={optimalTotal}
              optimalStoreTotals={optimalStoreTotals}
            />
          </>
        )}
      </main>

      <AddStoreDialog
        open={showAddStore}
        onOpenChange={setShowAddStore}
        onAdd={handleAddStore}
      />
    </div>
  );
}
