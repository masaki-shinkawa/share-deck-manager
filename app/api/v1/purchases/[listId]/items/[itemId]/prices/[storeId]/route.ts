import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { withAuth, ApiError } from "@/app/lib/auth";

type Params = { params: Promise<{ listId: string; itemId: string; storeId: string }> };

// PUT /api/v1/purchases/[listId]/items/[itemId]/prices/[storeId] - 価格更新（なければ作成）
export async function PUT(request: Request, { params }: Params) {
  const { listId, itemId, storeId } = await params;
  return withAuth(request, async (user) => {
    const body = await request.json();
    const { price } = body;

    // アイテム所有者チェック
    const item = await prisma.purchaseItem.findFirst({
      where: {
        id: itemId,
        listId,
        list: {
          userId: user.id,
        },
      },
    });

    if (!item) {
      throw new ApiError(404, "Purchase item not found");
    }

    // ストア所有者チェック
    const store = await prisma.store.findFirst({
      where: {
        id: storeId,
        userId: user.id,
      },
    });

    if (!store) {
      throw new ApiError(404, "Store not found");
    }

    // 価格エントリをupsert
    const priceEntry = await prisma.priceEntry.upsert({
      where: {
        itemId_storeId: {
          itemId,
          storeId,
        },
      },
      update: {
        price,
      },
      create: {
        itemId,
        storeId,
        price,
      },
    });

    return priceEntry;
  });
}

// DELETE /api/v1/purchases/[listId]/items/[itemId]/prices/[storeId] - 価格削除
export async function DELETE(request: Request, { params }: Params) {
  const { listId, itemId, storeId } = await params;
  return withAuth(request, async (user) => {
    // アイテム所有者チェック
    const item = await prisma.purchaseItem.findFirst({
      where: {
        id: itemId,
        listId,
        list: {
          userId: user.id,
        },
      },
    });

    if (!item) {
      throw new ApiError(404, "Purchase item not found");
    }

    const priceEntry = await prisma.priceEntry.findFirst({
      where: {
        itemId,
        storeId,
      },
    });

    if (!priceEntry) {
      throw new ApiError(404, "Price entry not found");
    }

    await prisma.priceEntry.delete({
      where: { id: priceEntry.id },
    });

    return { success: true };
  });
}
