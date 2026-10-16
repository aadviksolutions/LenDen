import { NextRequest, NextResponse } from 'next/server';
import { registerFreeKhataUser } from '@/lib/auth/service';
import { setSessionCookie } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password, phone } = body;

    const result = await registerFreeKhataUser({
      name,
      email,
      password,
      phone,
    });

    await setSessionCookie(result.sessionToken, result.expiresAt);

    return NextResponse.json(
      {
        success: true,
        redirectUrl: '/free-khata',
        sessionToken: result.sessionToken,
        token: result.sessionToken,
        expiresAt: result.expiresAt,
        user: result.user,
        business: result.business,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Free Khata registration failed.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
