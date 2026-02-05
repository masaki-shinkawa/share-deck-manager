import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { withAuth } from "@/app/lib/auth";
import { PurchaseStatus } from "@prisma/client";

// GET /api/v1/purchases - ユーザーの購入リスト一覧
export async function GET(request: Request) {
  return withAuth(request, async (user) => {
    const lists = await prisma.purchaseList.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
    return lists;
  });
}

// POST /api/v1/purchases - 購入リスト作成
export async function POST(request: Request) {
  return withAuth(request, async (user) => {
    const body = await request.json();
    const { name, status = "planning" } = body;

    const purchaseList = await prisma.purchaseList.create({
      data: {
        userId: user.id,
        name,
        status: status as PurchaseStatus,
      },
    });

    return purchaseList;
  });
}
