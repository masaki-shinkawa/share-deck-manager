import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "./prisma";
import { User } from "@prisma/client";
import { NextResponse } from "next/server";
import * as jose from "jose";

// Google公開鍵のキャッシュ
let googleKeysCache: jose.JWK[] | null = null;
let googleKeysCacheTime = 0;
const CACHE_TTL = 3600 * 1000; // 1時間

async function getGooglePublicKeys(): Promise<jose.JWK[]> {
  const now = Date.now();
  if (googleKeysCache && now - googleKeysCacheTime < CACHE_TTL) {
    return googleKeysCache;
  }

  const response = await fetch("https://www.googleapis.com/oauth2/v3/certs");
  const data = await response.json();
  googleKeysCache = data.keys;
  googleKeysCacheTime = now;
  return data.keys;
}

export interface TokenPayload {
  sub: string;
  email: string;
  picture?: string;
  name?: string;
}

/**
 * Google ID Tokenを検証してペイロードを返す
 */
export async function verifyGoogleIdToken(token: string): Promise<TokenPayload | null> {
  try {
    const keys = await getGooglePublicKeys();
    const JWKS = jose.createLocalJWKSet({ keys });

    const { payload } = await jose.jwtVerify(token, JWKS, {
      issuer: "https://accounts.google.com",
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    return {
      sub: payload.sub as string,
      email: payload.email as string,
      picture: payload.picture as string | undefined,
      name: payload.name as string | undefined,
    };
  } catch (error) {
    console.error("Token verification failed:", error);
    return null;
  }
}

/**
 * リクエストからGoogle ID Tokenを取得して検証
 */
export async function getTokenPayload(request: Request): Promise<TokenPayload | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.substring(7);
  return verifyGoogleIdToken(token);
}

/**
 * 認証済みユーザーを取得（DBから）
 */
export async function getCurrentUser(request: Request): Promise<User | null> {
  const payload = await getTokenPayload(request);
  if (!payload) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { googleId: payload.sub },
  });

  return user;
}

/**
 * 認証必須のエンドポイント用ラッパー
 */
export async function withAuth<T>(
  request: Request,
  handler: (user: User, payload: TokenPayload) => Promise<T>
): Promise<NextResponse> {
  const payload = await getTokenPayload(request);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { googleId: payload.sub },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 401 });
  }

  try {
    const result = await handler(user, payload);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * カスタムAPIエラー
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}
