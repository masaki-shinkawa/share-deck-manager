import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { withAuth } from "@/app/lib/auth";

// GET /api/v1/custom-cards - ユーザーのカスタムカード一覧
export async function GET(request: Request) {
  return withAuth(request, async (user) => {
    const customCards = await prisma.customCard.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
    return customCards;
  });
}

// POST /api/v1/custom-cards - カスタムカード作成
export async function POST(request: Request) {
  return withAuth(request, async (user) => {
    const body = await request.json();
    const { name, color1, color2 } = body;

    const customCard = await prisma.customCard.create({
      data: {
        userId: user.id,
        name,
        color1,
        color2,
      },
    });

    return customCard;
  });
}
