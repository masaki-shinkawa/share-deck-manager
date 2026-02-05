import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { withAuth, ApiError } from "@/app/lib/auth";

type Params = { params: Promise<{ listId: string; itemId: string }> };

// GET /api/v1/purchases/[listId]/items/[itemId]/prices - 価格一覧
export async function GET(request: Request, { params }: Params) {
  const { listId, itemId } = await params;
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

    const prices = await prisma.priceEntry.findMany({
      where: { itemId },
      orderBy: { updatedAt: "desc" },
    });

    return prices;
  });
}
