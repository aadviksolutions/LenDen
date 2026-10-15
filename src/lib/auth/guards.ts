import { getCurrentSession, CurrentAuthSession, ActiveBusinessWorkspace } from './session';
import { BusinessRole, PlatformRole } from '@prisma/client';

export class AuthError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 401) {
    super(message);
    this.name = 'AuthError';
    this.statusCode = statusCode;
  }
}

export class TenantIsolationError extends Error {
  statusCode: number;
  constructor(message: string = 'Access Denied: Tenant isolation violation') {
    super(message);
    this.name = 'TenantIsolationError';
    this.statusCode = 403;
  }
}

/**
 * Requires that the request comes from an authenticated user.
 */
export async function requireAuth(): Promise<CurrentAuthSession> {
  const session = await getCurrentSession();
  if (!session) {
    throw new AuthError('Authentication required to access this resource', 401);
  }
  return session;
}

/**
 * Requires that the authenticated user holds SUPER_ADMIN platform privileges.
 */
export async function requireSuperAdmin(): Promise<CurrentAuthSession> {
  const session = await requireAuth();
  if (session.user.platformRole !== PlatformRole.SUPER_ADMIN) {
    throw new AuthError('Platform administrator privileges required', 403);
  }
  return session;
}

/**
 * Server-side tenant isolation guard.
 * Strictly verifies on the server that the authenticated user is a verified member
 * of the requested business tenant. Never trusts unverified client parameters.
 */
export async function requireTenantAccess(
  requestedBusinessId?: string,
  allowedRoles?: BusinessRole[]
): Promise<{
  session: CurrentAuthSession;
  business: ActiveBusinessWorkspace;
  userRole: BusinessRole;
}> {
  const session = await requireAuth();

  // Super admins have global platform visibility, but when operating within a tenant context,
  // we ensure tenant exists
  const activeBusiness = session.activeBusiness;

  if (!activeBusiness) {
    throw new TenantIsolationError('No active business workspace found for user');
  }

  // If a specific businessId was requested (e.g. from an API route or action parameter),
  // strictly verify that the user's membership belongs to THAT businessId.
  if (requestedBusinessId && requestedBusinessId !== activeBusiness.id) {
    const isMemberOfRequested = session.memberships.some(
      (m) => m.businessId === requestedBusinessId
    );

    // If user is not a member of the requested tenant and not SUPER_ADMIN, reject!
    if (!isMemberOfRequested && session.user.platformRole !== PlatformRole.SUPER_ADMIN) {
      throw new TenantIsolationError(
        'Cross-tenant access prohibited. You do not belong to this business workspace.'
      );
    }
  }

  // Role check if specific roles are required (e.g., only BUSINESS_OWNER)
  if (allowedRoles && allowedRoles.length > 0) {
    if (
      !allowedRoles.includes(activeBusiness.role) &&
      session.user.platformRole !== PlatformRole.SUPER_ADMIN
    ) {
      throw new AuthError(
        `Insufficient role privileges. Required: ${allowedRoles.join(', ')}`,
        403
      );
    }
  }

  return {
    session,
    business: activeBusiness,
    userRole: activeBusiness.role,
  };
}
