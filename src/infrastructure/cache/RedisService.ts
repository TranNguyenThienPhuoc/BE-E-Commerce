import Redis from 'ioredis';
import { config } from '@/config';

export class RedisService {
  private client: Redis | null = null;

  constructor() {
    if (config.redisUrl) {
      try {
        this.client = new Redis(config.redisUrl, {
          maxRetriesPerRequest: 3,
          retryStrategy(times) {
            if (times > 3) {
              return null; // Stop retrying
            }
            return Math.min(times * 50, 2000);
          }
        });
        
        this.client.on('error', (err) => {
          console.warn('Redis connection error:', err.message);
        });
        
        this.client.on('connect', () => {
          console.log('Successfully connected to Redis');
        });
      } catch (err) {
        console.warn('Failed to initialize Redis client:', err);
      }
    } else {
      console.warn('REDIS_URL is not configured. Caching will be disabled.');
    }
  }

  public isEnabled(): boolean {
    return this.client !== null;
  }

  /**
   * Lấy giá trị từ Cache theo Key
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.client) return null;
    try {
      const data = await this.client.get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (err) {
      console.warn(`Redis get error for key ${key}:`, err);
      return null;
    }
  }

  /**
   * Lưu giá trị vào Cache
   */
  async set(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
    if (!this.client) return;
    try {
      const stringValue = JSON.stringify(value);
      await this.client.set(key, stringValue, 'EX', ttlSeconds);
    } catch (err) {
      console.warn(`Redis set error for key ${key}:`, err);
    }
  }

  /**
   * Xóa một Cache Key cụ thể
   */
  async del(key: string): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.del(key);
    } catch (err) {
      console.warn(`Redis del error for key ${key}:`, err);
    }
  }

  /**
   * Xóa tất cả các Key khớp với một Pattern nhất định (VD: products:*)
   */
  async delPattern(pattern: string): Promise<void> {
    if (!this.client) return;
    try {
      let cursor = '0';
      do {
        const result = await this.client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = result[0];
        const keys = result[1];
        if (keys.length > 0) {
          await this.client.del(...keys);
        }
      } while (cursor !== '0');
    } catch (err) {
      console.warn(`Redis delPattern error for pattern ${pattern}:`, err);
    }
  }
}
