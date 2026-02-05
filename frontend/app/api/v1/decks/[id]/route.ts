import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { withAuth, ApiError } from "@/app/lib/auth";
import { DeckStatus } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

// GET /api/v1/decks/[id] - 特定デッキ取得
export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  return withAuth(request, async (user) => {
    const deck = await prisma.deck.findFirst({
      where: {
        id,
        userId: user.id,
      },
      include: {
        leaderCard: true,
        customCard: true,
      },
    });

    if (!deck) {
      throw new ApiError(404, "Deck not found");
    }

    return deck;
  });
}

// PATCH /api/v1/decks/[id] - デッキ更新
export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  return withAuth(request, async (user) => {
    const body = await request.json();
    const { status, name } = body;

    const deck = await prisma.deck.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!deck) {
      throw new ApiError(404, "Deck not found");
    }

    const updatedDeck = await prisma.deck.update({
      where: { id },
      data: {
        ...(status && { status: status as DeckStatus }),
        ...(name && { name }),
      },
      include: {
        leaderCard: true,
        customCard: true,
      },
    });

    return updatedDeck;
  });
}

// DELETE /api/v1/decks/[id] - デッキ削除
export async function DELETE(request: Request, { params }: Params) {
  const { id } = await params;
  return withAuth(request, async (user) => {
    const deck = await prisma.deck.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!deck) {
      throw new ApiError(404, "Deck not found");
    }

    await prisma.deck.delete({
      where: { id },
    });

    return { success: true };
  });
}
