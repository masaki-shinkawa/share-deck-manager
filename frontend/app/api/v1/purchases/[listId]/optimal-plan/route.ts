import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { withAuth, ApiError } from "@/app/lib/auth";

type Params = { params: Promise<{ listId: string }> };

// GET /api/v1/purchases/[listId]/optimal-plan - 最適購入プラン計算
export async function GET(request: Request, { params }: Params) {
  const { listId } = await params;
  return withAuth(request, async (user) => {
    // リスト所有者チェック
    const list = await prisma.purchaseList.findFirst({
      where: {
        id: listId,
        userId: user.id,
      },
    });

    if (!list) {
      throw new ApiError(404, "Purchase list not found");
    }

    // アイテムと関連データを取得
    const items = await prisma.purchaseItem.findMany({
      where: { listId },
      include: {
        card: true,
        customCard: true,
        priceEntries: true,
      },
    });

    if (items.length === 0) {
      return {
        totalPrice: 0,
        items: [],
        storeSummary: {},
      };
    }

    // ユーザーのストアを取得（作成順でタイブレーク用）
    const stores = await prisma.store.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
    });

    const storeMap = new Map(stores.map((s) => [s.id, s]));
    const storeOrder = new Map(stores.map((s, i) => [s.id, i]));

    // Greedyアルゴリズム: 各アイテムに対して最安ストアを選択
    let totalPrice = 0;
    const itemsResult: any[] = [];
    const storeTotals: Record<string, number> = {};

    for (const item of items) {
      const cardName =
        item.card?.name ?? item.customCard?.name ?? "Unknown";

      // 在庫あり（price !== null）の価格のみ
      const availablePrices = item.priceEntries.filter(
        (pe) => pe.price !== null
      );

      if (availablePrices.length === 0) {
        // 全て在庫切れ
        itemsResult.push({
          itemId: item.id,
          cardName,
          quantity: item.quantity,
          selectedStore: null,
          selectedStoreId: null,
          unitPrice: null,
          subtotal: null,
          status: "out_of_stock",
        });
        continue;
      }

      // 最安ストアを選択（同価格の場合は作成順が早いストア）
      const cheapest = availablePrices.reduce((min, pe) => {
        const minOrder = storeOrder.get(min.storeId) ?? Infinity;
        const peOrder = storeOrder.get(pe.storeId) ?? Infinity;

        if (pe.price! < min.price!) return pe;
        if (pe.price === min.price && peOrder < minOrder) return pe;
        return min;
      });

      const store = storeMap.get(cheapest.storeId);
      const unitPrice = cheapest.price!;
      const subtotal = unitPrice * item.quantity;

      totalPrice += subtotal;

      if (store) {
        storeTotals[store.name] = (storeTotals[store.name] ?? 0) + subtotal;
      }

      itemsResult.push({
        itemId: item.id,
        cardName,
        quantity: item.quantity,
        selectedStore: store?.name ?? null,
        selectedStoreId: cheapest.storeId,
        unitPrice,
        subtotal,
        status: "available",
      });
    }

    return {
      totalPrice,
      items: itemsResult,
      storeSummary: storeTotals,
    };
  });
}
