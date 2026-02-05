import { NextResponse } from "next/server";
import { withAuth, ApiError } from "@/app/lib/auth";
import { scrapeAndSaveCards } from "@/app/lib/services/card-scraper";

// POST /api/v1/admin/scrape-cards - カードスクレイピング
export async function POST(request: Request) {
  return withAuth(request, async (user) => {
    // 管理者チェック
    if (user.role !== "admin") {
      throw new ApiError(403, "Admin access required");
    }

    try {
      const result = await scrapeAndSaveCards();

      return {
        status: "success",
        newCards: result.newCards,
        updatedCards: result.updatedCards,
        totalCards: result.totalCards,
        errors: [],
        message: `Scraping completed successfully. Added ${result.newCards} new cards, updated ${result.updatedCards} cards.`,
      };
    } catch (error) {
      return {
        status: "error",
        newCards: 0,
        updatedCards: 0,
        totalCards: 0,
        errors: [String(error)],
        message: `Scraping failed: ${error}`,
      };
    }
  });
}
