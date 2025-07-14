/**
 * Rate Limiter Tests
 * Tests the token bucket rate limiting functionality
 */

import { RateLimiter } from '../src/common/rateLimiter';

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter;
  
  beforeEach(() => {
    // Create rate limiter with 2 tokens max, refilling 1 token per second
    rateLimiter = new RateLimiter({
      maxTokens: 2,
      refillRate: 1.0
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    test('should initialize with max tokens', () => {
      expect(rateLimiter.getTokenCount()).toBe(2);
    });

    test('should accept custom configuration', () => {
      const customLimiter = new RateLimiter({
        maxTokens: 5,
        refillRate: 0.5
      });
      expect(customLimiter.getTokenCount()).toBe(5);
    });
  });

  describe('allowRequest', () => {
    test('should allow request when tokens available', () => {
      expect(rateLimiter.allowRequest()).toBe(true);
      expect(rateLimiter.getTokenCount()).toBe(1);
    });

    test('should consume tokens on each request', () => {
      expect(rateLimiter.allowRequest()).toBe(true); // 2 -> 1
      expect(rateLimiter.allowRequest()).toBe(true); // 1 -> 0
      expect(rateLimiter.allowRequest()).toBe(false); // 0, rejected
    });

    test('should reject when no tokens available', () => {
      // Consume all tokens
      rateLimiter.allowRequest();
      rateLimiter.allowRequest();
      
      expect(rateLimiter.allowRequest()).toBe(false);
      expect(rateLimiter.getTokenCount()).toBe(0);
    });

    test('should handle burst capacity correctly', () => {
      const burstLimiter = new RateLimiter({
        maxTokens: 3,
        refillRate: 0.2 // 1 token every 5 seconds
      });

      // Should allow 3 rapid requests (burst)
      expect(burstLimiter.allowRequest()).toBe(true);
      expect(burstLimiter.allowRequest()).toBe(true);
      expect(burstLimiter.allowRequest()).toBe(true);
      
      // 4th request should be rejected
      expect(burstLimiter.allowRequest()).toBe(false);
    });
  });

  describe('Token Refill', () => {
    test('should refill tokens over time', async () => {
      // Consume all tokens
      rateLimiter.allowRequest();
      rateLimiter.allowRequest();
      expect(rateLimiter.getTokenCount()).toBe(0);

      // Mock time passing (1 second = 1 token)
      const originalNow = Date.now;
      Date.now = jest.fn(() => originalNow() + 1000);

      expect(rateLimiter.getTokenCount()).toBe(1);
      expect(rateLimiter.allowRequest()).toBe(true);

      // Restore Date.now
      Date.now = originalNow;
    });

    test('should not exceed max tokens when refilling', async () => {
      // Mock time passing way beyond max tokens
      const originalNow = Date.now;
      Date.now = jest.fn(() => originalNow() + 10000); // 10 seconds

      expect(rateLimiter.getTokenCount()).toBe(2); // Should cap at maxTokens
      
      // Restore Date.now
      Date.now = originalNow;
    });

    test('should handle partial token refill', async () => {
      // Consume all tokens
      rateLimiter.allowRequest();
      rateLimiter.allowRequest();

      // Mock 0.5 seconds passing (0.5 tokens)
      const originalNow = Date.now;
      Date.now = jest.fn(() => originalNow() + 500);

      expect(rateLimiter.getTokenCount()).toBe(0.5);
      expect(rateLimiter.allowRequest()).toBe(false); // Need >= 1 token

      // Restore Date.now
      Date.now = originalNow;
    });
  });

  describe('getTokenCount', () => {
    test('should return current token count', () => {
      expect(rateLimiter.getTokenCount()).toBe(2);
      rateLimiter.allowRequest();
      expect(rateLimiter.getTokenCount()).toBe(1);
    });

    test('should trigger refill when called', () => {
      rateLimiter.allowRequest();
      rateLimiter.allowRequest();
      expect(rateLimiter.getTokenCount()).toBe(0);

      // Mock time passing
      const originalNow = Date.now;
      Date.now = jest.fn(() => originalNow() + 1000);

      expect(rateLimiter.getTokenCount()).toBe(1);
      
      // Restore Date.now
      Date.now = originalNow;
    });
  });

  describe('reset', () => {
    test('should reset to initial state', () => {
      // Consume tokens
      rateLimiter.allowRequest();
      rateLimiter.allowRequest();
      expect(rateLimiter.getTokenCount()).toBe(0);

      // Reset
      rateLimiter.reset();
      expect(rateLimiter.getTokenCount()).toBe(2);
      expect(rateLimiter.allowRequest()).toBe(true);
    });
  });

  describe('Real-world scenarios', () => {
    test('should handle LinkedIn comment generation rate limiting', () => {
      // Create limiter matching Step 7 requirements: 1 request every 5s, burst 3
      const linkedInLimiter = new RateLimiter({
        maxTokens: 3,
        refillRate: 0.2 // 1/5 = 0.2 tokens per second
      });

      // Allow burst of 3 comments
      expect(linkedInLimiter.allowRequest()).toBe(true);
      expect(linkedInLimiter.allowRequest()).toBe(true);
      expect(linkedInLimiter.allowRequest()).toBe(true);
      
      // 4th should be rejected
      expect(linkedInLimiter.allowRequest()).toBe(false);

      // After 5 seconds, should allow 1 more
      const originalNow = Date.now;
      Date.now = jest.fn(() => originalNow() + 5000);
      
      expect(linkedInLimiter.allowRequest()).toBe(true);
      expect(linkedInLimiter.allowRequest()).toBe(false);
      
      Date.now = originalNow;
    });

    test('should handle edge case with zero refill rate', () => {
      const noRefillLimiter = new RateLimiter({
        maxTokens: 1,
        refillRate: 0
      });

      expect(noRefillLimiter.allowRequest()).toBe(true);
      expect(noRefillLimiter.allowRequest()).toBe(false);

      // Even after time passes, no refill
      const originalNow = Date.now;
      Date.now = jest.fn(() => originalNow() + 10000);
      
      expect(noRefillLimiter.allowRequest()).toBe(false);
      
      Date.now = originalNow;
    });
  });
});
