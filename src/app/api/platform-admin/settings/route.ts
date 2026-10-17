import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin, AuthError } from '@/lib/auth/guards';
import { getPlatformSettings, updatePlatformSetting } from '@/lib/admin/settings';

export async function GET() {
  try {
    await requireSuperAdmin();
    const settings = await getPlatformSettings();
    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminSession = await requireSuperAdmin();
    const body = await request.json();

    const { key, value, category, reason } = body;

    if (!key || value === undefined) {
      return NextResponse.json({ error: 'Key and value are required' }, { status: 400 });
    }

    await updatePlatformSetting(
      adminSession,
      key,
      String(value),
      category || 'GENERAL',
      reason || `Updated setting ${key}`
    );

    const updatedSettings = await getPlatformSettings();

    return NextResponse.json({
      success: true,
      message: `Setting ${key} updated successfully.`,
      settings: updatedSettings,
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
