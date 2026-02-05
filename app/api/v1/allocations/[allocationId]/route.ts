import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { withAuth, ApiError } from "@/app/lib/auth";

type Params = { params: Promise<{ allocationId: string }> };

// PATCH /api/v1/allocations/[allocationId] - 割り当て更新
export async function PATCH(request: Request, { params }: Params) {
  const { allocationId } = await params;
  return withAuth(request, async (user) => {
    const body = await request.json();
    const { quantity } = body;

    // 割り当て取得
    const allocation = await prisma.purchaseAllocation.findUnique({
      where: { id: allocationId },
      include: {
        item: {
          include: {
            list: true,
          },
        },
        store: true,
      },
    });

    if (!allocation) {
      throw new ApiError(404, "Allocation not found");
    }

    // 所有者チェック
    if (allocation.item.list.userId !== user.id) {
      throw new ApiError(403, "Access denied");
    }

    const updatedAllocation = await prisma.purchaseAllocation.update({
      where: { id: allocationId },
      data: { quantity },
      include: {
        store: true,
      },
    });

    return {
      id: updatedAllocation.id,
      itemId: updatedAllocation.itemId,
      storeId: updatedAllocation.storeId,
      quantity: updatedAllocation.quantity,
      storeName: updatedAllocation.store.name,
      storeColor: updatedAllocation.store.color,
    };
  });
}

// DELETE /api/v1/allocations/[allocationId] - 割り当て削除
export async function DELETE(request: Request, { params }: Params) {
  const { allocationId } = await params;
  return withAuth(request, async (user) => {
    // 割り当て取得
    const allocation = await prisma.purchaseAllocation.findUnique({
      where: { id: allocationId },
      include: {
        item: {
          include: {
            list: true,
          },
        },
      },
    });

    if (!allocation) {
      throw new ApiError(404, "Allocation not found");
    }

    // 所有者チェック
    if (allocation.item.list.userId !== user.id) {
      throw new ApiError(403, "Access denied");
    }

    await prisma.purchaseAllocation.delete({
      where: { id: allocationId },
    });

    return { success: true };
  });
}
