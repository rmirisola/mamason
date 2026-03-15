import { prisma } from "./db";
import { auth0 } from "./auth0";

/**
 * Get the current authenticated user from Auth0 session,
 * creating a DB record if it's their first visit.
 * Returns null if not logged in.
 */
export async function getCurrentUser() {
  const session = await auth0.getSession();
  if (!session) return null;

  const sub: string = session.user.sub;
  const email: string = session.user.email ?? sub;
  const name: string | null = session.user.name ?? null;

  const user = await prisma.user.upsert({
    where: { auth0Id: sub },
    update: { email, name },
    create: { auth0Id: sub, email, name },
  });

  return user;
}
