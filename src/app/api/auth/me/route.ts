import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/session';


export async function GET() {
  try {
    const session = await getCurrentSession();

    if (!session) {
      return NextResponse.json(
        { authenticated: false, user: null, activeBusiness: null, memberships: [] },
        { status: 401 }
      );
    }

    return NextResponse.json({
      authenticated: true,
      user: session.user,
      activeBusiness: session.activeBusiness,
      memberships: session.memberships,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve session';
    return NextResponse.json({ authenticated: false, error: message }, { status: 500 });
  }
}
