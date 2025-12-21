import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  // Only run on /api/ routes that are NOT /api/auth
  if (req.nextUrl.pathname.startsWith("/api/") && !req.nextUrl.pathname.startsWith("/api/auth")) {
    // Get the session token from cookie
    // Check both secure and non-secure names
    const token = req.cookies.get("next-auth.session-token")?.value || 
                  req.cookies.get("__Secure-next-auth.session-token")?.value;
    
    console.log("Middleware: Path:", req.nextUrl.pathname);
    console.log("Middleware: Token found:", !!token);
    if (token) console.log("Middleware: Token length:", token.length);

    if (token) {
      const requestHeaders = new Headers(req.headers);
      requestHeaders.set("Authorization", `Bearer ${token}`);
      
      // Return response with modified headers
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
