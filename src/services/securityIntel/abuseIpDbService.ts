import dotenv from 'dotenv';
import redis from '@/redis';

dotenv.config();

/**
 * AbuseIPDB 查詢結果介面
 */
export interface AbuseIpDbResult {
  /** IP 地址 */
  ip: string;
  /** 惡意信任分數 (0-100)，分數越高越可疑 */
  abuseConfidenceScore: number | null;
  /** 總報告數 */
  totalReports: number;
  /** 用途類型 */
  usageType: string;
  /** 最後報告時間 */
  lastReportedAt: string | null;
  /** 是否被列入白名單 */
  isWhitelisted: boolean | null;
  /** 關聯網域 */
  domain: string;
  /** 網路服務供應商 */
  isp: string;
  /** 查詢狀態 */
  status:
    | 'cached'
    | 'live'
    | 'quota_exceeded'
    | 'error'
    | 'not_checked'
    | 'key_missing';
}

/**
 * 預設未受威脅或未檢查的安全結果
 */
function createDefaultAbuseResult(
  ip: string,
  status: AbuseIpDbResult['status']
): AbuseIpDbResult {
  return {
    ip,
    abuseConfidenceScore: null,
    totalReports: 0,
    usageType: '',
    lastReportedAt: null,
    isWhitelisted: null,
    domain: '',
    isp: '',
    status
  };
}

/**
 * 延遲指定毫秒之非同步等待函式
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 從 Redis 快取中安全取得單一 IP 的 AbuseIPDB 結果
 */
async function getCachedAbuseIp(ip: string): Promise<AbuseIpDbResult | null> {
  try {
    const raw = await redis.get(`abuseipdb:${ip}`);
    if (raw) {
      const parsed = JSON.parse(raw) as AbuseIpDbResult;
      parsed.status = 'cached';
      return parsed;
    }
  } catch (err) {
    // Redis 讀取失敗時降級忽略，不阻斷主流程
  }
  return null;
}

/**
 * 將 AbuseIPDB 結果安全存入 Redis 快取 (預設 TTL 24 小時)
 */
async function setCachedAbuseIp(
  ip: string,
  data: AbuseIpDbResult,
  ttlSeconds = 86400
): Promise<void> {
  try {
    await redis.set(`abuseipdb:${ip}`, JSON.stringify(data), 'EX', ttlSeconds);
  } catch (err) {
    // Redis 寫入失敗時降級忽略
  }
}

/**
 * 查詢單一 IP 的 AbuseIPDB 威脅情報 (優先讀取 Redis 快取，若無則請求官方 API)
 */
export async function checkSingleIpAbuseDb(
  ip: string
): Promise<AbuseIpDbResult> {
  // 1. 先查 Redis 快取
  const cached = await getCachedAbuseIp(ip);
  if (cached) {
    return cached;
  }

  // 2. 檢查 API Key 是否配置
  const apiKey = process.env.ABUSEIPDB_API_KEY;
  if (!apiKey) {
    return createDefaultAbuseResult(ip, 'key_missing');
  }

  // 3. 發起 API 查詢
  try {
    const url = `https://api.abuseipdb.com/api/v2/check?ipAddress=${encodeURIComponent(
      ip
    )}&maxAgeInDays=90`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Key: apiKey,
        Accept: 'application/json'
      },
      signal: AbortSignal.timeout(8000)
    });

    // 處理 429 配額超額
    if (response.status === 429) {
      const quotaResult = createDefaultAbuseResult(ip, 'quota_exceeded');
      // 將配額超額快取 1 小時，避免短時間內狂打被封鎖
      await setCachedAbuseIp(ip, quotaResult, 3600);
      return quotaResult;
    }

    if (!response.ok) {
      return createDefaultAbuseResult(ip, 'error');
    }

    const json = (await response.json()) as {
      data?: {
        ipAddress: string;
        abuseConfidenceScore: number;
        totalReports: number;
        usageType: string | null;
        lastReportedAt: string | null;
        isWhitelisted: boolean;
        domain: string | null;
        isp: string | null;
      };
    };

    if (!json.data) {
      return createDefaultAbuseResult(ip, 'error');
    }

    const d = json.data;
    const result: AbuseIpDbResult = {
      ip,
      abuseConfidenceScore: d.abuseConfidenceScore ?? 0,
      totalReports: d.totalReports ?? 0,
      usageType: d.usageType || '',
      lastReportedAt: d.lastReportedAt || null,
      isWhitelisted: d.isWhitelisted ?? false,
      domain: d.domain || '',
      isp: d.isp || '',
      status: 'live'
    };

    // 存入 Redis 快取 24 小時
    await setCachedAbuseIp(ip, result, 86400);

    return result;
  } catch (err) {
    return createDefaultAbuseResult(ip, 'error');
  }
}

/**
 * 批次查詢多個 IP 的 AbuseIPDB 威脅情報
 * @param ips 欲查詢的 IP 陣列
 * @param maxApiFetchLimit 針對快取未命中之 IP，允許發起外部 API 請求的上限 (避免每日 1,000 次配額被刷爆)
 */
export async function batchCheckAbuseDb(
  ips: string[],
  maxApiFetchLimit = 50
): Promise<Map<string, AbuseIpDbResult>> {
  const resultMap = new Map<string, AbuseIpDbResult>();
  if (ips.length === 0) {
    return resultMap;
  }

  // 去除重複 IP
  const uniqueIps = Array.from(new Set(ips));

  // 1. 批次從 Redis 查詢快取 (使用 mget 降低網路延遲)
  const redisKeys = uniqueIps.map((ip) => `abuseipdb:${ip}`);
  let cachedValues: (string | null)[] = [];
  try {
    cachedValues = await redis.mget(...redisKeys);
  } catch (err) {
    cachedValues = new Array(uniqueIps.length).fill(null);
  }

  const missedIps: string[] = [];

  for (let i = 0; i < uniqueIps.length; i++) {
    const ip = uniqueIps[i];
    if (!ip) continue;
    const raw = cachedValues[i];

    if (raw) {
      try {
        const parsed = JSON.parse(raw) as AbuseIpDbResult;
        parsed.status = 'cached';
        resultMap.set(ip, parsed);
        continue;
      } catch {}
    }

    missedIps.push(ip);
  }

  // 2. 對於未命中的 IP，依限制配額依序發起請求
  const ipsToFetch = missedIps.slice(0, maxApiFetchLimit);
  const remainingIps = missedIps.slice(maxApiFetchLimit);

  // 標記超過 API 配額上限者為 not_checked
  for (const ip of remainingIps) {
    resultMap.set(ip, createDefaultAbuseResult(ip, 'not_checked'));
  }

  // 若無 API Key，直接全部標記為 key_missing
  const apiKey = process.env.ABUSEIPDB_API_KEY;
  if (!apiKey) {
    for (const ip of ipsToFetch) {
      resultMap.set(ip, createDefaultAbuseResult(ip, 'key_missing'));
    }
    return resultMap;
  }

  // 限制併發數 (每次最多 2 個同時請求，且每批之間間隔 200ms 避免觸發 AbuseIPDB 速率限制)
  const concurrency = 2;
  for (let i = 0; i < ipsToFetch.length; i += concurrency) {
    const chunk = ipsToFetch.slice(i, i + concurrency);
    const chunkPromises = chunk.map(async (ip) => {
      const res = await checkSingleIpAbuseDb(ip);
      resultMap.set(ip, res);
    });
    await Promise.all(chunkPromises);

    // 若還有後續批次待處理，等待 200ms 間隔
    if (i + concurrency < ipsToFetch.length) {
      await sleep(200);
    }
  }

  return resultMap;
}
