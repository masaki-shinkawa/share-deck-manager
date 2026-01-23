import NextAuth from "next-auth"

declare module "next-auth" {
  interface Session {
    idToken?: string
    error?: string
    user: {
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    idToken?: string
    accessToken?: string
    refreshToken?: string
    accessTokenExpires?: number
    error?: string
    sub?: string  // Google user ID
  }
}
