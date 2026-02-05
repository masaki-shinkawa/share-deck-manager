import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { withAuth, ApiError } from "@/app/lib/auth";

// POST /api/v1/admin/migrate-image-urls - 画像URL移行
export async function POST(request: Request) {
  return withAuth(request, async (user) => {
    // 管理者チェック
    if (user.role !== "admin") {
      throw new ApiError(403, "Admin access required");
    }

    const r2PublicUrl = process.env.R2_PUBLIC_URL;
    if (!r2PublicUrl) {
      throw new ApiError(500, "R2_PUBLIC_URL environment variable not set");
    }

    const cards = await prisma.card.findMany();

    let updatedCount = 0;
    let skippedCount = 0;
    const updatedCards: { cardId: string; oldPath: string; newPath: string }[] = [];

    for (const card of cards) {
      const oldPath = card.imagePath;

      // 既にR2 URLを使用している場合はスキップ
      if (oldPath.startsWith(r2PublicUrl)) {
        skippedCount++;
        continue;
      }

      // 新しいR2 URLを生成
      const newPath = `${r2PublicUrl}/cards/${card.cardId}.jpg`;

      // カードを更新
      await prisma.card.update({
        where: { id: card.id },
        data: { imagePath: newPath },
      });

      updatedCards.push({
        cardId: card.cardId,
        oldPath,
        newPath,
      });

      updatedCount++;
    }

    return {
      status: updatedCount > 0 ? "success" : "no_changes_needed",
      updatedCount,
      skippedCount,
      totalCards: cards.length,
      r2PublicUrl,
      updatedCards: updatedCards.slice(0, 10),
    };
  });
}
