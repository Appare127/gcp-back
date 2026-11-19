import prisma from '../prisma';
import redis from '../redis';

export type DependencyStatus = 'up' | 'down';

export interface DependencyCheckResult {
  status: DependencyStatus;
  latencyMs: number;
}

export interface HealthCheckReport {
  success: boolean;
  status: 'ok' | 'error';
  commit: string;
  timestamp: string;
  uptime: number;
  checks: {
    database: DependencyCheckResult;
    redis: DependencyCheckResult;
  };
}

const CHECK_TIMEOUT_MS = 1500;

/**
 * 為非同步檢查加上超時保護，避免相依服務無回應時阻塞健康檢查端點
 */
async function runWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;

  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(new Error('Health check timeout'));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

/**
 * 檢查單一相依服務的連線狀態與回應延遲
 */
async function checkDependency(
  probe: () => Promise<unknown>
): Promise<DependencyCheckResult> {
  const startTime = Date.now();
  try {
    await runWithTimeout(probe(), CHECK_TIMEOUT_MS);
    return {
      status: 'up',
      latencyMs: Date.now() - startTime
    };
  } catch {
    return {
      status: 'down',
      latencyMs: Date.now() - startTime
    };
  }
}

/**
 * 執行系統健康檢查（資料庫、Redis 與版本資訊）
 * @returns 健康檢查報告
 */
export async function checkHealthService(): Promise<HealthCheckReport> {
  const [database, redisCheck] = await Promise.all([
    checkDependency(() => prisma.$queryRaw`SELECT 1`),
    checkDependency(() => redis.ping())
  ]);

  const isHealthy = database.status === 'up' && redisCheck.status === 'up';

  return {
    success: isHealthy,
    status: isHealthy ? 'ok' : 'error',
    commit: process.env.GIT_COMMIT || 'unknown',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    checks: {
      database,
      redis: redisCheck
    }
  };
}
