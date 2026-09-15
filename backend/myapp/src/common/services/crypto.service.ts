import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const BCRYPT_ROUNDS = 12;

/**
 * The one place secrets are hashed, encrypted or compared. Git tokens, AI API
 * keys, webhook secrets, passwords and refresh tokens all go through here so no
 * module reimplements crypto.
 */
@Injectable()
export class CryptoService {
  private readonly logger = new Logger(CryptoService.name);
  private readonly key: Buffer;

  constructor(private readonly config: ConfigService) {
    const raw = this.config.getOrThrow<string>('security.encryptionKey');
    // Derive a fixed 32-byte key so any sufficiently long secret works.
    this.key = createHash('sha256').update(raw).digest();
  }

  // --- password hashing -----------------------------------------------------

  hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, BCRYPT_ROUNDS);
  }

  comparePassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }

  // --- opaque token hashing (refresh + password reset) ----------------------

  /** Random URL-safe token returned to the client exactly once. */
  generateToken(bytes = 48): string {
    return randomBytes(bytes).toString('base64url');
  }

  /** Deterministic hash stored in the database; the raw token never is. */
  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  // --- symmetric encryption for provider credentials ------------------------

  encrypt(plain: string | null | undefined): string | null {
    if (!plain) return null;
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64');
  }

  decrypt(payload: string | null | undefined): string | null {
    if (!payload) return null;
    try {
      const buffer = Buffer.from(payload, 'base64');
      const iv = buffer.subarray(0, IV_LENGTH);
      const authTag = buffer.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
      const encrypted = buffer.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
      const decipher = createDecipheriv(ALGORITHM, this.key, iv);
      decipher.setAuthTag(authTag);
      return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
    } catch {
      this.logger.error('Failed to decrypt stored credential — encryption key may have changed');
      return null;
    }
  }

  // --- webhook signatures ---------------------------------------------------

  /** Constant-time comparison used for webhook signature validation. */
  safeEqual(a: string, b: string): boolean {
    const bufferA = Buffer.from(a);
    const bufferB = Buffer.from(b);
    if (bufferA.length !== bufferB.length) return false;
    return timingSafeEqual(bufferA, bufferB);
  }
}
