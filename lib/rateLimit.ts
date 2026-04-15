import { redis } from './redis';
import { NextResponse } from 'next/server';

interface RateLimitOptions {
  key: string;
  limit: number;
  windowSeconds: number;
}

/**
 * Redis-backed rate limiter using a simple increment counter.
 * Returns true if the request is within the limit, false if it should be blocked.
 */
export async function checkRateLimit(options: RateLimitOptions): Promise<boolean> {
  const { key, limit, windowSeconds } = options;

  const current = await redis.incr(key);

  if (current === 1) {
    // First request in this window — set the expiry
    await redis.expire(key, windowSeconds);
  }

  return current <= limit;
}

/**
 * Apply rate limiting to an API route handler.
 * Returns a 429 NextResponse if the limit is exceeded.
 */
export async function withRateLimit(
  userId: string,
  action: string,
  options: { limit: number; windowSeconds: number }
): Promise<NextResponse | null> {
  const key = `rl:${action}:${userId}`;
  const allowed = await checkRateLimit({
    key,
    limit: options.limit,
    windowSeconds: options.windowSeconds,
  });

  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.' },
      { status: 429 }
    );
  }

  return null;
}
