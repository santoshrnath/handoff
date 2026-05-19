// Auth context + tenant resolution + super-admin check.
//
// Privacy model:
//   - Anonymous visitor:  reads only the "default" demo pool. Mutating
//                          endpoints (interview, redaction, transfer) 401.
//   - Authenticated user: reads + writes scoped to their Clerk user id
//                          (their tenantId == userId).
//   - Super admin (env list): bypasses tenant scoping for READS only.
//
// Critically: Honest notes never leak across tenants regardless of admin
// status. See lib/honest-notes.ts for the strict access rules.

import { auth, currentUser } from "@clerk/nextjs/server";

export const DEFAULT_TENANT = "default";

export interface AuthContext {
  userId: string | null;
  email: string | null;
  isSuperAdmin: boolean;
  tenantId: string;
  canSeeAllTenants: boolean;
}

function adminEmails(): string[] {
  const raw = process.env.SUPER_ADMIN_EMAILS ?? "";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export async function getAuthContext(): Promise<AuthContext> {
  const { userId } = await auth();
  if (!userId) {
    return {
      userId: null,
      email: null,
      isSuperAdmin: false,
      tenantId: DEFAULT_TENANT,
      canSeeAllTenants: false,
    };
  }
  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress ?? null;
  const isSuperAdmin = !!email && adminEmails().includes(email.toLowerCase());
  return {
    userId,
    email,
    isSuperAdmin,
    tenantId: userId,
    canSeeAllTenants: isSuperAdmin,
  };
}

export function tenantWhere(ctx: AuthContext): { tenantId?: string } {
  if (ctx.canSeeAllTenants) return {};
  return { tenantId: ctx.tenantId };
}
