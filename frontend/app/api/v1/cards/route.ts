import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { withAuth } from "@/app/lib/auth";

// GET /api/v1/cards - カード一覧
export async function GET(request: Request) {
  return withAuth(request, async () => {
    const cards = await prisma.card.findMany({
      orderBy: { cardId: "asc" },
    });
    return cards;
  });
}
