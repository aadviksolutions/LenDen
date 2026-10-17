import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSuperAdmin, AuthError } from '@/lib/auth/guards';

export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin();

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim() || '';
    const actionFilter = searchParams.get('action') || 'ALL';
    const targetFilter = searchParams.get('target') || 'ALL';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25', 10)));
    const skip = (page - 1) * limit;

    const whereClause: any = {};

    if (query) {
      whereClause.OR = [
        { adminEmail: { contains: query, mode: 'insensitive' } },
        { adminName: { contains: query, mode: 'insensitive' } },
        { targetName: { contains: query, mode: 'insensitive' } },
        { reason: { contains: query, mode: 'insensitive' } },
      ];
    }

    if (actionFilter !== 'ALL') {
      whereClause.action = actionFilter;
    }

    if (targetFilter !== 'ALL') {
      whereClause.targetType = targetFilter;
    }

    const [total, logs] = await Promise.all([
      (prisma as any).platformAuditLog.count({ where: whereClause }),
      (prisma as any).platformAuditLog.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return NextResponse.json({
      success: true,
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
