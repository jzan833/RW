type SlidingWindowRateLimiterOptions = {
  limit: number;
  windowMs: number;
  now?: () => number;
};

export type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

export class SlidingWindowRateLimiter {
  readonly #limit: number;
  readonly #windowMs: number;
  readonly #now: () => number;
  readonly #requests = new Map<string, number[]>();

  constructor({ limit, windowMs, now = Date.now }: SlidingWindowRateLimiterOptions) {
    this.#limit = limit;
    this.#windowMs = windowMs;
    this.#now = now;
  }

  consume(key: string): RateLimitResult {
    const now = this.#now();
    const cutoff = now - this.#windowMs;
    this.#removeExpiredKeys(cutoff);
    const recent = (this.#requests.get(key) ?? []).filter((timestamp) => timestamp > cutoff);

    if (recent.length >= this.#limit) {
      this.#requests.set(key, recent);
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((recent[0] + this.#windowMs - now) / 1_000))
      };
    }

    recent.push(now);
    this.#requests.set(key, recent);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  #removeExpiredKeys(cutoff: number) {
    for (const [key, timestamps] of this.#requests) {
      if (timestamps.every((timestamp) => timestamp <= cutoff)) this.#requests.delete(key);
    }
  }
}
