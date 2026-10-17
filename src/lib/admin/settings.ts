import prisma from '@/lib/prisma';
import { CurrentAuthSession } from '@/lib/auth/session';
import { recordAdminAudit } from './audit';

export interface PlatformConfig {
  platformName: string;
  supportEmail: string;
  supportPhone: string;
  defaultTrialDays: number;
  gracePeriodDays: number;
  maintenanceMode: boolean;
  allowPublicRegistration: boolean;
  razorpayKeyIdStatus: string;
  razorpayKeySecretStatus: string;
  whatsappGatewayStatus: string;
}

export const DEFAULT_PLATFORM_CONFIG: PlatformConfig = {
  platformName: 'LenDen Cloud Platform',
  supportEmail: 'support@lenden.in',
  supportPhone: '+91 98765 43210',
  defaultTrialDays: 14,
  gracePeriodDays: 3,
  maintenanceMode: false,
  allowPublicRegistration: true,
  razorpayKeyIdStatus: 'CONFIGURED',
  razorpayKeySecretStatus: 'SECURED',
  whatsappGatewayStatus: 'READY',
};

/**
 * Retrieves all platform settings from PostgreSQL, falling back to defaults if not seeded.
 */
export async function getPlatformSettings(): Promise<PlatformConfig> {
  try {
    const records = await (prisma as any).platformSetting.findMany();
    const config: Record<string, any> = { ...DEFAULT_PLATFORM_CONFIG };

    for (const r of records) {
      if (r.key === 'maintenanceMode' || r.key === 'allowPublicRegistration') {
        config[r.key] = r.value === 'true';
      } else if (r.key === 'defaultTrialDays' || r.key === 'gracePeriodDays') {
        config[r.key] = parseInt(r.value, 10) || DEFAULT_PLATFORM_CONFIG[r.key as keyof PlatformConfig];
      } else {
        config[r.key] = r.value;
      }
    }

    return config as PlatformConfig;
  } catch (error) {
    console.warn('Could not read platform settings from DB, using defaults:', error);
    return DEFAULT_PLATFORM_CONFIG;
  }
}

/**
 * Updates a specific platform setting and records an audit log.
 */
export async function updatePlatformSetting(
  adminSession: CurrentAuthSession,
  key: string,
  value: string,
  category = 'GENERAL',
  reason?: string
): Promise<void> {
  const existing = await (prisma as any).platformSetting.findUnique({
    where: { key },
  });

  const previousValue = existing ? existing.value : null;

  await (prisma as any).platformSetting.upsert({
    where: { key },
    update: {
      value,
      category,
      updatedBy: adminSession.user.email,
    },
    create: {
      key,
      value,
      category,
      updatedBy: adminSession.user.email,
    },
  });

  await recordAdminAudit(adminSession, {
    action: 'SETTINGS_UPDATE',
    targetType: 'SETTING',
    targetId: key,
    targetName: key,
    reason: reason || `Updated ${key}`,
    metadata: {
      previousValue,
      newValue: value,
      category,
    },
  });
}
