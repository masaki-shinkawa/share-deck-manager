import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { withAuth, ApiError } from "@/app/lib/auth";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/v1/stores/[id] - ストア更新
export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  return withAuth(request, async (user) => {
    const body = await request.json();
    const { name, color } = body;

    const store = await prisma.store.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!store) {
      throw new ApiError(404, "Store not found");
    }

    // 名前変更時の重複チェック
    if (name && name !== store.name) {
      const existing = await prisma.store.findFirst({
        where: {
          userId: user.id,
          name,
        },
      });
      if (existing) {
        throw new ApiError(400, `Store with name '${name}' already exists`);
      }
    }

    const updatedStore = await prisma.store.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(color && { color }),
      },
    });

    return updatedStore;
  });
}

// DELETE /api/v1/stores/[id] - ストア削除
export async function DELETE(request: Request, { params }: Params) {
  const { id } = await params;
  return withAuth(request, async (user) => {
    const store = await prisma.store.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!store) {
      throw new ApiError(404, "Store not found");
    }

    await prisma.store.delete({
      where: { id },
    });

    return { success: true };
  });
}
