import { SignJWT } from 'jose';
import { describe, expect, it, vi } from 'vitest';

import type { SupabaseClient } from '@supabase/supabase-js';

import { AuthenticationFailedError } from '../../domain/authentication-failed.error';
import type { Database } from '../../../../infrastructure/supabase/database.types';
import {
  SupabaseAuthProvider,
  supabaseAuthIssuer,
} from '../../../../infrastructure/auth/supabase-auth.provider';

const jwtSecret = 'test-jwt-secret-at-least-32-characters-long';
const issuer = supabaseAuthIssuer('https://test-project.supabase.co');
const userId = '11111111-1111-4111-8111-111111111111';

function createProvider(): SupabaseAuthProvider {
  return new SupabaseAuthProvider({} as SupabaseClient<Database>, {
    jwtSecret,
    issuer,
  });
}

async function signAccessToken(
  claims: Record<string, unknown>,
  options: { expiresIn?: string; secret?: string } = {},
): Promise<string> {
  return new SignJWT({
    email: 'member@example.com',
    email_verified: true,
    role: 'authenticated',
    ...claims,
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(userId)
    .setIssuer(issuer)
    .setAudience('authenticated')
    .setIssuedAt()
    .setExpirationTime(options.expiresIn ?? '1h')
    .sign(new TextEncoder().encode(options.secret ?? jwtSecret));
}

describe('SupabaseAuthProvider.getUserFromAccessToken', () => {
  it('returns the identity from a valid access token without calling Auth', async () => {
    const token = await signAccessToken({ user_metadata: { full_name: 'Member' } });
    const identity = await createProvider().getUserFromAccessToken(token);

    expect(identity).toMatchObject({
      userId,
      displayName: 'Member',
      googleId: null,
    });
    expect(identity.email?.value).toBe('member@example.com');
  });

  it('rejects an expired token', async () => {
    const token = await signAccessToken({}, { expiresIn: '-30s' });

    await expect(createProvider().getUserFromAccessToken(token)).rejects.toBeInstanceOf(
      AuthenticationFailedError,
    );
  });

  it('rejects a token signed with a different secret', async () => {
    const token = await signAccessToken({}, { secret: 'other-jwt-secret-at-least-32-chars-long' });

    await expect(createProvider().getUserFromAccessToken(token)).rejects.toBeInstanceOf(
      AuthenticationFailedError,
    );
  });

  it('rejects a tampered payload', async () => {
    const token = await signAccessToken({});
    const [header, payload, signature] = token.split('.');
    const tampered = `${header}.${payload?.replace(/.$/, 'A')}.${signature}`;

    await expect(createProvider().getUserFromAccessToken(tampered)).rejects.toBeInstanceOf(
      AuthenticationFailedError,
    );
  });

  it('uses getClaims for non-HS256 tokens when no JWT secret is configured', async () => {
    const getClaims = vi.fn(async () => ({
      data: {
        claims: {
          sub: userId,
          email: 'member@example.com',
          email_verified: true,
        },
        header: { alg: 'ES256', typ: 'JWT' },
        signature: new Uint8Array(),
      },
      error: null,
    }));
    const provider = new SupabaseAuthProvider(
      { auth: { getClaims } } as unknown as SupabaseClient<Database>,
      { jwtSecret: null, issuer },
    );
    const header = Buffer.from(JSON.stringify({ alg: 'ES256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ sub: userId })).toString('base64url');
    const token = `${header}.${payload}.sig`;

    const identity = await provider.getUserFromAccessToken(token);

    expect(getClaims).toHaveBeenCalledWith(token);
    expect(identity.userId).toBe(userId);
    expect(identity.email?.value).toBe('member@example.com');
  });
});
