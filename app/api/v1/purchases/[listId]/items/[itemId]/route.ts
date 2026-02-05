import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { withAuth, ApiError } from "@/app/lib/auth";

type Params = { params: Promise<{ listId: string; itemId: string }> };

// PATCH /api/v1/purchases/[listId]/items/[itemId] - アイテム更新
export async function PATCH(request: Request, { params }: Params) {
  const { listId, itemId } = await params;
  return withAuth(request, async (user) => {
    const body = await request.json();
    const { quantity } = body;

    // 数量のバリデーション
    if (quantity !== undefined) {
      if (typeof quantity !== 'number' || quantity < 1 || quantity > 99) {
        throw new ApiError(400, "Quantity must be between 1 and 99");
      }
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

    // アイテム存在チェック
    const item = await prisma.purchaseItem.findFirst({
      where: {
        id: itemId,
        listId,
      },
    });

    if (!item) {
      throw new ApiError(404, "Purchase item not found");
    }

    const updatedItem = await prisma.purchaseItem.update({
      where: { id: itemId },
      data: {
        ...(quantity !== undefined && { quantity }),
      },
    });

    return updatedItem;
  });
}

// DELETE /api/v1/purchases/[listId]/items/[itemId] - アイテム削除
export async function DELETE(request: Request, { params }: Params) {
  const { listId, itemId } = await params;
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

    // アイテム存在チェック
    const item = await prisma.purchaseItem.findFirst({
      where: {
        id: itemId,
        listId,
      },
    });

    if (!item) {
      throw new ApiError(404, "Purchase item not found");
    }

    await prisma.purchaseItem.delete({
      where: { id: itemId },
    });

    return { success: true };
  });
}
