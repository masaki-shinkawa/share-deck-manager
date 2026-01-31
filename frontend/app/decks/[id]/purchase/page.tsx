'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ShoppingCart, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import {
  storesApi,
  purchaseListsApi,
  purchaseItemsApi,
  pricesApi,
  optimalPlanApi,
  type Store as ApiStore,
  type PurchaseList,
  type PurchaseItemWithCard,
} from '@/app/lib/api/purchases';
import { customCardsApi } from '@/app/lib/api/custom-cards';
import type { CardItem, Store, OptimalPurchase } from '@/app/lib/types';
import { Header } from '@/app/components/shopping-list/header';
import { StoreTabs } from '@/app/components/shopping-list/store-tabs';
import { ItemCard } from '@/app/components/shopping-list/item-card';
import { AddItemForm } from '@/app/components/shopping-list/add-item-form';
import { AddStoreDialog } from '@/app/components/shopping-list/add-store-dialog';
import { TotalSummary } from '@/app/components/shopping-list/total-summary';
import { Breadcrumb, BreadcrumbItem } from '@/app/components/Breadcrumb';

interface DeckInfo {
  id: string;
  name: string;
  description?: string;
  status: string;
}

export default function DeckPurchasePage() {
  const router = useRouter();
  const params = useParams();
  const deckId = params.id as string;
  const { data: session, status } = useSession();

  const [deck, setDeck] = useState<DeckInfo | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [purchaseList, setPurchaseList] = useState<PurchaseList | null>(null);
  const [items, setItems] = useState<CardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddStore, setShowAddStore] = useState(false);

  // Load deck info
  useEffect(() => {
    if (status === 'authenticated' && session?.idToken && deckId) {
      loadDeckInfo();
      loadData();
    } else if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, session, deckId]);

  async function loadDeckInfo() {
    const token = session?.idToken;
    if (!token) return;

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/decks/${deckId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to load deck');
      }

      const deckData = await response.json();
      setDeck(deckData);
    } catch (err) {
      console.error('Error loading deck:', err);
      setError(err instanceof Error ? err.message : 'Failed to load deck');
    }
  }

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
        const priceEntry = apiItem.prices?.find((p) => p.store_id === store.id);
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
    const token = session?.idToken;
    if (!token) {
      setError('Not authenticated');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Load stores
      const storesData = await storesApi.list(token);
      setStores(convertToStores(storesData));

      // Get or create deck-specific purchase list
      const lists = await purchaseListsApi.list(deckId, token);
      let list = lists[0]; // Should have at most one list per deck

      if (!list) {
        // Create new list for this deck
        list = await purchaseListsApi.create(
          {
            deck_id: deckId,
            name: `${deck?.name || 'Deck'} Purchase List`,
            status: 'planning',
          },
          token
        );
      }

      setPurchaseList(list);

      // Load items
      const itemsData = await purchaseItemsApi.list(list.id, token);
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
    const token = session?.idToken;
    if (!token) return;

    try {
      await storesApi.create({ name, color }, token);
      await loadData();
    } catch (err) {
      alert('Failed to add store: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  }

  // Remove store
  async function handleRemoveStore(storeId: string) {
    const token = session?.idToken;
    if (!token || stores.length <= 1) return;

    if (!confirm('このショップを削除しますか?')) return;

    try {
      await storesApi.delete(storeId, token);
      await loadData();
    } catch (err) {
      alert('Failed to remove store: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  }

  // Add item
  async function handleAddItem(name: string, quantity: number) {
    const token = session?.idToken;
    if (!token || !purchaseList) return;

    try {
      // Create custom card first
      const customCard = await customCardsApi.create(
        { name, color1: '赤' }, // Default color
        token
      );

      // Create purchase item with the new custom_card_id
      await purchaseItemsApi.create(
        purchaseList.id,
        {
          custom_card_id: customCard.id,
          quantity,
        },
        token
      );

      await loadData();
    } catch (err) {
      alert('Failed to add item: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  }

  // Select store for item
  async function handleSelectStore(itemId: string, storeId: string | null) {
    const token = session?.idToken;
    if (!token || !purchaseList) return;

    try {
      await purchaseItemsApi.update(
        purchaseList.id,
        itemId,
        { selected_store_id: storeId },
        token
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
    const token = session?.idToken;
    if (!token) return;

    try {
      await pricesApi.update(itemId, storeId, { price }, token);
      // Update local state
      setItems((prev) =>
        prev.map((item) => {
          if (item.id !== itemId) return item;
          return {
            ...item,
            prices: item.prices.map((p) => (p.storeId === storeId ? { ...p, price } : p)),
          };
        })
      );
    } catch (err) {
      alert('Failed to update price: ' + (err instanceof Error ? err.message : 'Unknown error'));
      await loadData(); // Reload on error
    }
  }

  // Update quantity
  async function handleUpdateQuantity(itemId: string, quantity: number) {
    const token = session?.idToken;
    if (!token || !purchaseList) return;

    try {
      await purchaseItemsApi.update(purchaseList.id, itemId, { quantity }, token);
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
    const token = session?.idToken;
    if (!token || !purchaseList) return;

    if (!confirm('このアイテムを削除しますか?')) return;

    try {
      await purchaseItemsApi.delete(purchaseList.id, itemId, token);
      setItems((prev) => prev.filter((item) => item.id !== itemId));
    } catch (err) {
      alert('Failed to delete item: ' + (err instanceof Error ? err.message : 'Unknown error'));
      await loadData(); // Reload on error
    }
  }

  // Apply optimal plan
  async function handleApplyOptimal(optimal: OptimalPurchase) {
    const token = session?.idToken;
    if (!token || !purchaseList) return;

    try {
      // Update each item's selected store
      for (const plan of optimal.plans) {
        for (const cardId of plan.cardIds) {
          await purchaseItemsApi.update(
            purchaseList.id,
            cardId,
            { selected_store_id: plan.storeId },
            token
          );
        }
      }
      await loadData();
    } catch (err) {
      alert('Failed to apply optimal plan: ' + (err instanceof Error ? err.message : 'Unknown error'));
      await loadData(); // Reload on error
    }
  }

  const selectedCount = items.filter((item) => item.purchaseStoreId !== null).length;

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <div className="text-lg font-medium text-white">購入データを読み込み中...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <div className="text-lg font-medium text-red-600">エラー: {error}</div>
          <Link href={`/decks/${deckId}`}>
            <button className="mt-4 px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700">
              デッキページに戻る
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 max-w-md mx-auto">
      {/* Breadcrumb Navigation */}
      <div className="p-4 bg-gray-800">
        <Breadcrumb>
          <BreadcrumbItem href="/decks">デッキ一覧</BreadcrumbItem>
          {deck && <BreadcrumbItem href={`/decks/${deckId}`}>{deck.name}</BreadcrumbItem>}
          <BreadcrumbItem>購入リスト</BreadcrumbItem>
        </Breadcrumb>

        {/* Deck Info */}
        {deck && (
          <div className="mt-4 bg-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-xl font-bold text-white flex items-center">
                <ShoppingCart className="w-5 h-5 mr-2" />
                {deck.name}
              </h1>
              <span
                className={`px-2 py-1 text-xs rounded ${
                  deck.status === 'active'
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-gray-500/20 text-gray-400'
                }`}
              >
                {deck.status === 'active' ? 'アクティブ' : '非アクティブ'}
              </span>
            </div>
            {deck.description && (
              <p className="text-sm text-gray-400 mt-2">{deck.description}</p>
            )}
          </div>
        )}
      </div>

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
            <TotalSummary items={items} stores={stores} onApplyOptimal={handleApplyOptimal} />
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
