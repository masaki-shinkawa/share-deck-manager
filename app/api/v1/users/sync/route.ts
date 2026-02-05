import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getTokenPayload } from "@/app/lib/auth";

export async function POST(request: Request) {
  const payload = await getTokenPayload(request);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sub: googleId, email, picture: image } = payload;

  if (!googleId || !email) {
    return NextResponse.json({ error: "Invalid token payload" }, { status: 400 });
  }

  let user = await prisma.user.findUnique({
    where: { googleId },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        googleId,
        email,
        image,
      },
    });
  } else if (user.image !== image) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { image },
    });
  }

  return NextResponse.json(user);
}
