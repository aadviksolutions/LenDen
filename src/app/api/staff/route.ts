import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireGrowthAccess } from '@/lib/auth/guards';
import { hashPassword } from '@/lib/auth/password';
import { BusinessRole } from '@prisma/client';
import { getBusinessEntitlements } from '@/lib/subscription/entitlements';

export async function GET(request: NextRequest) {
  try {
    const authContext = await requireGrowthAccess();

    const memberships = await prisma.businessMembership.findMany({
      where: { businessId: authContext.business.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({
      staff: memberships.map((m) => ({
        membershipId: m.id,
        userId: m.user.id,
        name: m.user.name,
        email: m.user.email,
        phone: m.user.phone,
        role: m.role,
        createdAt: m.createdAt,
      })),
      currentUserRole: authContext.userRole,
      currentUserId: authContext.session.user.id,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Unauthorized or failed to fetch staff' },
      { status: error.message?.includes('Unauthorized') ? 401 : 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authContext = await requireGrowthAccess(undefined, ['BUSINESS_OWNER']);
    const body = await request.json();

    // Enforce Plan User Limit on the Server
    const entitlements = await getBusinessEntitlements(authContext.business.id);
    const currentMemberCount = await prisma.businessMembership.count({
      where: { businessId: authContext.business.id },
    });

    if (currentMemberCount >= entitlements.limits.maxUsers) {
      return NextResponse.json(
        {
          error: `Your current ${entitlements.planName} plan is limited to ${entitlements.limits.maxUsers} user(s) (including owner). Please upgrade to add more staff.`,
          upgradeRequired: true,
          limitReached: 'maxUsers',
          maxUsers: entitlements.limits.maxUsers,
          currentUsers: currentMemberCount,
        },
        { status: 403 }
      );
    }

    const { name, email, phone, role, password } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Staff name is required' }, { status: 400 });
    }

    if (!email || !email.trim() || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email address is required' }, { status: 400 });
    }

    const validRoles = [
      BusinessRole.BILLING_STAFF,
      BusinessRole.ACCOUNTANT,
      BusinessRole.INVENTORY_MANAGER,
    ];

    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid staff role specified' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists
    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (user) {
      // Check if user is already a member of this business
      const existingMembership = await prisma.businessMembership.findUnique({
        where: {
          userId_businessId: {
            userId: user.id,
            businessId: authContext.business.id,
          },
        },
      });

      if (existingMembership) {
        return NextResponse.json(
          { error: 'User is already a member of this business workspace' },
          { status: 400 }
        );
      }
    } else {
      // User doesn't exist, create user with initial password
      if (!password || password.length < 6) {
        return NextResponse.json(
          { error: 'Password must be at least 6 characters for a new user account' },
          { status: 400 }
        );
      }

      const passwordHash = await hashPassword(password);
      user = await prisma.user.create({
        data: {
          name: name.trim(),
          email: normalizedEmail,
          phone: phone?.trim() || null,
          passwordHash,
        },
      });
    }

    const membership = await prisma.businessMembership.create({
      data: {
        userId: user.id,
        businessId: authContext.business.id,
        role,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
      },
    });

    return NextResponse.json(
      {
        message: 'Staff member added successfully',
        staff: {
          membershipId: membership.id,
          userId: membership.user.id,
          name: membership.user.name,
          email: membership.user.email,
          phone: membership.user.phone,
          role: membership.role,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to add staff member' },
      { status: error.message?.includes('Unauthorized') ? 401 : 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authContext = await requireGrowthAccess(undefined, ['BUSINESS_OWNER']);
    const { searchParams } = new URL(request.url);
    const membershipId = searchParams.get('id');

    if (!membershipId) {
      return NextResponse.json({ error: 'Membership ID is required' }, { status: 400 });
    }

    const membership = await prisma.businessMembership.findFirst({
      where: {
        id: membershipId,
        businessId: authContext.business.id,
      },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Membership not found or unauthorized' }, { status: 404 });
    }

    if (membership.role === BusinessRole.BUSINESS_OWNER) {
      return NextResponse.json(
        { error: 'Cannot remove the primary Business Owner account' },
        { status: 403 }
      );
    }

    if (membership.userId === authContext.session.user.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own active membership' },
        { status: 400 }
      );
    }

    await prisma.businessMembership.delete({
      where: { id: membershipId },
    });

    return NextResponse.json({ success: true, message: 'Staff member removed successfully' });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to remove staff member' },
      { status: error.message?.includes('Unauthorized') ? 401 : 500 }
    );
  }
}
