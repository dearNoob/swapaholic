/**
 * Performance Optimization Configuration
 * Handles caching, compression, and response optimization
 */

const redis = require('redis');
const logger = require('./logger');

class PerformanceOptimizer {
  constructor() {
    this.redisClient = null;
    this.cacheConfig = {
      products: 5 * 60,        // 5 minutes
      bids: 2 * 60,            // 2 minutes
      orders: 3 * 60,          // 3 minutes
      user_profile: 10 * 60,   // 10 minutes
      search: 15 * 60,         // 15 minutes
    };
  }

  /**
   * Initialize Redis connection for caching
   */
  async initCache() {
    try {
      if (process.env.REDIS_URL) {
        this.redisClient = redis.createClient({
          url: process.env.REDIS_URL,
          socket: {
            reconnectStrategy: (retries) => Math.min(retries * 50, 500),
          },
        });

        this.redisClient.on('error', (err) => logger.error('Redis error:', err));
        this.redisClient.on('connect', () => logger.info('✅ Redis connected for caching'));

        await this.redisClient.connect();
      } else {
        logger.warn('Redis not configured - caching disabled');
      }
    } catch (error) {
      logger.error('Failed to initialize cache:', error);
    }
  }

  /**
   * Get cached data
   */
  async getCache(key) {
    if (!this.redisClient?.isOpen) return null;
    try {
      const data = await this.redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set cached data
   */
  async setCache(key, data, ttl = 300) {
    if (!this.redisClient?.isOpen) return false;
    try {
      await this.redisClient.setEx(key, ttl, JSON.stringify(data));
      return true;
    } catch (error) {
      logger.error('Cache set error:', error);
      return false;
    }
  }

  /**
   * Invalidate cache key
   */
  async invalidateCache(key) {
    if (!this.redisClient?.isOpen) return false;
    try {
      await this.redisClient.del(key);
      return true;
    } catch (error) {
      logger.error('Cache invalidation error:', error);
      return false;
    }
  }

  /**
   * Invalidate cache pattern
   */
  async invalidateCachePattern(pattern) {
    if (!this.redisClient?.isOpen) return false;
    try {
      const keys = await this.redisClient.keys(pattern);
      if (keys.length > 0) {
        await this.redisClient.del(keys);
      }
      return true;
    } catch (error) {
      logger.error('Cache pattern invalidation error:', error);
      return false;
    }
  }

  /**
   * Middleware for caching GET requests
   */
  cacheMiddleware(ttl = 300) {
    return async (req, res, next) => {
      // Only cache GET requests
      if (req.method !== 'GET') return next();

      const cacheKey = `${req.originalUrl}:${req.user?.id || 'anonymous'}`;
      
      try {
        const cachedData = await this.getCache(cacheKey);
        if (cachedData) {
          logger.info(`[Cache Hit] ${cacheKey}`);
          return res.json(cachedData);
        }
      } catch (error) {
        logger.error('Cache middleware error:', error);
      }

      // Store original res.json
      const originalJson = res.json.bind(res);
      
      // Override res.json to cache response
      res.json = (data) => {
        this.setCache(cacheKey, data, ttl);
        return originalJson(data);
      };

      next();
    };
  }

  /**
   * Get cache TTL configuration
   */
  getCacheTTL(type) {
    return this.cacheConfig[type] || 300;
  }
}

module.exports = new PerformanceOptimizer();

