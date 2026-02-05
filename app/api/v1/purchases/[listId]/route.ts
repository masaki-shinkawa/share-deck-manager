import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { withAuth, ApiError } from "@/app/lib/auth";
import { PurchaseStatus } from "@prisma/client";

type Params = { params: Promise<{ listId: string }> };

// GET /api/v1/purchases/[listId] - 購入リスト詳細
export async function GET(request: Request, { params }: Params) {
  const { listId } = await params;
  return withAuth(request, async (user) => {
    const list = await prisma.purchaseList.findFirst({
      where: {
        id: listId,
        userId: user.id,
      },
    });

    if (!list) {
      throw new ApiError(404, "Purchase list not found");
    }

    return list;
  });
}

// PATCH /api/v1/purchases/[listId] - 購入リスト更新
export async function PATCH(request: Request, { params }: Params) {
  const { listId } = await params;
  return withAuth(request, async (user) => {
    const body = await request.json();
    const { name, status } = body;

    const list = await prisma.purchaseList.findFirst({
      where: {
        id: listId,
        userId: user.id,
      },
    });

    if (!list) {
      throw new ApiError(404, "Purchase list not found");
    }

    const updatedList = await prisma.purchaseList.update({
      where: { id: listId },
      data: {
        ...(name !== undefined && { name }),
        ...(status && { status: status as PurchaseStatus }),
      },
    });

    return updatedList;
  });
}

// DELETE /api/v1/purchases/[listId] - 購入リスト削除
export async function DELETE(request: Request, { params }: Params) {
  const { listId } = await params;
  return withAuth(request, async (user) => {
    const list = await prisma.purchaseList.findFirst({
      where: {
        id: listId,
        userId: user.id,
      },
    });

    if (!list) {
      throw new ApiError(404, "Purchase list not found");
    }

    await prisma.purchaseList.delete({
      where: { id: listId },
    });

    return { success: true };
  });
}
