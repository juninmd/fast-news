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
