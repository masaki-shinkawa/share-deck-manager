import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { withAuth, ApiError } from "@/app/lib/auth";
import { Card } from "@prisma/client";

// GET /api/v1/admin/check-image-urls - 画像URL確認
export async function GET(request: Request) {
  return withAuth(request, async (user) => {
    // 管理者チェック
    if (user.role !== "admin") {
      throw new ApiError(403, "Admin access required");
    }

    const cards = await prisma.card.findMany();
    const r2PublicUrl = process.env.R2_PUBLIC_URL ?? "";

    const categories = {
      r2Urls: 0,
      externalUrls: 0,
      localPaths: 0,
      other: 0,
    };

    const sampleUrls = cards.slice(0, 5).map((card: Card) => ({
      cardId: card.cardId,
      imagePath: card.imagePath,
    }));

    for (const card of cards) {
      const path = card.imagePath;

      if (r2PublicUrl && path.startsWith(r2PublicUrl)) {
        categories.r2Urls++;
      } else if (path.includes("onepiece-cardgame.com") || path.startsWith("http")) {
        categories.externalUrls++;
      } else if (path.startsWith("/")) {
        categories.localPaths++;
      } else {
        categories.other++;
      }
    }

    const total = cards.length;
    const needsMigration = total - categories.r2Urls;

    return {
      totalCards: total,
      categories,
      sampleUrls,
      r2PublicUrl,
      migrationStatus: {
        migrated: categories.r2Urls,
        needsMigration,
        isComplete: needsMigration === 0,
      },
    };
  });
}
