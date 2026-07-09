/**
 * WebAuthn authentication logic
 */
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';

import type { AuthenticatorTransportFuture } from '@simplewebauthn/server';
import { getDb } from './db-core';
import { getUserById, savePasskeyCredential, getPasskeyByCredentialId, updatePasskeyCounter, getPasskeysByUserId, createUser } from './users';
import { generateUsername } from './username';
import { generateAvatarDataUri } from './avatar';

// Relying Party configuration
const RP_NAME = 'Strider Flow';
const RP_ID = process.env.RP_ID || 'localhost';
const RP_ORIGIN = process.env.RP_ORIGIN || `http://localhost:${process.env.PORT || 3000}`;
const TIMEOUT_MS = 60000;

export async function startRegistration(userId: string) {
  console.log('[auth.ts] startRegistration called for userId:', userId);
  console.log('[auth.ts] RP config:', { rpName: RP_NAME, rpId: RP_ID, rpOrigin: RP_ORIGIN });

  const user = getUserById(userId);
  if (!user) {
    console.error('[auth.ts] startRegistration: User not found:', userId);
    throw new Error('User not found');
  }
  console.log('[auth.ts] startRegistration: User found:', { id: user.id, name: user.name });

  const existingCredentials = getPasskeysByUserId(userId);
  console.log('[auth.ts] startRegistration: Existing credentials count:', existingCredentials.length);

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userName: user.name,
    userID: Buffer.from(userId, 'utf-8'),
    timeout: TIMEOUT_MS,
    excludeCredentials: existingCredentials.map((cred) => ({
      id: cred.credentialId,
      transports: cred.transports ? JSON.parse(cred.transports) : undefined,
    })),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
    },
  });
  console.log('[auth.ts] startRegistration: Options generated, challenge:', options.challenge?.substring(0, 20) + '...');

  // Store challenge in the dedicated challenges table
  const db = getDb();
  const challengeId = `reg-${userId}-${Date.now()}`;
  console.log('[auth.ts] startRegistration: Storing challenge with id:', challengeId);
  db.prepare(`
    INSERT INTO webauthn_challenges (id, user_id, challenge, options_json)
    VALUES (@id, @userId, @challenge, @optionsJson)
  `).run({
    id: challengeId,
    userId: userId,
    challenge: options.challenge,
    optionsJson: JSON.stringify(options),
  });
  console.log('[auth.ts] startRegistration: Challenge stored successfully');

  return { ...options, challengeId };
}

export async function verifyRegistration(
  userId: string,
  response: {
    id: string;
    rawId: string;
    response: {
      clientDataJSON: string;
      attestationObject: string;
      transports?: string[];
    };
    authenticatorAttachment?: string;
    clientExtensionResults: Record<string, unknown>;
    type: string;
  },
  challengeId?: string
) {
  console.log('[auth.ts] verifyRegistration called:', { userId, challengeId, credentialId: response?.id });
  console.log('[auth.ts] verifyRegistration: RP config:', { rpId: RP_ID, rpOrigin: RP_ORIGIN });

  const db = getDb();

  // Retrieve stored challenge - try by challengeId first, then fall back to user-based lookup
  let challengeRow: { challenge: string } | undefined;

  if (challengeId) {
    console.log('[auth.ts] verifyRegistration: Looking up challenge by id:', challengeId);
    challengeRow = db.prepare(
      "SELECT challenge FROM webauthn_challenges WHERE id = ? AND user_id = ?"
    ).get(challengeId, userId) as { challenge: string } | undefined;
    console.log('[auth.ts] verifyRegistration: Challenge found by id:', !!challengeRow);
  }

  if (!challengeRow) {
    console.log('[auth.ts] verifyRegistration: Falling back to most recent challenge for user');
    // Fallback: get the most recent challenge for this user
    challengeRow = db.prepare(
      "SELECT challenge FROM webauthn_challenges WHERE user_id = ? ORDER BY created_at DESC LIMIT 1"
    ).get(userId) as { challenge: string } | undefined;
    console.log('[auth.ts] verifyRegistration: Fallback challenge found:', !!challengeRow);
  }

  if (!challengeRow) {
    console.error('[auth.ts] verifyRegistration: No challenge found for user:', userId);
    throw new Error('No registration challenge found');
  }

  const expectedChallenge = challengeRow.challenge;
  console.log('[auth.ts] verifyRegistration: Expected challenge:', expectedChallenge?.substring(0, 20) + '...');

  // Clean up all challenges for this user
  db.prepare("DELETE FROM webauthn_challenges WHERE user_id = ?").run(userId);
  console.log('[auth.ts] verifyRegistration: Cleaned up challenges for user');

  console.log('[auth.ts] verifyRegistration: Calling verifyRegistrationResponse...');
  const verification = await verifyRegistrationResponse({
    response: {
      id: response.id,
      rawId: response.rawId,
      response: {
        clientDataJSON: response.response.clientDataJSON,
        attestationObject: response.response.attestationObject,
        transports: response.response.transports as AuthenticatorTransportFuture[],
      },
      authenticatorAttachment: response.authenticatorAttachment as any,
      clientExtensionResults: response.clientExtensionResults as any,
      type: response.type as any,
    },
    expectedChallenge,
    expectedOrigin: RP_ORIGIN,
    expectedRPID: RP_ID,
  });
  console.log('[auth.ts] verifyRegistration: Verification result:', { verified: verification.verified, hasRegistrationInfo: !!verification.registrationInfo });

  if (!verification.verified || !verification.registrationInfo) {
    console.error('[auth.ts] verifyRegistration: Verification failed!', { verified: verification.verified, hasRegistrationInfo: !!verification.registrationInfo });
    throw new Error('Registration verification failed');
  }

  const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;
  console.log('[auth.ts] verifyRegistration: Credential info:', { id: credential.id, deviceType: credentialDeviceType, backedUp: credentialBackedUp, counter: credential.counter });

  // Save the actual credential
  console.log('[auth.ts] verifyRegistration: Saving passkey credential...');
  const saved = savePasskeyCredential({
    userId,
    credentialId: credential.id,
    publicKey: Buffer.from(credential.publicKey).toString('base64url'),
    counter: credential.counter,
    deviceType: credentialDeviceType ?? 'singleDevice',
    backedUp: credentialBackedUp ?? false,
    transports: response.response.transports || null,
  });
  console.log('[auth.ts] verifyRegistration: Credential saved:', { id: saved?.id, credentialId: saved?.credentialId });

  return saved;
}

export async function startLogin() {
  console.log('[auth.ts] startLogin called');
  console.log('[auth.ts] startLogin: RP config:', { rpId: RP_ID, rpOrigin: RP_ORIGIN });

  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    timeout: TIMEOUT_MS,
    userVerification: 'preferred',
  });
  console.log('[auth.ts] startLogin: Authentication options generated, challenge:', options.challenge?.substring(0, 20) + '...');

  // Store challenge in the dedicated challenges table
  const db = getDb();
  const id = `auth-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  console.log('[auth.ts] startLogin: Storing challenge with id:', id);
  db.prepare(`
    INSERT INTO webauthn_challenges (id, challenge, options_json)
    VALUES (@id, @challenge, @optionsJson)
  `).run({
    id,
    challenge: options.challenge,
    optionsJson: JSON.stringify(options),
  });
  console.log('[auth.ts] startLogin: Challenge stored successfully');

  return { ...options, challengeId: id };
}

export async function verifyLogin(
  response: {
    id: string;
    rawId: string;
    response: {
      clientDataJSON: string;
      authenticatorData: string;
      signature: string;
      userHandle?: string;
    };
    authenticatorAttachment?: string;
    clientExtensionResults: Record<string, unknown>;
    type: string;
  },
  challengeId: string
) {
  console.log('[auth.ts] verifyLogin called:', { challengeId, credentialId: response?.id, type: response?.type });
  console.log('[auth.ts] verifyLogin: RP config:', { rpId: RP_ID, rpOrigin: RP_ORIGIN });

  const db = getDb();

  // Retrieve stored challenge from the dedicated challenges table
  console.log('[auth.ts] verifyLogin: Looking up challenge by id:', challengeId);
  const challengeRow = db.prepare(
    "SELECT challenge FROM webauthn_challenges WHERE id = ?"
  ).get(challengeId) as { challenge: string } | undefined;

  if (!challengeRow) {
    console.error('[auth.ts] verifyLogin: Challenge not found for id:', challengeId);
    throw new Error('Authentication challenge not found or expired');
  }
  console.log('[auth.ts] verifyLogin: Challenge found, expected:', challengeRow.challenge?.substring(0, 20) + '...');

  const expectedChallenge = challengeRow.challenge;
  db.prepare("DELETE FROM webauthn_challenges WHERE id = ?").run(challengeId);
  console.log('[auth.ts] verifyLogin: Challenge cleaned up');

  // Find the stored credential
  console.log('[auth.ts] verifyLogin: Looking up credential by id:', response.id);
  const storedCred = getPasskeyByCredentialId(response.id);
  if (!storedCred) {
    console.error('[auth.ts] verifyLogin: Credential not found in database:', response.id);
    throw new Error('Credential not registered');
  }
  console.log('[auth.ts] verifyLogin: Credential found:', { credentialId: storedCred.credentialId, userId: storedCred.userId, counter: storedCred.counter });

  console.log('[auth.ts] verifyLogin: Calling verifyAuthenticationResponse...');
  const verification = await verifyAuthenticationResponse({
    response: {
      id: response.id,
      rawId: response.rawId,
      response: {
        clientDataJSON: response.response.clientDataJSON,
        authenticatorData: response.response.authenticatorData,
        signature: response.response.signature,
        userHandle: response.response.userHandle,
      },
      authenticatorAttachment: response.authenticatorAttachment as any,
      clientExtensionResults: response.clientExtensionResults as any,
      type: response.type as any,
    },
    expectedChallenge,
    expectedOrigin: RP_ORIGIN,
    expectedRPID: RP_ID,
    credential: {
      id: storedCred.credentialId,
      publicKey: new Uint8Array(Buffer.from(storedCred.publicKey, 'base64url')),
      counter: storedCred.counter,
      transports: storedCred.transports ? JSON.parse(storedCred.transports) : undefined,
    },
  });
  console.log('[auth.ts] verifyLogin: Verification result:', { verified: verification.verified, newCounter: verification.authenticationInfo?.newCounter });

  if (!verification.verified) {
    console.error('[auth.ts] verifyLogin: Authentication verification failed!');
    throw new Error('Authentication verification failed');
  }

  // Update counter
  console.log('[auth.ts] verifyLogin: Updating credential counter to:', verification.authenticationInfo.newCounter);
  updatePasskeyCounter(response.id, verification.authenticationInfo.newCounter);

  console.log('[auth.ts] verifyLogin: Looking up user:', storedCred.userId);
  const user = getUserById(storedCred.userId);
  console.log('[auth.ts] verifyLogin: User found:', user ? { id: user.id, name: user.name } : 'null');
  return user;
}

export { generateUsername, generateAvatarDataUri };