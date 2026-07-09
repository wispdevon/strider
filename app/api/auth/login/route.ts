import { NextResponse } from 'next/server';
import { startLogin, verifyLogin } from '@/lib/auth';
import { createSession } from '@/lib/session';
import { getUserById } from '@/lib/users';
import { generateAvatarDataUri } from '@/lib/avatar';

export const dynamic = 'force-dynamic';

// Step 1: Start login - get authentication challenge
export async function POST(request: Request) {
  console.log('[API /api/auth/login POST] Starting login challenge generation');
  try {
    const result = await startLogin();
    console.log('[API /api/auth/login POST] Challenge generated:', {
      challengeId: result.challengeId,
      rpId: result.rpId,
      timeout: result.timeout,
      allowCredentialsCount: result.allowCredentials?.length ?? 0,
    });

    return NextResponse.json({
      options: {
        challenge: result.challenge,
        timeout: result.timeout,
        rpId: result.rpId,
        allowCredentials: result.allowCredentials,
        userVerification: result.userVerification,
      },
      challengeId: result.challengeId,
    });
  } catch (error: any) {
    console.error('[API /api/auth/login POST] Login start failed:', error);
    return NextResponse.json({ error: error.message || 'Login failed' }, { status: 400 });
  }
}

// Step 2: Verify login - complete the WebAuthn authentication
export async function PUT(request: Request) {
  console.log('[API /api/auth/login PUT] Verifying login assertion');
  try {
    const body = await request.json();
    const { credential, challengeId } = body;
    console.log('[API /api/auth/login PUT] Received:', {
      challengeId,
      credentialId: credential?.id,
      credentialType: credential?.type,
      hasUserHandle: !!credential?.response?.userHandle,
    });

    if (!credential || !challengeId) {
      console.error('[API /api/auth/login PUT] Missing required fields:', { hasCredential: !!credential, hasChallengeId: !!challengeId });
      return NextResponse.json({ error: 'credential and challengeId are required' }, { status: 400 });
    }

    // Verify the authentication response
    console.log('[API /api/auth/login PUT] Calling verifyLogin...');
    const user = await verifyLogin(credential, challengeId);
    if (!user) {
      console.error('[API /api/auth/login PUT] verifyLogin returned null/undefined user');
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    console.log('[API /api/auth/login PUT] Login verified for user:', { id: user.id, name: user.name });

    // Create a session
    console.log('[API /api/auth/login PUT] Creating session for user:', user.id);
    await createSession(user.id);
    console.log('[API /api/auth/login PUT] Session created successfully');

    return NextResponse.json({
      verified: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: generateAvatarDataUri(user.id),
      },
    });
  } catch (error: any) {
    console.error('[API /api/auth/login PUT] Login verification failed:', error);
    return NextResponse.json({ error: error.message || 'Verification failed' }, { status: 400 });
  }
}
