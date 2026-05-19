import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Public surface — landing + shared handoff links. Everything else routes
// through Clerk's auth handlers and can be inspected via auth() inside the
// route. Mutating API routes enforce auth() inside the handler.
const isPublicRoute = createRouteMatcher([
  "/",
  "/api/(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/share/(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return;
  await auth.protect();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
