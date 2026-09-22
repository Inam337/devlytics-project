import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { RoleKey } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import type { SignOptions } from 'jsonwebtoken';
import { ErrorCode } from '../common/constants/error-codes';
import { AppException } from '../common/exceptions/app.exception';
import { CryptoService } from '../common/services/crypto.service';
import type {
  JwtAccessPayload,
  JwtRefreshPayload,
} from '../common/types/request-context';
import { PrismaService } from '../database/prisma.service';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  tokenType: 'Bearer';
}

export interface IssueTokenInput {
  userId: string;
  email: string;
  organizationId: string;
  roleKey: RoleKey;
  familyId?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Issues, rotates and revokes JWTs.
 *
 * Refresh tokens are opaque random strings; only their SHA-256 hash is stored.
 * Rotation replaces the row and links the successor, so replaying a used token
 * is detectable and revokes the whole family.
 */
@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly crypto: CryptoService,
    private readonly prisma: PrismaService,
  ) {}

  async issue(input: IssueTokenInput): Promise<TokenPair> {
    const accessPayload: JwtAccessPayload = {
      sub: input.userId,
      email: input.email,
      organizationId: input.organizationId,
      roleKey: input.roleKey,
      type: 'access',
    };

    const expiresIn = this.config.get<string>('jwt.expiresIn', '15m');
    const accessToken = await this.jwt.signAsync(accessPayload, {
      secret: this.config.getOrThrow<string>('jwt.secret'),
      expiresIn: expiresIn as SignOptions['expiresIn'],
    });

    const familyId = input.familyId ?? randomUUID();
    const jti = randomUUID();
    const refreshExpiresIn = this.config.get<string>(
      'jwt.refreshExpiresIn',
      '7d',
    );

    const refreshPayload: JwtRefreshPayload = {
      sub: input.userId,
      organizationId: input.organizationId,
      familyId,
      jti,
      type: 'refresh',
    };

    const refreshToken = await this.jwt.signAsync(refreshPayload, {
      secret: this.config.getOrThrow<string>('jwt.refreshSecret'),
      expiresIn: refreshExpiresIn as SignOptions['expiresIn'],
    });

    await this.prisma.refreshToken.create({
      data: {
        id: jti,
        userId: input.userId,
        organizationId: input.organizationId,
        familyId,
        tokenHash: this.crypto.hashToken(refreshToken),
        expiresAt: this.expiryFromNow(refreshExpiresIn),
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    });

    return { accessToken, refreshToken, expiresIn, tokenType: 'Bearer' };
  }

  /**
   * Verifies a refresh token and returns the record it belongs to. A token that
   * verifies but is already revoked means the family has been stolen, so every
   * sibling token is revoked too.
   */
  async verifyRefreshToken(refreshToken: string): Promise<JwtRefreshPayload> {
    let payload: JwtRefreshPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtRefreshPayload>(refreshToken, {
        secret: this.config.getOrThrow<string>('jwt.refreshSecret'),
      });
    } catch {
      throw new AppException(
        'Refresh token is invalid or expired',
        ErrorCode.INVALID_REFRESH_TOKEN,
        401,
      );
    }

    if (payload.type !== 'refresh') {
      throw new AppException(
        'Provided token is not a refresh token',
        ErrorCode.INVALID_REFRESH_TOKEN,
        401,
      );
    }

    const record = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: this.crypto.hashToken(refreshToken) },
    });

    if (!record) {
      throw new AppException(
        'Refresh token is not recognised',
        ErrorCode.INVALID_REFRESH_TOKEN,
        401,
      );
    }

    if (record.revokedAt) {
      await this.revokeFamily(record.familyId);
      throw new AppException(
        'Refresh token has already been used — all sessions in this family were revoked',
        ErrorCode.INVALID_REFRESH_TOKEN,
        401,
      );
    }

    if (record.expiresAt < new Date()) {
      throw new AppException(
        'Refresh token has expired',
        ErrorCode.TOKEN_EXPIRED,
        401,
      );
    }

    return payload;
  }

  /** Marks the presented token as used and links it to its successor. */
  async rotate(usedToken: string, replacementId: string): Promise<void> {
    await this.prisma.refreshToken.update({
      where: { tokenHash: this.crypto.hashToken(usedToken) },
      data: { revokedAt: new Date(), replacedById: replacementId },
    });
  }

  async revoke(refreshToken: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: {
        tokenHash: this.crypto.hashToken(refreshToken),
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
  }

  async revokeFamily(familyId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** Converts a `15m` / `7d` style duration into an absolute expiry. */
  private expiryFromNow(duration: string): Date {
    const match = /^(\d+)\s*([smhd])$/.exec(duration.trim());
    if (!match) return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const value = Number(match[1]);
    const unitMs =
      { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[match[2]] ??
      86_400_000;
    return new Date(Date.now() + value * unitMs);
  }
}
