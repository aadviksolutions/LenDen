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

/**
 * Server-side package entitlement guard.
 * Strictly verifies on the server that the active business has the required feature
 * enabled in its subscription plan. Blocks lower-tier plans from unauthorized APIs.
 */
export async function requireEntitlement(
  feature: import('@/lib/subscription/plans').OfficialPlan['entitlements'] extends Record<infer K, any> ? K : never,
  requestedBusinessId?: string,
  allowedRoles?: BusinessRole[]
): Promise<{
  session: CurrentAuthSession;
  business: ActiveBusinessWorkspace;
  userRole: BusinessRole;
  entitlements: import('@/lib/subscription/entitlements').BusinessEntitlementsResult;
}> {
  const result = await requireTenantAccess(requestedBusinessId, allowedRoles);
  const { getBusinessEntitlements, checkFeatureEntitlement } = await import('@/lib/subscription/entitlements');

  const entitlements = await getBusinessEntitlements(result.business.id);

  // Platform Super Admins have universal platform access
  if (result.session.user.platformRole === PlatformRole.SUPER_ADMIN) {
    return { ...result, entitlements };
  }

  const allowed = Boolean(entitlements.entitlements[feature as keyof typeof entitlements.entitlements]);

  if (!allowed) {
    const check = await checkFeatureEntitlement(result.business.id, feature as any);
    throw new AuthError(
      check.message ||
        `Feature not available. Your current ${entitlements.planName} plan does not include '${String(feature)}'.`,
      403
    );
  }

  return { ...result, entitlements };
}

/**
 * Server-side commercial subscription guard.
 * Blocks Free Khata users from accessing paid commercial billing, inventory,
 * purchases, and business accounting APIs.
 */
export async function requireCommercialAccess(
  requestedBusinessId?: string,
  allowedRoles?: BusinessRole[]
): Promise<{
  session: CurrentAuthSession;
  business: ActiveBusinessWorkspace;
  userRole: BusinessRole;
}> {
  const result = await requireEntitlement('canCreateInvoices', requestedBusinessId, allowedRoles);
  return {
    session: result.session,
    business: result.business,
    userRole: result.userRole,
  };
}

/**
 * Server-side Growth plan guard.
 * Blocks Free Khata and Starter users from Growth/Scale features (Purchases, Suppliers, Staff, Reports).
 */
export async function requireGrowthAccess(
  requestedBusinessId?: string,
  allowedRoles?: BusinessRole[]
): Promise<{
  session: CurrentAuthSession;
  business: ActiveBusinessWorkspace;
  userRole: BusinessRole;
}> {
  const result = await requireEntitlement('canManagePurchases', requestedBusinessId, allowedRoles);
  return {
    session: result.session,
    business: result.business,
    userRole: result.userRole,
  };
}

/**
 * Server-side Scale plan guard.
 * Blocks Free Khata, Starter, and Growth users from Scale-only features (Multi-location, advanced valuation).
 */
export async function requireScaleAccess(
  requestedBusinessId?: string,
  allowedRoles?: BusinessRole[]
): Promise<{
  session: CurrentAuthSession;
  business: ActiveBusinessWorkspace;
  userRole: BusinessRole;
}> {
  const result = await requireEntitlement('canMultiLocation', requestedBusinessId, allowedRoles);
  return {
    session: result.session,
    business: result.business,
    userRole: result.userRole,
  };
}

