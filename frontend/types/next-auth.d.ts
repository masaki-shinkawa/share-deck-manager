import NextAuth from "next-auth"

declare module "next-auth" {
  interface Session {
    idToken?: string
    error?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    idToken?: string
    accessToken?: string
    refreshToken?: string
    accessTokenExpires?: number
    error?: string
  }
}
