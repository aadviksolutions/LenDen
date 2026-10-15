import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  try {
    const response = NextResponse.json({
      success: true,
      message: 'Exited demo mode',
      redirectUrl: '/login',
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: '',
      path: '/',
      expires: new Date(0),
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to exit demo mode' },
      { status: 500 }
    );
  }
}
