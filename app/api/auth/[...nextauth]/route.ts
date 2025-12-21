import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import jwt from "jsonwebtoken";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "Local Dev",
      credentials: {
        username: { label: "Username", type: "text", placeholder: "dev" },
      },
      async authorize(credentials, req) {
        // For local dev, just return a dummy user
        if (process.env.NODE_ENV === "development") {
          return { id: "00000000-0000-0000-0000-000000000001", name: "Dev User", email: "dev@example.com" };
        }
        return null;
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  jwt: {
    encode: ({ secret, token }) => {
      const encodedToken = jwt.sign(token!, secret, { algorithm: "HS256" });
      return encodedToken;
    },
    decode: ({ secret, token }) => {
      const decodedToken = jwt.verify(token!, secret, { algorithms: ["HS256"] });
      return decodedToken as any;
    },
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // Google認証の場合、バックエンドにユーザーを作成/同期
      if (account?.provider === "google" && user.email) {
        try {
          // 直接バックエンドを呼び出す（認証不要のため）
          const response = await fetch("http://localhost:8000/api/users/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              google_id: account.providerAccountId,
              email: user.email,
              name: user.name,
              image: user.image,
            }),
          });
          
          if (!response.ok) {
            console.error("Failed to sync user:", await response.text());
            return false;
          }
          
          const data = await response.json();
          // ユーザーオブジェクトにUUIDを設定
          user.id = data.id;
        } catch (error) {
          console.error("Failed to sync user:", error);
          return false;
        }
      }
      return true;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
      }
      return session;
    },
    async jwt({ token, user, account, profile }) {
      // 初回ログイン時
      if (account && user) {
        // Google認証の場合、account.providerAccountIdをUUIDに変換する必要がある
        // しかし、既存のユーザーがいる可能性があるので、
        // まずはNextAuthのデフォルトの動作に任せる
        // token.subはNextAuthが自動的に設定する
        
        // Local Dev の場合は、user.idをそのまま使用
        if (account.provider === "credentials") {
          token.sub = user.id;
        }
        // Google認証の場合は、NextAuthが自動的にUUIDを生成する
        // ただし、この時点ではバックエンドにユーザーが存在しない
      }
      return token;
    },
  },
  // pages: {
  //   signIn: "/", // Redirect to home for sign in
  // }
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
