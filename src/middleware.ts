import { NextRequest, NextResponse } from "next/server";

// Rotte pubbliche (non richiedono autenticazione)
const PUBLIC_ROUTES = ["/login", "/api/auth/login", "/api/auth/logout"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Consenti asset statici e favicon
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".ico")
  ) {
    return NextResponse.next();
  }

  // Consenti rotte pubbliche
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Script scraping / GitHub Actions: API con chiave (senza cookie)
  const apiKey = request.headers.get("x-api-key");
  if (apiKey && apiKey === process.env.INCASSI_API_KEY) {
    if (pathname === "/api/incassi" && request.method === "POST") return NextResponse.next();
    if (pathname === "/api/velocissimo/punto-vendita" && request.method === "GET") return NextResponse.next();
  }

  // Cron Vercel: sync Velocissimo (controllo segreto nella route)
  if (pathname === "/api/cron/sync-velocissimo") {
    return NextResponse.next();
  }

  // Verifica token di autenticazione
  const token = request.cookies.get("auth-token")?.value;

  if (!token) {
    // Redirect alla pagina di login
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Token presente, consenti accesso
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
