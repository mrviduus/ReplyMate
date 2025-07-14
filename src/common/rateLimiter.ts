/**
 * Rate Limiter using Token Bucket Algorithm
 * Implements rate limiting with burst capability
 */

export interface RateLimiterConfig {
  /** Maximum number of tokens in the bucket (burst capacity) */
  maxTokens: number;
  /** Rate at which tokens are refilled (tokens per second) */
  refillRate: number;
}

export class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly config: RateLimiterConfig;

  constructor(config: RateLimiterConfig) {
    this.config = config;
    this.tokens = config.maxTokens;
    this.lastRefill = Date.now();
  }

  /**
   * Attempts to consume a token from the bucket
   * @returns true if request is allowed, false if rate limited
   */
  public allowRequest(): boolean {
    this.refillTokens();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }

    return false;
  }

  /**
   * Refills tokens based on elapsed time since last refill
   */
  private refillTokens(): void {
    const now = Date.now();
    const timeSinceLastRefill = (now - this.lastRefill) / 1000; // Convert to seconds
    const tokensToAdd = timeSinceLastRefill * this.config.refillRate;

    this.tokens = Math.min(this.config.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  /**
   * Gets the current number of tokens in the bucket
   * @returns Current token count
   */
  public getTokenCount(): number {
    this.refillTokens();
    return this.tokens;
  }

  /**
   * Resets the rate limiter to initial state
   */
  public reset(): void {
    this.tokens = this.config.maxTokens;
    this.lastRefill = Date.now();
  }
}

// Default rate limiter instance: 1 request every 5 seconds, burst of 3
export const defaultRateLimiter = new RateLimiter({
  maxTokens: 3,     // Burst capacity of 3 requests
  refillRate: 0.2   // 1 token every 5 seconds (1/5 = 0.2)
});
