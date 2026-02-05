import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { withAuth, ApiError } from "@/app/lib/auth";

type Params = { params: Promise<{ id: string }> };

// DELETE /api/v1/custom-cards/[id] - カスタムカード削除
export async function DELETE(request: Request, { params }: Params) {
  const { id } = await params;
  return withAuth(request, async (user) => {
    const customCard = await prisma.customCard.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!customCard) {
      throw new ApiError(404, "Custom card not found");
    }

    await prisma.customCard.delete({
      where: { id },
    });

    return { success: true };
  });
}
