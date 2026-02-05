import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { withAuth } from "@/app/lib/auth";

// GET /api/v1/decks/grouped - グループ化されたデッキ一覧
export async function GET(request: Request) {
  return withAuth(request, async (user) => {
    const decks = await prisma.deck.findMany({
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            email: true,
            image: true,
          },
        },
        leaderCard: {
          select: {
            id: true,
            cardId: true,
            name: true,
            color: true,
            imagePath: true,
          },
        },
        customCard: {
          select: {
            id: true,
            name: true,
            color1: true,
            color2: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // ユーザーをユニークに抽出
    const usersMap = new Map();
    decks.forEach((deck) => {
      if (!usersMap.has(deck.user.id)) {
        usersMap.set(deck.user.id, deck.user);
      }
    });

    return {
      users: Array.from(usersMap.values()),
      decks: decks.map((deck) => ({
        id: deck.id,
        name: deck.name,
        user: deck.user,
        leaderCard: deck.leaderCard,
        customCard: deck.customCard,
        status: deck.status,
        createdAt: deck.createdAt,
      })),
      totalCount: decks.length,
    };
  });
}
