import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getCurrentUser, withAuth } from "@/app/lib/auth";

export async function GET(request: Request) {
  return withAuth(request, async (user) => {
    return {
      id: user.id,
      googleId: user.googleId,
      email: user.email,
      nickname: user.nickname,
      image: user.image,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  });
}

export async function PUT(request: Request) {
  return withAuth(request, async (user) => {
    const body = await request.json();
    const { nickname } = body;

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { nickname },
    });

    return updatedUser;
  });
}
