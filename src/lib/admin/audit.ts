import prisma from '@/lib/prisma';
import { CurrentAuthSession } from '@/lib/auth/session';

export interface RecordAuditParams {
  action: string;
  targetType: 'USER' | 'BUSINESS' | 'SUBSCRIPTION' | 'PAYMENT' | 'SETTING' | 'PLATFORM';
  targetId?: string | null;
  targetName?: string | null;
  reason?: string | null;
  outcome?: 'SUCCESS' | 'FAILED';
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
}

/**
 * Authoritative platform audit logger for administrative actions.
 * Records the acting admin, target record, action, reason, and state diff.
 * Never throws fatal exceptions to avoid crashing admin workflows if logging fails.
 */
export async function recordAdminAudit(
  adminSession: CurrentAuthSession,
  params: RecordAuditParams
): Promise<void> {
  try {
    const admin = adminSession.user;

    // Prisma JSON field accepts plain objects
    const metadataJson = params.metadata ? JSON.parse(JSON.stringify(params.metadata)) : undefined;

    await (prisma as any).platformAuditLog.create({
      data: {
        adminId: admin.id,
        adminEmail: admin.email,
        adminName: admin.name,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId || null,
        targetName: params.targetName || null,
        reason: params.reason || null,
        outcome: params.outcome || 'SUCCESS',
        metadata: metadataJson,
        ipAddress: params.ipAddress || null,
      },
    });
  } catch (error) {
    console.error('Failed to record platform audit log:', error);
  }
}
