import { Request, Response } from 'express';
import { query } from '../../database/client.js';
import { getRedis } from '../../services/cache.js';
import { config } from '../../config/env.js';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  dependencies: {
    database: DependencyStatus;
    redis: DependencyStatus;
  };
}

interface DependencyStatus {
  status: 'up' | 'down' | 'degraded';
  latencyMs?: number;
  error?: string;
}

const VERSION = process.env.npm_package_version || '1.0.0';
const startTime = Date.now();

async function checkDatabase(): Promise<DependencyStatus> {
  const start = Date.now();
  try {
    const result = await query('SELECT 1 as health');
    if (result.rowCount && result.rowCount > 0) {
      return { status: 'up', latencyMs: Date.now() - start };
    }
    return { status: 'degraded', error: 'Query returned no rows', latencyMs: Date.now() - start };
  } catch (error) {
    return {
      status: 'down',
      error: error instanceof Error ? error.message : 'Unknown database error',
      latencyMs: Date.now() - start,
    };
  }
}

async function checkRedis(): Promise<DependencyStatus> {
  const start = Date.now();
  try {
    const redis = await getRedis();
    await redis.ping();
    return { status: 'up', latencyMs: Date.now() - start };
  } catch (error) {
    return {
      status: 'down',
      error: error instanceof Error ? error.message : 'Unknown Redis error',
      latencyMs: Date.now() - start,
    };
  }
}

export async function getHealthStatus(): Promise<HealthStatus> {
  const [dbStatus, redisStatus] = await Promise.all([
    checkDatabase(),
    checkRedis(),
  ]);

  const allUp = dbStatus.status === 'up' && redisStatus.status === 'up';
  const allDown = dbStatus.status === 'down' && redisStatus.status === 'down';

  let overallStatus: HealthStatus['status'] = 'healthy';
  if (allDown) {
    overallStatus = 'unhealthy';
  } else if (!allUp) {
    overallStatus = 'degraded';
  }

  return {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: Date.now() - startTime,
    version: VERSION,
    dependencies: {
      database: dbStatus,
      redis: redisStatus,
    },
  };
}

export async function healthHandler(_req: Request, res: Response): Promise<void> {
  try {
    const health = await getHealthStatus();
    const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    console.error('[Health] Check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: Date.now() - startTime,
      version: VERSION,
      error: error instanceof Error ? error.message : 'Health check failed',
    });
  }
}
