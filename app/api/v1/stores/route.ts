import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { withAuth, ApiError } from "@/app/lib/auth";

// GET /api/v1/stores - ユーザーのストア一覧
export async function GET(request: Request) {
  return withAuth(request, async (user) => {
    const stores = await prisma.store.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
    });
    return stores;
  });
}

// POST /api/v1/stores - ストア作成
export async function POST(request: Request) {
  return withAuth(request, async (user) => {
    const body = await request.json();
    const { name, color } = body;

    // 重複チェック
    const existing = await prisma.store.findFirst({
      where: {
        userId: user.id,
        name,
      },
    });

    if (existing) {
      throw new ApiError(400, `Store with name '${name}' already exists`);
    }

    // ストア作成
    const store = await prisma.store.create({
      data: {
        userId: user.id,
        name,
        color,
      },
    });

    // 既存の購入アイテムにNULL価格エントリを自動作成
    const purchaseItems = await prisma.purchaseItem.findMany({
      where: {
        list: {
          userId: user.id,
        },
      },
    });

    if (purchaseItems.length > 0) {
      await prisma.priceEntry.createMany({
        data: purchaseItems.map((item) => ({
          itemId: item.id,
          storeId: store.id,
          price: null,
        })),
      });
    }

    return store;
  });
}
