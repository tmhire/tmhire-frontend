import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export default async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET! });

  const isAuthPage = path === "/signin" || path === "/signup";

  if (!token?.email) {
    // Not authenticated
    if (!isAuthPage) {
      // Trying to access a protected route → redirect to signin
      return NextResponse.redirect(new URL("/signin", request.url));
    }
    // Accessing /signin or /signup → allow
    return NextResponse.next();
  } else {
    // Authenticated
    if (isAuthPage) {
      // Trying to access signin or signup → redirect to home
      return NextResponse.redirect(new URL("/", request.url));
    }
    // Accessing protected route → allow
    return NextResponse.next();
  }
}

export const config = {
  matcher: ["/((?!_next|api|static|favicon.ico).*)"],
};
