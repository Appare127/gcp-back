import type { Request, Response, NextFunction } from 'express';
import redis from '@/redis';
import { AppError } from '@/utils/appError';

export interface RateLimitOptions {
  /** Redis 鍵值前綴，用來區分不同等級的限流規則 */
  prefix: string;
  /** 時間視窗（秒） */
  windowSeconds: number;
  /** 時間視窗內允許的最大請求次數 */
  maxRequests: number;
  /** 超出限制時的提示訊息 */
  message?: string;
}

/**
 * 取得限流識別鍵（已登入優先使用使用者 ID，否則使用真實 IP）
 */
function getClientIdentifier(req: Request): string {
  const user = (req as Request & { user?: { id?: string | number; userId?: string | number } }).user;
  const userId = user?.id ?? user?.userId;
  if (userId !== undefined && userId !== null) {
    return `user:${userId}`;
  }

  const rawIp = req.ip || 'unknown';
  return `ip:${rawIp.replace(/^::ffff:/, '')}`;
}

/**
 * 建立基於 Redis 的請求頻率限制中介軟體
 */
export function createRateLimiter(options: RateLimitOptions) {
  const {
    prefix,
    windowSeconds,
    maxRequests,
    message = '請求過於頻繁，請稍後再試'
  } = options;

  return async function rateLimitMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    const identifier = getClientIdentifier(req);
    const redisKey = `ratelimit:${prefix}:${identifier}`;

    try {
      const currentCount = await redis.incr(redisKey);

      // 第一次請求時設定過期時間，形成固定時間視窗
      if (currentCount === 1) {
        await redis.expire(redisKey, windowSeconds);
      }

      const remaining = Math.max(0, maxRequests - currentCount);
      res.setHeader('X-RateLimit-Limit', String(maxRequests));
      res.setHeader('X-RateLimit-Remaining', String(remaining));

      if (currentCount > maxRequests) {
        res.setHeader('Retry-After', String(windowSeconds));
        return next(new AppError(message, 429));
      }

      next();
    } catch (error) {
      // Redis 暫時異常時不中斷主服務（Fail-Open），僅記錄警告
      console.warn('[RateLimit] Redis 檢查失敗，暫時略過限流:', error);
      next();
    }
  };
}

/** 全域一般 API 限流：每個 IP 每分鐘最多 100 次 */
export const generalApiRateLimiter = createRateLimiter({
  prefix: 'api-general',
  windowSeconds: 60,
  maxRequests: 100,
  message: 'API 請求過於頻繁，請於 1 分鐘後再試'
});

/** 高成本 API 限流（AI / AbuseIPDB / 綜合情資）：每個帳號/IP 每分鐘最多 10 次 */
export const highCostRateLimiter = createRateLimiter({
  prefix: 'api-high-cost',
  windowSeconds: 60,
  maxRequests: 10,
  message: '高成本查詢請求過於頻繁，請於 1 分鐘後再試'
});
