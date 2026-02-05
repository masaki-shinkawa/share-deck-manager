import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { withAuth, ApiError } from "@/app/lib/auth";

// GET /api/v1/admin/stats - 管理者統計
export async function GET(request: Request) {
  return withAuth(request, async (user) => {
    // 管理者チェック
    if (user.role !== "admin") {
      throw new ApiError(403, "Admin access required");
    }

    const [totalCards, totalDecks, totalUsers] = await Promise.all([
      prisma.card.count(),
      prisma.deck.count(),
      prisma.user.count(),
    ]);

    return {
      totalCards,
      totalDecks,
      totalUsers,
    };
  });
}
