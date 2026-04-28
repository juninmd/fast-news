import { createClient, type RedisClientType } from 'redis';
import { config } from '../config/env.js';

let client: RedisClientType | null = null;

export async function getRedis(): Promise<RedisClientType> {
  if (!client) {
    client = createClient({ url: config.redisUrl }) as RedisClientType;
    client.on('error', (err) => console.error('[Redis] Error:', err.message));
    await client.connect();
    console.log('[Redis] Connected.');
  }
  return client;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const redis = await getRedis();
  const value = await redis.get(key);
  if (!value) return null;
  return JSON.parse(value) as T;
}

export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds = 3600
): Promise<void> {
  const redis = await getRedis();
  await redis.set(key, JSON.stringify(value), { EX: ttlSeconds });
}

export async function cacheDel(key: string): Promise<void> {
  const redis = await getRedis();
  await redis.del(key);
}

export async function cacheKeys(pattern: string): Promise<string[]> {
  const redis = await getRedis();
  return redis.keys(pattern);
}

export async function closeRedis(): Promise<void> {
  if (client) {
    await client.quit();
    client = null;
  }
}

const DEFAULT_TTL = 300;
const NEWS_TTL = 60;
const SEARCH_TTL = 600;

export const newsCache = {
  key: (category?: string, page?: number) =>
    `news:list:${category || 'all'}:${page || 1}`,

  async get(category?: string, page?: number): Promise<unknown | null> {
    return cacheGet(this.key(category, page));
  },

  async set(value: unknown, category?: string, page?: number): Promise<void> {
    await cacheSet(this.key(category, page), value, NEWS_TTL);
  },

  async invalidate(): Promise<void> {
    const keys = await cacheKeys('news:*');
    if (keys.length > 0) {
      const redis = await getRedis();
      await redis.del(keys);
    }
  },
};

export const searchCache = {
  key: (query: string, filters?: object) =>
    `search:${Buffer.from(JSON.stringify({ query, filters })).toString('base64').slice(0, 32)}`,

  async get(query: string, filters?: object): Promise<unknown | null> {
    return cacheGet(this.key(query, filters));
  },

  async set(value: unknown, query: string, filters?: object): Promise<void> {
    await cacheSet(this.key(query, filters), value, SEARCH_TTL);
  },
};

export const ragCache = {
  key: (query: string) => `rag:${Buffer.from(query).toString('base64').slice(0, 32)}`,

  async get(query: string): Promise<unknown | null> {
    return cacheGet(this.key(query));
  },

  async set(value: unknown, query: string): Promise<void> {
    await cacheSet(this.key(query), value, DEFAULT_TTL);
  },
};
