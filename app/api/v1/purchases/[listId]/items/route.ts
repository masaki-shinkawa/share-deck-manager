import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { withAuth, ApiError } from "@/app/lib/auth";

type Params = { params: Promise<{ listId: string }> };

// GET /api/v1/purchases/[listId]/items - アイテム一覧
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

    // アイテム取得（カード情報、価格エントリ、割り当て情報を含む）
    const items = await prisma.purchaseItem.findMany({
      where: { listId },
      include: {
        card: true,
        customCard: true,
        priceEntries: {
          include: {
            store: true,
          },
          orderBy: { updatedAt: "desc" },
        },
        allocations: {
          include: {
            store: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // レスポンス形式を整形
    return items.map((item) => ({
      id: item.id,
      listId: item.listId,
      cardId: item.cardId,
      customCardId: item.customCardId,
      quantity: item.quantity,
      createdAt: item.createdAt,
      cardName: item.card?.name ?? item.customCard?.name ?? null,
      cardColor: item.card?.color ?? item.customCard?.color1 ?? null,
      cardImagePath: item.card?.imagePath ?? null,
      priceEntries: item.priceEntries.map((pe) => ({
        id: pe.id,
        itemId: pe.itemId,
        storeId: pe.storeId,
        price: pe.price,
        updatedAt: pe.updatedAt,
      })),
      allocations: item.allocations.map((alloc) => ({
        id: alloc.id,
        storeId: alloc.storeId,
        storeName: alloc.store.name,
        storeColor: alloc.store.color,
        quantity: alloc.quantity,
      })),
    }));
  });
}

// POST /api/v1/purchases/[listId]/items - アイテム追加
export async function POST(request: Request, { params }: Params) {
  const { listId } = await params;
  return withAuth(request, async (user) => {
    const body = await request.json();
    const { cardId, customCardId, quantity = 1 } = body;

    // 数量のバリデーション
    if (typeof quantity !== 'number' || quantity < 1 || quantity > 99) {
      throw new ApiError(400, "Quantity must be between 1 and 99");
    }

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

    // カード存在チェック
    if (cardId) {
      const card = await prisma.card.findUnique({ where: { id: cardId } });
      if (!card) {
        throw new ApiError(404, "Card not found");
      }
    }

    if (customCardId) {
      const customCard = await prisma.customCard.findFirst({
        where: {
          id: customCardId,
          userId: user.id,
        },
      });
      if (!customCard) {
        throw new ApiError(404, "Custom card not found");
      }
    }

    // アイテム作成
    const item = await prisma.purchaseItem.create({
      data: {
        listId,
        cardId,
        customCardId,
        quantity,
      },
    });

    // ユーザーの全ストアにNULL価格エントリを自動作成
    const userStores = await prisma.store.findMany({
      where: { userId: user.id },
    });

    if (userStores.length > 0) {
      await prisma.priceEntry.createMany({
        data: userStores.map((store) => ({
          itemId: item.id,
          storeId: store.id,
          price: null,
        })),
      });
    }

    return item;
  });
}
