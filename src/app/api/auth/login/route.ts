import { NextRequest, NextResponse } from 'next/server';
import { loginUser } from '@/lib/auth/service';
import { setSessionCookie } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    const result = await loginUser({ email, password });

    await setSessionCookie(result.sessionToken, result.expiresAt);

    return NextResponse.json({
      success: true,
      sessionToken: result.sessionToken,
      token: result.sessionToken,
      expiresAt: result.expiresAt,
      user: result.user,
      business: result.business,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Invalid credentials.';
    return NextResponse.json({ success: false, error: message }, { status: 401 });
  }
}
