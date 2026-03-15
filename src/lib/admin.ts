import { auth0 } from "./auth0";

const adminEmails = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

/**
 * Check if the current session user is an admin.
 * Returns the session if admin, null otherwise.
 */
export async function requireAdmin() {
  const session = await auth0.getSession();
  if (!session) return null;

  const email = session.user.email?.toLowerCase();
  if (!email || !adminEmails.includes(email)) return null;

  return session;
}
