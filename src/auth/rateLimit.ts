/**
 * ============================================================================
 * PHYSIOCASE — PART B-2: AUTHENTICATION ABUSE & RATE LIMITING PROTECTION
 * ============================================================================
 * 
 * In-memory sliding window rate limiter to prevent brute-force and credential-stuffing
 * attacks on authentication endpoints.
 * 
 * Scope & Limitations:
 * - In-memory implementation suitable for single-process and test runtimes.
 * - Production multi-instance deployments defer distributed state to Redis/centralized key-value store.
 */

interface RateLimitRecord {
  attempts: number;
  firstAttemptAt: number;
  blockedUntil: number | null;
}

export class AuthenticationRateLimiter {
  private attemptsMap: Map<string, RateLimitRecord> = new Map();
  private maxAttempts: number;
  private windowMs: number;
  private blockDurationMs: number;

  constructor(options?: {
    maxAttempts?: number;
    windowMs?: number;
    blockDurationMs?: number;
  }) {
    this.maxAttempts = options?.maxAttempts ?? 5; // Max 5 failed attempts
    this.windowMs = options?.windowMs ?? 15 * 60 * 1000; // 15 minute window
    this.blockDurationMs = options?.blockDurationMs ?? 15 * 60 * 1000; // 15 minute cooldown
  }

  /**
   * Checks whether an authentication attempt is permitted for the given key.
   */
  public check(key: string): { allowed: boolean; retryAfterSeconds?: number } {
    const now = Date.now();
    const record = this.attemptsMap.get(key);

    if (!record) {
      return { allowed: true };
    }

    if (record.blockedUntil && now < record.blockedUntil) {
      const retryAfterSeconds = Math.ceil((record.blockedUntil - now) / 1000);
      return { allowed: false, retryAfterSeconds };
    }

    // Reset window if expired
    if (now - record.firstAttemptAt > this.windowMs) {
      this.attemptsMap.delete(key);
      return { allowed: true };
    }

    return { allowed: true };
  }

  /**
   * Registers a failed authentication attempt.
   */
  public recordFailure(key: string): { blocked: boolean; retryAfterSeconds?: number } {
    const now = Date.now();
    let record = this.attemptsMap.get(key);

    if (!record || now - record.firstAttemptAt > this.windowMs) {
      record = {
        attempts: 1,
        firstAttemptAt: now,
        blockedUntil: null,
      };
      this.attemptsMap.set(key, record);
      return { blocked: false };
    }

    record.attempts += 1;

    if (record.attempts >= this.maxAttempts) {
      record.blockedUntil = now + this.blockDurationMs;
      const retryAfterSeconds = Math.ceil(this.blockDurationMs / 1000);
      return { blocked: true, retryAfterSeconds };
    }

    return { blocked: false };
  }

  /**
   * Resets rate-limiting history upon successful authentication.
   */
  public recordSuccess(key: string): void {
    this.attemptsMap.delete(key);
  }

  /**
   * Clears all tracking records (for testing).
   */
  public clear(): void {
    this.attemptsMap.clear();
  }
}

export const globalAuthRateLimiter = new AuthenticationRateLimiter();
