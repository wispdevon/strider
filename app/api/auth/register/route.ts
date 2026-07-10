import { NextResponse } from 'next/server';
import { startRegistration, verifyRegistration } from '@/lib/auth';
import { createUser } from '@/lib/users';
import { generateUsername } from '@/lib/username';
import { createSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

// Step 1: Start registration - get challenge options
export async function POST(request: Request) {
  console.log('[API /api/auth/register POST] Starting registration');
  try {
    const body = await request.json();
    const { name, email } = body;
    console.log('[API /api/auth/register POST] Request body:', { name: name || '(auto-generate)', email: email || '(none)' });

    // Create a new user
    const username = name || generateUsername();
    const user = createUser(username, email);
    console.log('[API /api/auth/register POST] User created:', { id: user.id, name: user.name });

    // Generate registration options (includes challengeId)
    const result = await startRegistration(user.id);
    const { challengeId, ...options } = result;
    console.log('[API /api/auth/register POST] Registration options generated:', {
      challengeId,
      rpId: options.rp?.id,
      rpName: options.rp?.name,
      userId: options.user?.id,
    });

    return NextResponse.json({
      userId: user.id,
      challengeId,
      options,
    });
  } catch (error: any) {
    console.error('[API /api/auth/register POST] Registration start failed:', error);
    return NextResponse.json({ error: error.message || 'Registration failed' }, { status: 400 });
  }
}

// Step 2: Verify registration - complete the WebAuthn registration
export async function PUT(request: Request) {
  console.log('[API /api/auth/register PUT] Verifying registration');
  try {
    const body = await request.json();
    const { userId, credential, challengeId } = body;
    console.log('[API /api/auth/register PUT] Received:', {
      userId,
      challengeId,
      credentialId: credential?.id,
      credentialType: credential?.type,
    });

    if (!userId || !credential) {
      console.error('[API /api/auth/register PUT] Missing required fields:', { hasUserId: !!userId, hasCredential: !!credential });
      return NextResponse.json({ error: 'userId and credential are required' }, { status: 400 });
    }

    // Verify the registration response
    console.log('[API /api/auth/register PUT] Calling verifyRegistration...');
    const passkeyCred = await verifyRegistration(userId, credential, challengeId);
    console.log('[API /api/auth/register PUT] Registration verified:', { credentialId: passkeyCred?.credentialId });

    // Create a session
    console.log('[API /api/auth/register PUT] Creating session for user:', userId);
    await createSession(userId);
    console.log('[API /api/auth/register PUT] Session created successfully');

    return NextResponse.json({
      verified: true,
      userId,
    });
  } catch (error: any) {
    console.error('[API /api/auth/register PUT] Registration verification failed:', error);
    return NextResponse.json({ error: error.message || 'Verification failed' }, { status: 400 });
  }
}