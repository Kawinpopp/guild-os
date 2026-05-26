import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Supabase client stores the session in localStorage (not cookies),
// so server-side auth checking in middleware doesn't work without @supabase/ssr.
// Auth protection is handled client-side in src/app/dashboard/layout.tsx.
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
