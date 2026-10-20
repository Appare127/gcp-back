import fs from 'fs';
import path from 'path';

/**
 * FireHOL Level 1 (IPv4) 線上黑名單來源網址 (無誤判、嚴重威脅黑名單)
 */
const FIREHOL_LEVEL1_URL =
  'https://raw.githubusercontent.com/firehol/blocklist-ipsets/master/firehol_level1.netset';

/**
 * FireHOL Level 2 (IPv4) 線上黑名單來源網址 (過去 48 小時活躍攻擊來源)
 */
const FIREHOL_LEVEL2_URL =
  'https://raw.githubusercontent.com/firehol/blocklist-ipsets/master/firehol_level2.netset';

/**
 * Spamhaus DROPv6 (IPv6) 線上黑名單來源網址
 */
const SPAMHAUS_DROPV6_URL = 'https://www.spamhaus.org/drop/dropv6.txt';

/**
 * 本機快取備份路徑 (避免斷網或外部服務異常時無法運作)
 */
const FIREHOL_LEVEL1_BACKUP_PATH = path.join(
  process.cwd(),
  'data/firehol_level1.netset'
);
const FIREHOL_LEVEL2_BACKUP_PATH = path.join(
  process.cwd(),
  'data/firehol_level2.netset'
);

const SPAMHAUS_BACKUP_PATH = path.join(
  process.cwd(),
  'data/spamhaus_dropv6.txt'
);

/**
 * 記憶體快取有效期 (12 小時，毫秒)
 */
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;

/**
 * 單一 IP 查詢結果介面
 */
export interface FireholIpCheckResult {
  /** IP 地址 */
  ip: string;
  /** 是否被列入黑名單 */
  isListed: boolean;
  /** 是否命中 FireHOL Level 1 惡意黑名單 */
  ipv4ListedLevel1: boolean;
  /** 是否命中 FireHOL Level 2 惡意黑名單 */
  ipv4ListedLevel2: boolean;
  /** 是否命中 Spamhaus DROPv6 惡意黑名單 */
  ipv6SpamhausListed: boolean;
  /** 最後更新時間 */
  lastUpdated: string;
  /** 提示訊息 */
  message: string;
}

/**
 * FireHOL IPv4 記憶體快取容器
 */
interface FireholCache {
  ranges: [number, number][];
  lastUpdated: Date;
  source: 'online' | 'local_backup';
}

/**
 * Spamhaus IPv6 記憶體快取容器
 */
interface SpamhausCache {
  ranges: [bigint, bigint][];
  lastUpdated: Date;
  source: 'online' | 'local_backup';
}

let cachedFireholLevel1: FireholCache | null = null;
let lastFireholLevel1FetchTimeMs = 0;

let cachedFireholLevel2: FireholCache | null = null;
let lastFireholLevel2FetchTimeMs = 0;

let cachedSpamhaus: SpamhausCache | null = null;
let lastSpamhausFetchTimeMs = 0;

import {
  ipToNumber,
  ipv6ToBigInt,
  parseCidrToRange,
  parseIpv6CidrToRange,
  isIpNumberInRanges,
  isIpv6InRanges
} from '@/utils/ipUtils';

// 重新匯出以維持既有匯出介面相容
export {
  ipToNumber,
  ipv6ToBigInt,
  parseCidrToRange,
  parseIpv6CidrToRange,
  isIpNumberInRanges,
  isIpv6InRanges
};

/**
 * 解析 FireHOL netset 格式文字並合併區間
 */
function parseAndMergeNetsetText(text: string): [number, number][] {
  const rawRanges: [number, number][] = [];
  const lines = text.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const range = parseCidrToRange(trimmed);
    if (range) {
      rawRanges.push(range);
    }
  }

  rawRanges.sort((a, b) => a[0] - b[0]);

  const merged: [number, number][] = [];
  for (const r of rawRanges) {
    if (merged.length === 0) {
      merged.push(r);
      continue;
    }
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1] + 1) {
      last[1] = Math.max(last[1], r[1]);
    } else {
      merged.push(r);
    }
  }

  return merged;
}

/**
 * 解析 Spamhaus DROPv6 格式文字並合併區間
 */
function parseAndMergeSpamhausDropv6(text: string): [bigint, bigint][] {
  const rawRanges: [bigint, bigint][] = [];
  const lines = text.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith(';')) {
      continue;
    }
    const range = parseIpv6CidrToRange(trimmed);
    if (range) {
      rawRanges.push(range);
    }
  }

  rawRanges.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));

  const merged: [bigint, bigint][] = [];
  for (const r of rawRanges) {
    if (merged.length === 0) {
      merged.push(r);
      continue;
    }
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1] + 1n) {
      last[1] = r[1] > last[1] ? r[1] : last[1];
    } else {
      merged.push(r);
    }
  }

  return merged;
}

/**
 * 取得或更新 FireHOL Level 1 (IPv4) 網段資料
 */
export async function getOrUpdateFireholLevel1Ranges(): Promise<FireholCache> {
  const now = Date.now();

  if (
    cachedFireholLevel1 &&
    now - lastFireholLevel1FetchTimeMs < CACHE_TTL_MS
  ) {
    return cachedFireholLevel1;
  }

  try {
    const response = await fetch(FIREHOL_LEVEL1_URL, {
      signal: AbortSignal.timeout(8000)
    });

    if (response.ok) {
      const text = await response.text();
      const ranges = parseAndMergeNetsetText(text);

      cachedFireholLevel1 = {
        ranges,
        lastUpdated: new Date(),
        source: 'online'
      };
      lastFireholLevel1FetchTimeMs = now;

      fs.promises
        .writeFile(FIREHOL_LEVEL1_BACKUP_PATH, text, 'utf-8')
        .catch(() => {});
      return cachedFireholLevel1;
    }
  } catch {
    // 線上失敗時使用備用
  }

  if (cachedFireholLevel1) {
    return cachedFireholLevel1;
  }

  if (fs.existsSync(FIREHOL_LEVEL1_BACKUP_PATH)) {
    try {
      const text = await fs.promises.readFile(
        FIREHOL_LEVEL1_BACKUP_PATH,
        'utf-8'
      );
      const ranges = parseAndMergeNetsetText(text);

      cachedFireholLevel1 = {
        ranges,
        lastUpdated: new Date(),
        source: 'local_backup'
      };
      lastFireholLevel1FetchTimeMs = now;
      return cachedFireholLevel1;
    } catch {}
  }

  cachedFireholLevel1 = {
    ranges: [],
    lastUpdated: new Date(),
    source: 'local_backup'
  };
  return cachedFireholLevel1;
}

/**
 * 取得或更新 FireHOL Level 2 (IPv4) 網段資料
 */
export async function getOrUpdateFireholLevel2Ranges(): Promise<FireholCache> {
  const now = Date.now();

  if (
    cachedFireholLevel2 &&
    now - lastFireholLevel2FetchTimeMs < CACHE_TTL_MS
  ) {
    return cachedFireholLevel2;
  }

  try {
    const response = await fetch(FIREHOL_LEVEL2_URL, {
      signal: AbortSignal.timeout(8000)
    });

    if (response.ok) {
      const text = await response.text();
      const ranges = parseAndMergeNetsetText(text);

      cachedFireholLevel2 = {
        ranges,
        lastUpdated: new Date(),
        source: 'online'
      };
      lastFireholLevel2FetchTimeMs = now;

      fs.promises
        .writeFile(FIREHOL_LEVEL2_BACKUP_PATH, text, 'utf-8')
        .catch(() => {});
      return cachedFireholLevel2;
    }
  } catch {
    // 線上失敗時使用備用
  }

  if (cachedFireholLevel2) {
    return cachedFireholLevel2;
  }

  if (fs.existsSync(FIREHOL_LEVEL2_BACKUP_PATH)) {
    try {
      const text = await fs.promises.readFile(
        FIREHOL_LEVEL2_BACKUP_PATH,
        'utf-8'
      );
      const ranges = parseAndMergeNetsetText(text);

      cachedFireholLevel2 = {
        ranges,
        lastUpdated: new Date(),
        source: 'local_backup'
      };
      lastFireholLevel2FetchTimeMs = now;
      return cachedFireholLevel2;
    } catch {}
  }

  cachedFireholLevel2 = {
    ranges: [],
    lastUpdated: new Date(),
    source: 'local_backup'
  };
  return cachedFireholLevel2;
}

/**
 * 取得或更新 Spamhaus DROPv6 (IPv6) 網段資料
 */
export async function getOrUpdateSpamhausRanges(): Promise<SpamhausCache> {
  const now = Date.now();

  if (cachedSpamhaus && now - lastSpamhausFetchTimeMs < CACHE_TTL_MS) {
    return cachedSpamhaus;
  }

  try {
    const response = await fetch(SPAMHAUS_DROPV6_URL, {
      signal: AbortSignal.timeout(8000)
    });

    if (response.ok) {
      const text = await response.text();
      const ranges = parseAndMergeSpamhausDropv6(text);

      cachedSpamhaus = {
        ranges,
        lastUpdated: new Date(),
        source: 'online'
      };
      lastSpamhausFetchTimeMs = now;

      fs.promises
        .writeFile(SPAMHAUS_BACKUP_PATH, text, 'utf-8')
        .catch(() => {});
      return cachedSpamhaus;
    }
  } catch {
    // 線上失敗時使用備用
  }

  if (cachedSpamhaus) {
    return cachedSpamhaus;
  }

  if (fs.existsSync(SPAMHAUS_BACKUP_PATH)) {
    try {
      const text = await fs.promises.readFile(SPAMHAUS_BACKUP_PATH, 'utf-8');
      const ranges = parseAndMergeSpamhausDropv6(text);

      cachedSpamhaus = {
        ranges,
        lastUpdated: new Date(),
        source: 'local_backup'
      };
      lastSpamhausFetchTimeMs = now;
      return cachedSpamhaus;
    } catch {}
  }

  cachedSpamhaus = {
    ranges: [],
    lastUpdated: new Date(),
    source: 'local_backup'
  };
  return cachedSpamhaus;
}

/**
 * 查詢單一 IP 是否在黑名單中 (IPv4 比對 FireHOL，IPv6 比對 Spamhaus DROPv6)
 */
export async function checkSingleIpFirehol(
  ip: string
): Promise<FireholIpCheckResult> {
  // 1. 若為 IPv6
  if (ip.includes(':')) {
    const ipBigInt = ipv6ToBigInt(ip);
    if (ipBigInt === null) {
      return {
        ip,
        isListed: false,
        ipv4ListedLevel1: false,
        ipv4ListedLevel2: false,
        ipv6SpamhausListed: false,
        lastUpdated: new Date().toISOString(),
        message: '輸入的 IPv6 格式無效'
      };
    }

    const { ranges, lastUpdated } = await getOrUpdateSpamhausRanges();
    const ipv6SpamhausListed = isIpv6InRanges(ipBigInt, ranges);
    const ipv4ListedLevel1 = false;
    const ipv4ListedLevel2 = false;
    const isListed = ipv4ListedLevel1 || ipv4ListedLevel2 || ipv6SpamhausListed;

    const message = isListed
      ? '⚠️ 該 IPv6 命中 Spamhaus DROPv6 惡意黑名單'
      : '✅ 該 IPv6 未在 Spamhaus DROPv6 黑名單中';

    return {
      ip,
      isListed,
      ipv4ListedLevel1,
      ipv4ListedLevel2,
      ipv6SpamhausListed,
      lastUpdated: lastUpdated.toISOString(),
      message
    };
  }

  // 2. 若為 IPv4
  const ipNum = ipToNumber(ip);
  if (ipNum === null) {
    return {
      ip,
      isListed: false,
      ipv4ListedLevel1: false,
      ipv4ListedLevel2: false,
      ipv6SpamhausListed: false,
      lastUpdated: new Date().toISOString(),
      message: '輸入的 IPv4 格式無效'
    };
  }

  // 同步比對 Level 1 與 Level 2
  const [level1, level2] = await Promise.all([
    getOrUpdateFireholLevel1Ranges(),
    getOrUpdateFireholLevel2Ranges()
  ]);

  const ipv4ListedLevel1 = isIpNumberInRanges(ipNum, level1.ranges);
  const ipv4ListedLevel2 = isIpNumberInRanges(ipNum, level2.ranges);
  const ipv6SpamhausListed = false;
  const isListed = ipv4ListedLevel1 || ipv4ListedLevel2 || ipv6SpamhausListed;

  let message = '✅ 該 IP 未在黑名單中';
  if (ipv4ListedLevel1 && ipv4ListedLevel2) {
    message = '⚠️ 該 IPv4 命中 FireHOL Level 1 與 Level 2 惡意黑名單';
  } else if (ipv4ListedLevel1) {
    message = '⚠️ 該 IPv4 命中 FireHOL Level 1 嚴重惡意黑名單 (確認威脅)';
  } else if (ipv4ListedLevel2) {
    message =
      '⚠️ 該 IPv4 命中 FireHOL Level 2 惡意黑名單 (近 48 小時活躍攻擊來源)';
  }

  return {
    ip,
    isListed,
    ipv4ListedLevel1,
    ipv4ListedLevel2,
    ipv6SpamhausListed,
    lastUpdated: level1.lastUpdated.toISOString(),
    message
  };
}
