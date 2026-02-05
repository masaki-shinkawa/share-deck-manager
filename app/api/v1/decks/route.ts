import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { withAuth, ApiError } from "@/app/lib/auth";
import { DeckStatus, DeckRegulation } from "@prisma/client";

// GET /api/v1/decks - ユーザーのデッキ一覧
export async function GET(request: Request) {
  return withAuth(request, async (user) => {
    const decks = await prisma.deck.findMany({
      where: { userId: user.id },
      include: {
        leaderCard: true,
        customCard: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return decks;
  });
}

// POST /api/v1/decks - デッキ作成
export async function POST(request: Request) {
  return withAuth(request, async (user) => {
    const body = await request.json();
    const { name, leader_card_id, custom_card_id, status = "built", regulation = "standard" } = body;
    const leaderCardId = leader_card_id;
    const customCardId = custom_card_id;

    // カスタムカードが指定された場合、所有者チェック
    if (customCardId) {
      const customCard = await prisma.customCard.findFirst({
        where: {
          id: customCardId,
          userId: user.id,
        },
      });
      if (!customCard) {
        throw new ApiError(404, "Custom card not found");
      }
    }

    const deck = await prisma.deck.create({
      data: {
        userId: user.id,
        name,
        leaderCardId,
        customCardId,
        status: status as DeckStatus,
        regulation: regulation as DeckRegulation,
      },
      include: {
        leaderCard: true,
        customCard: true,
      },
    });

    return deck;
  });
}
