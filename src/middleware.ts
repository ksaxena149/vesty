import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Define PAGE routes that need authentication (not API routes)
// API routes handle their own auth internally
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  // Only protect page routes with auth.protect()
  // API routes will handle authentication internally
  if (isProtectedRoute(req)) await auth.protect();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes (but don't call auth.protect() on them)
    '/(api|trpc)(.*)',
  ],
};