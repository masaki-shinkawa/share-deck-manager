import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { withAuth, ApiError } from "@/app/lib/auth";

type Params = { params: Promise<{ allocationId: string }> };

// PATCH /api/v1/purchases/allocations/[allocationId] - 割り当て更新
export async function PATCH(request: Request, { params }: Params) {
  const { allocationId } = await params;
  return withAuth(request, async (user) => {
    const body = await request.json();
    const { quantity } = body;

    // 割り当て所有者チェック
    const allocation = await prisma.purchaseAllocation.findFirst({
      where: {
        id: allocationId,
        item: {
          list: {
            userId: user.id,
          },
        },
      },
      include: {
        store: true,
      },
    });

    if (!allocation) {
      throw new ApiError(404, "Allocation not found");
    }

    const updated = await prisma.purchaseAllocation.update({
      where: { id: allocationId },
      data: { quantity },
      include: {
        store: true,
      },
    });

    return {
      id: updated.id,
      itemId: updated.itemId,
      storeId: updated.storeId,
      quantity: updated.quantity,
      storeName: updated.store.name,
      storeColor: updated.store.color,
    };
  });
}

// DELETE /api/v1/purchases/allocations/[allocationId] - 割り当て削除
export async function DELETE(request: Request, { params }: Params) {
  const { allocationId } = await params;
  return withAuth(request, async (user) => {
    // 割り当て所有者チェック
    const allocation = await prisma.purchaseAllocation.findFirst({
      where: {
        id: allocationId,
        item: {
          list: {
            userId: user.id,
          },
        },
      },
    });

    if (!allocation) {
      throw new ApiError(404, "Allocation not found");
    }

    await prisma.purchaseAllocation.delete({
      where: { id: allocationId },
    });

    return { success: true };
  });
}
