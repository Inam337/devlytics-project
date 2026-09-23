import type { ConfigService } from '@nestjs/config';
import type { JwtService } from '@nestjs/jwt';
import { RoleKey } from '@prisma/client';
import type { CryptoService } from '../common/services/crypto.service';
import type { PrismaService } from '../database/prisma.service';
import { TokenService } from './token.service';

/**
 * Exercises the real rotate/verify/revoke logic in TokenService with a mocked
 * Prisma client and a fake (but internally consistent) JwtService, rather than
 * mocking TokenService itself away (as auth.service.spec.ts does). This is the
 * suite the refresh-token-rotation/replay-rejection acceptance criterion asks
 * for — see token.service.ts's class doc: "Rotation replaces the row and links
 * the successor, so replaying a used token is detectable and revokes the whole
 * family."
 */
describe('TokenService', () => {
  let prisma: {
    refreshToken: {
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
  };
  let jwt: { signAsync: jest.Mock; verifyAsync: jest.Mock };
  let crypto: { hashToken: jest.Mock };
  let config: ConfigService;
  let service: TokenService;

  const input = {
    userId: 'user-1',
    email: 'ada@example.com',
    organizationId: 'org-1',
    roleKey: RoleKey.ORGANIZATION_ADMIN,
  };

  function configWith(values: Record<string, unknown>): ConfigService {
    return {
      get: (key: string, fallback?: unknown) =>
        key in values ? values[key] : fallback,
      getOrThrow: (key: string) => {
        if (!(key in values)) {
          throw new Error(`Missing config value for '${key}'`);
        }
        return values[key];
      },
    } as unknown as ConfigService;
  }

  beforeEach(() => {
    prisma = {
      refreshToken: {
        create: jest.fn().mockResolvedValue(undefined),
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue(undefined),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };

    // A stand-in JWT layer: signAsync returns a deterministic token string
    // that encodes the payload, verifyAsync decodes it back and can be made
    // to throw to simulate an expired/tampered/unknown signature.
    jwt = {
      signAsync: jest.fn(async (payload: Record<string, unknown>) =>
        JSON.stringify(payload),
      ),
      verifyAsync: jest.fn(async (token: string) => JSON.parse(token)),
    };

    // hashToken is deterministic per input string so different raw tokens map
    // to different "rows" the way the real SHA-256 hash would.
    crypto = {
      hashToken: jest.fn((token: string) => `hash(${token})`),
    };

    config = configWith({
      'jwt.expiresIn': '15m',
      'jwt.refreshExpiresIn': '7d',
      'jwt.secret': 'access-secret',
      'jwt.refreshSecret': 'refresh-secret',
    });

    service = new TokenService(
      jwt as unknown as JwtService,
      config,
      crypto as unknown as CryptoService,
      prisma as unknown as PrismaService,
    );
  });

  describe('issue', () => {
    it('creates a refreshToken row keyed by the token hash and returns a bearer pair', async () => {
      const pair = await service.issue(input);

      expect(pair.tokenType).toBe('Bearer');
      expect(pair.accessToken).toEqual(expect.any(String));
      expect(pair.refreshToken).toEqual(expect.any(String));

      expect(prisma.refreshToken.create).toHaveBeenCalledTimes(1);
      const data = prisma.refreshToken.create.mock.calls[0][0].data;
      expect(data.userId).toBe('user-1');
      expect(data.organizationId).toBe('org-1');
      expect(data.tokenHash).toBe(`hash(${pair.refreshToken})`);
      expect(data.expiresAt).toBeInstanceOf(Date);
      expect(data.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('reuses the given familyId across a rotation instead of minting a new one', async () => {
      await service.issue({ ...input, familyId: 'family-1' });

      const data = prisma.refreshToken.create.mock.calls[0][0].data;
      expect(data.familyId).toBe('family-1');
    });

    it('generates a fresh familyId when none is supplied', async () => {
      await service.issue(input);
      const data = prisma.refreshToken.create.mock.calls[0][0].data;
      expect(data.familyId).toEqual(expect.any(String));
      expect(data.familyId.length).toBeGreaterThan(0);
    });
  });

  describe('verifyRefreshToken', () => {
    it('succeeds for a valid, unexpired, unrevoked token', async () => {
      const pair = await service.issue(input);
      prisma.refreshToken.findUnique.mockResolvedValue({
        tokenHash: `hash(${pair.refreshToken})`,
        familyId: 'family-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
      });

      const payload = await service.verifyRefreshToken(pair.refreshToken);

      expect(payload.sub).toBe('user-1');
      expect(payload.type).toBe('refresh');
      expect(prisma.refreshToken.findUnique).toHaveBeenCalledWith({
        where: { tokenHash: `hash(${pair.refreshToken})` },
      });
    });

    it('rejects a token whose signature verification throws (expired/tampered/unknown secret)', async () => {
      jwt.verifyAsync.mockRejectedValue(new Error('jwt expired'));

      await expect(
        service.verifyRefreshToken('garbage-or-expired-token'),
      ).rejects.toMatchObject({ code: 'INVALID_REFRESH_TOKEN' });
      expect(prisma.refreshToken.findUnique).not.toHaveBeenCalled();
    });

    it('rejects a well-formed access token presented as a refresh token', async () => {
      const accessLikeToken = JSON.stringify({
        sub: 'user-1',
        type: 'access',
      });

      await expect(
        service.verifyRefreshToken(accessLikeToken),
      ).rejects.toMatchObject({ code: 'INVALID_REFRESH_TOKEN' });
      expect(prisma.refreshToken.findUnique).not.toHaveBeenCalled();
    });

    it('rejects a token that verifies cryptographically but has no matching row (unknown token)', async () => {
      const pair = await service.issue(input);
      prisma.refreshToken.findUnique.mockResolvedValue(null);

      await expect(
        service.verifyRefreshToken(pair.refreshToken),
      ).rejects.toMatchObject({ code: 'INVALID_REFRESH_TOKEN' });
    });

    it('rejects and revokes the whole family when a used (rotated) token is replayed', async () => {
      const pair = await service.issue(input);
      prisma.refreshToken.findUnique.mockResolvedValue({
        tokenHash: `hash(${pair.refreshToken})`,
        familyId: 'family-1',
        revokedAt: new Date(), // already rotated away
        expiresAt: new Date(Date.now() + 60_000),
      });

      await expect(
        service.verifyRefreshToken(pair.refreshToken),
      ).rejects.toMatchObject({ code: 'INVALID_REFRESH_TOKEN' });

      // Replay must nuke every sibling in the family, not just the replayed row.
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { familyId: 'family-1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('rejects an expired token with a distinct TOKEN_EXPIRED code', async () => {
      const pair = await service.issue(input);
      prisma.refreshToken.findUnique.mockResolvedValue({
        tokenHash: `hash(${pair.refreshToken})`,
        familyId: 'family-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() - 60_000),
      });

      await expect(
        service.verifyRefreshToken(pair.refreshToken),
      ).rejects.toMatchObject({ code: 'TOKEN_EXPIRED' });
    });
  });

  describe('rotate', () => {
    it('marks the used token revoked and links it to its successor id', async () => {
      const pair = await service.issue(input);

      await service.rotate(pair.refreshToken, 'new-jti');

      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { tokenHash: `hash(${pair.refreshToken})` },
        data: { revokedAt: expect.any(Date), replacedById: 'new-jti' },
      });
    });

    it('the rotated-away token can no longer verify once its row reflects the revocation', async () => {
      const pair = await service.issue(input);
      await service.rotate(pair.refreshToken, 'new-jti');

      // Simulate the persisted state rotate() would have produced.
      prisma.refreshToken.findUnique.mockResolvedValue({
        tokenHash: `hash(${pair.refreshToken})`,
        familyId: 'family-1',
        revokedAt: new Date(),
        replacedById: 'new-jti',
        expiresAt: new Date(Date.now() + 60_000),
      });

      await expect(
        service.verifyRefreshToken(pair.refreshToken),
      ).rejects.toMatchObject({ code: 'INVALID_REFRESH_TOKEN' });
    });
  });

  describe('revoke', () => {
    it('revokes only the matching, not-already-revoked row', async () => {
      await service.revoke('some-raw-token');

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { tokenHash: 'hash(some-raw-token)', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });

  describe('revokeFamily', () => {
    it('revokes every unrevoked row sharing the familyId', async () => {
      await service.revokeFamily('family-1');

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { familyId: 'family-1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });

  describe('revokeAllForUser', () => {
    it('revokes every unrevoked row for the user, independent of family', async () => {
      await service.revokeAllForUser('user-1');

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });
});
