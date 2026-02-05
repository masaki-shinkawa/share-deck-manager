import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { withAuth, ApiError } from "@/app/lib/auth";

type Params = { params: Promise<{ itemId: string }> };

// GET /api/v1/purchases/items/[itemId]/allocations - 割り当て一覧
export async function GET(request: Request, { params }: Params) {
  const { itemId } = await params;
  return withAuth(request, async (user) => {
    // アイテム所有者チェック
    const item = await prisma.purchaseItem.findFirst({
      where: {
        id: itemId,
        list: {
          userId: user.id,
        },
      },
    });

    if (!item) {
      throw new ApiError(404, "Purchase item not found");
    }

    const allocations = await prisma.purchaseAllocation.findMany({
      where: { itemId },
      include: {
        store: true,
      },
    });

    return allocations.map((alloc) => ({
      id: alloc.id,
      itemId: alloc.itemId,
      storeId: alloc.storeId,
      quantity: alloc.quantity,
      storeName: alloc.store.name,
      storeColor: alloc.store.color,
    }));
  });
}

// POST /api/v1/purchases/items/[itemId]/allocations - 割り当て作成
export async function POST(request: Request, { params }: Params) {
  const { itemId } = await params;
  return withAuth(request, async (user) => {
    const body = await request.json();
    const { storeId, quantity } = body;

    // アイテム所有者チェック
    const item = await prisma.purchaseItem.findFirst({
      where: {
        id: itemId,
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

    // 既存の割り当てチェック
    const existing = await prisma.purchaseAllocation.findFirst({
      where: {
        itemId,
        storeId: storeId,
      },
    });

    if (existing) {
      throw new ApiError(400, "Allocation for this store already exists. Please update instead.");
    }

    const allocation = await prisma.purchaseAllocation.create({
      data: {
        itemId,
        storeId: storeId,
        quantity,
      },
      include: {
        store: true,
      },
    });

    return {
      id: allocation.id,
      itemId: allocation.itemId,
      storeId: allocation.storeId,
      quantity: allocation.quantity,
      storeName: allocation.store.name,
      storeColor: allocation.store.color,
    };
  });
}
