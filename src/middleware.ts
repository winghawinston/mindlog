import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // Refresh the session cookie on every request.
  // Without this, sessions expire and users get randomly logged out.
  const supabase = createServerClient(
    supabaseUrl!,
    supabaseKey!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Get current user — do NOT use getSession() here.
  // getUser() validates the token with Supabase's server, making it secure.
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  // if getUser() itself errored (e.g. refresh_token_not_found), treat
  // the user as unauthenticated. The supabaseResponse already has the
  // cookie-clearing Set-Cookie headers from the Supabase client above.
  const currentUser = authError ? null : user;

  // CHANGED: "Auth session missing" is normal for unauthenticated users,
  // not a real error. Only log actual unexpected errors.
  if (authError && !authError.message.includes("Auth session missing")) {
    console.warn("[middleware] Session error (cleared):", authError.message);
  }

  const { pathname } = request.nextUrl;

  // Redirect unauthenticated users away from protected routes
  const protectedRoutes = ["/dashboard", "/journal", "/profile", "/onboarding"];
  const isProtected = protectedRoutes.some((route) => pathname.startsWith(route));

  if (!currentUser && isProtected) {
    // CHANGED: when redirecting, copy Supabase's Set-Cookie headers
    // (which clear the stale session) onto the redirect response.
    // Without this, the bad cookie persists and the user stays stuck.
    const redirectResponse = NextResponse.redirect(
      new URL("/login", request.url)
    );
    supabaseResponse.headers.forEach((value, key) => {
      if (key.toLowerCase() === "set-cookie") {
        redirectResponse.headers.append(key, value);
      }
    });
    return redirectResponse;
  }

  // Redirect authenticated users away from auth pages
  if (currentUser && (pathname === "/login" || pathname === "/signup")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return supabaseResponse;
}

export const config = {
  // Run middleware on all routes except static files and API routes
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};