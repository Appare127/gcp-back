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

// 相容舊常數名稱
const FIREHOL_URL = FIREHOL_LEVEL1_URL;

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
const FIREHOL_BACKUP_PATH = FIREHOL_LEVEL1_BACKUP_PATH;

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
  ip: string;
  isListed: boolean;
  threatLevel: string;
  source: string;
  lastUpdated: string;
  message: string;
}

/**
 * CSV 批次分析結果中的命中 IP 項目
 */
export interface FireholListedIpItem {
  ip: string;
  requests: number;
  source?: string;
}

/**
 * CSV 批次分析結果介面
 */
export interface FireholCsvAnalysisResult {
  overview: {
    totalIpCount: number;
    ipv4Count: number;
    ipv6Count: number;
    totalRequestCount: number;
    invalidCount: number;
    listedIpCount: number;
    listedRequestCount: number;
    listedIpRatio: string;
    listedRequestRatio: string;
    durationMs: number;
    source: string;
    lastUpdated: string;
    level1Count?: number;
    level2Count?: number;
    spamhausCount?: number;
  };
  listedIps: FireholListedIpItem[];
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

/**
 * 將 IPv4 字串轉為數值
 */
function ipToNumber(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) {
    return null;
  }
  const a = Number(parts[0]);
  const b = Number(parts[1]);
  const c = Number(parts[2]);
  const d = Number(parts[3]);

  if (
    isNaN(a) ||
    isNaN(b) ||
    isNaN(c) ||
    isNaN(d) ||
    a < 0 ||
    a > 255 ||
    b < 0 ||
    b > 255 ||
    c < 0 ||
    c > 255 ||
    d < 0 ||
    d > 255
  ) {
    return null;
  }

  return a * 16777216 + b * 65536 + c * 256 + d;
}

/**
 * 將 IPv6 字串轉為 128 位元 BigInt 數值
 */
function ipv6ToBigInt(ip: string): bigint | null {
  if (!ip || !ip.includes(':')) {
    return null;
  }

  const parts = ip.split('::');
  if (parts.length > 2) {
    return null;
  }

  const head = parts[0] ? parts[0].split(':') : [];
  const tail = parts[1] ? parts[1].split(':') : [];
  const missing = 8 - (head.length + tail.length);

  if (parts.length === 2 && missing < 0) {
    return null;
  }

  const full =
    parts.length === 2
      ? [...head, ...Array(missing).fill('0'), ...tail]
      : head;

  if (full.length !== 8) {
    return null;
  }

  let num = 0n;
  for (const group of full) {
    const val = parseInt(group, 16);
    if (isNaN(val) || val < 0 || val > 0xffff) {
      return null;
    }
    num = (num << 16n) | BigInt(val);
  }

  return num;
}

/**
 * 解析 IPv4 CIDR 或單一 IP 為閉區間數值範圍 [start, end]
 */
function parseCidrToRange(cidr: string): [number, number] | null {
  const parts = cidr.split('/');
  const ipPart = parts[0];
  if (!ipPart) {
    return null;
  }

  const base = ipToNumber(ipPart);
  if (base === null) {
    return null;
  }

  const maskPart = parts[1];
  const mask = maskPart ? parseInt(maskPart, 10) : 32;
  if (isNaN(mask) || mask < 0 || mask > 32) {
    return null;
  }

  const size = Math.pow(2, 32 - mask);
  const start = Math.floor(base / size) * size;
  return [start, start + size - 1];
}

/**
 * 解析 IPv6 CIDR 為閉區間 BigInt 範圍 [start, end]
 */
function parseIpv6CidrToRange(line: string): [bigint, bigint] | null {
  const cleaned = line.split(';')[0]?.trim();
  if (!cleaned) {
    return null;
  }

  const parts = cleaned.split('/');
  const ipPart = parts[0];
  if (!ipPart) {
    return null;
  }

  const base = ipv6ToBigInt(ipPart);
  if (base === null) {
    return null;
  }

  const maskPart = parts[1];
  const mask = maskPart ? parseInt(maskPart, 10) : 128;
  if (isNaN(mask) || mask < 0 || mask > 128) {
    return null;
  }

  const shift = 128n - BigInt(mask);
  const maskBits = (0xffffffffffffffffffffffffffffffffn >> shift) << shift;
  const start = base & maskBits;
  const end = start | ((1n << shift) - 1n);

  return [start, end];
}

/**
 * 二元搜尋檢查 IPv4 數值是否存在於已排序且合併的網段區間中
 */
function isIpNumberInRanges(
  ipNum: number,
  ranges: [number, number][]
): boolean {
  let left = 0;
  let right = ranges.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const range = ranges[mid];
    if (!range) {
      break;
    }
    const [start, end] = range;

    if (ipNum >= start && ipNum <= end) {
      return true;
    }

    if (ipNum < start) {
      right = mid - 1;
    } else {
      left = mid + 1;
    }
  }

  return false;
}

/**
 * 二元搜尋檢查 IPv6 BigInt 數值是否存在於已排序且合併的網段區間中
 */
function isIpv6InRanges(
  ipBigInt: bigint,
  ranges: [bigint, bigint][]
): boolean {
  let left = 0;
  let right = ranges.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const range = ranges[mid];
    if (!range) {
      break;
    }
    const [start, end] = range;

    if (ipBigInt >= start && ipBigInt <= end) {
      return true;
    }

    if (ipBigInt < start) {
      right = mid - 1;
    } else {
      left = mid + 1;
    }
  }

  return false;
}

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

  if (cachedFireholLevel1 && now - lastFireholLevel1FetchTimeMs < CACHE_TTL_MS) {
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
      const text = await fs.promises.readFile(FIREHOL_LEVEL1_BACKUP_PATH, 'utf-8');
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

  if (cachedFireholLevel2 && now - lastFireholLevel2FetchTimeMs < CACHE_TTL_MS) {
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
      const text = await fs.promises.readFile(FIREHOL_LEVEL2_BACKUP_PATH, 'utf-8');
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

// 相容舊函式名稱
export const getOrUpdateFireholRanges = getOrUpdateFireholLevel1Ranges;

/**
 * 取得或更新 Spamhaus DROPv6 (IPv6) 網段資料
 */
async function getOrUpdateSpamhausRanges(): Promise<SpamhausCache> {
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
        threatLevel: 'Invalid IPv6',
        source: 'None',
        lastUpdated: new Date().toISOString(),
        message: '輸入的 IPv6 格式無效'
      };
    }

    const { ranges, lastUpdated, source } = await getOrUpdateSpamhausRanges();
    const isListed = isIpv6InRanges(ipBigInt, ranges);

    return {
      ip,
      isListed,
      threatLevel: isListed ? 'High Risk (Spamhaus DROPv6)' : 'Clean / Not Listed',
      source: `Spamhaus DROPv6 (${source === 'online' ? 'Online Live' : 'Backup'})`,
      lastUpdated: lastUpdated.toISOString(),
      message: isListed
        ? '⚠️ 該 IPv6 命中 Spamhaus DROPv6 惡意黑名單'
        : '✅ 該 IPv6 未在 Spamhaus DROPv6 黑名單中'
    };
  }

  // 2. 若為 IPv4
  const ipNum = ipToNumber(ip);
  if (ipNum === null) {
    return {
      ip,
      isListed: false,
      threatLevel: 'Invalid IPv4',
      source: 'None',
      lastUpdated: new Date().toISOString(),
      message: '輸入的 IPv4 格式無效'
    };
  }

  // 同步比對 Level 1 與 Level 2
  const [level1, level2] = await Promise.all([
    getOrUpdateFireholLevel1Ranges(),
    getOrUpdateFireholLevel2Ranges()
  ]);

  // 優先比對 Level 1 (嚴重/最高信賴度惡意名單)
  const isListedLevel1 = isIpNumberInRanges(ipNum, level1.ranges);
  if (isListedLevel1) {
    return {
      ip,
      isListed: true,
      threatLevel: 'High Risk (FireHOL Level 1)',
      source: `FireHOL Level 1 (${level1.source === 'online' ? 'Online Live' : 'Backup'})`,
      lastUpdated: level1.lastUpdated.toISOString(),
      message: '⚠️ 該 IPv4 命中 FireHOL Level 1 嚴重惡意黑名單 (確認威脅)'
    };
  }

  // 次選比對 Level 2 (近 48 小時活躍攻擊/掃描來源)
  const isListedLevel2 = isIpNumberInRanges(ipNum, level2.ranges);
  if (isListedLevel2) {
    return {
      ip,
      isListed: true,
      threatLevel: 'Medium-High Risk (FireHOL Level 2)',
      source: `FireHOL Level 2 (${level2.source === 'online' ? 'Online Live' : 'Backup'})`,
      lastUpdated: level2.lastUpdated.toISOString(),
      message: '⚠️ 該 IPv4 命中 FireHOL Level 2 惡意黑名單 (近 48 小時活躍攻擊來源)'
    };
  }

  return {
    ip,
    isListed: false,
    threatLevel: 'Clean / Not Listed',
    source: 'FireHOL Level 1 & Level 2',
    lastUpdated: level1.lastUpdated.toISOString(),
    message: '✅ 該 IPv4 未在 FireHOL Level 1 / Level 2 黑名單中'
  };
}

/**
 * 清理 CSV 欄位文字：去除前後空白、雙引號或單引號
 */
function cleanCsvField(field?: string): string {
  if (!field) return '';
  return field
    .trim()
    .replace(/^["']+|["']+$/g, '')
    .trim();
}

/**
 * 安全解析單行 CSV，全面相容雙引號包裹與一般純逗號格式
 */
function parseCsvLine(line: string): [string, string] {
  const parts: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' || char === "'") {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      parts.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  parts.push(current);

  return [cleanCsvField(parts[0]), cleanCsvField(parts[1])];
}

/**
 * 判斷是否為 CSV 的標題列 (相容一般 CSV、帶引號、以及 Kibana/Elasticsearch/繁簡中文等導出格式)
 */
function isCsvHeader(ipStr: string, rawDocCount?: string): boolean {
  const cleanIp = cleanCsvField(ipStr).toLowerCase();
  const cleanCount = cleanCsvField(rawDocCount).toLowerCase();

  // 1. 若首欄包含常見 IP 標題關鍵字
  const ipKeywords = [
    'client_ip',
    'ip',
    'ip_address',
    'ipaddress',
    'clientip',
    'remote_addr',
    'source_ip',
    'src_ip',
    'address',
    'keyword',
    '排名',
    '最前值',
    '地址',
    '位址'
  ];
  if (ipKeywords.some((kw) => cleanIp.includes(kw))) {
    return true;
  }

  // 2. 若次欄包含計數相關標題關鍵字
  if (cleanCount) {
    const countKeywords = [
      'doc_count',
      'count',
      'requests',
      'request_count',
      'total',
      'hits',
      '计数',
      '計數',
      '次數',
      '次数',
      '記錄',
      '记录'
    ];
    if (countKeywords.some((kw) => cleanCount.includes(kw))) {
      return true;
    }
  }

  return false;
}

/**
 * 上傳 CSV 批次比對黑名單 (雙軌全支援：IPv4 比對 FireHOL，IPv6 比對 Spamhaus DROPv6)
 */
export async function analyzeCsvWithFirehol(
  fileBuffer: Buffer
): Promise<FireholCsvAnalysisResult> {
  const startTime = Date.now();

  // 同步預載 IPv4 (Level 1, Level 2) 與 IPv6 雙來源黑名單
  const [fireholL1, fireholL2, spamhaus] = await Promise.all([
    getOrUpdateFireholLevel1Ranges(),
    getOrUpdateFireholLevel2Ranges(),
    getOrUpdateSpamhausRanges()
  ]);

  const content = fileBuffer.toString('utf-8');
  const lines = content.split(/\r?\n/);

  let totalIpCount = 0;
  let ipv4Count = 0;
  let ipv6Count = 0;
  let totalRequestCount = 0;
  let invalidCount = 0;
  let listedIpCount = 0;
  let listedRequestCount = 0;
  let level1Count = 0;
  let level2Count = 0;
  let spamhausCount = 0;
  const listedIps: FireholListedIpItem[] = [];

  for (const line of lines) {
    if (!line.trim()) continue;

    // 安全解析單行 CSV，全面相容引號 (例如 "167.179.111.165",61)
    const [ip, rawDocCount] = parseCsvLine(line);
    const docCount = rawDocCount ? parseInt(rawDocCount, 10) || 1 : 1;

    // 排除標題列 (例如 client_ip,doc_count 或 "client_ip.keyword 排名最前值","记录计数")
    if (isCsvHeader(ip, rawDocCount)) {
      continue;
    }

    // 判斷是否為 IPv6
    if (ip.includes(':')) {
      const ipBigInt = ipv6ToBigInt(ip);
      if (ipBigInt === null) {
        invalidCount++;
        continue;
      }

      totalIpCount++;
      ipv6Count++;
      totalRequestCount += docCount;

      const isListed = isIpv6InRanges(ipBigInt, spamhaus.ranges);
      if (isListed) {
        listedIpCount++;
        listedRequestCount += docCount;
        spamhausCount++;
        listedIps.push({
          ip,
          requests: docCount,
          source: 'Spamhaus DROPv6'
        });
      }
      continue;
    }

    // 判斷是否為 IPv4
    const ipNum = ipToNumber(ip);
    if (ipNum === null) {
      invalidCount++;
      continue;
    }

    totalIpCount++;
    ipv4Count++;
    totalRequestCount += docCount;

    // 優先比對 Level 1
    const inLevel1 = isIpNumberInRanges(ipNum, fireholL1.ranges);
    if (inLevel1) {
      listedIpCount++;
      listedRequestCount += docCount;
      level1Count++;
      listedIps.push({
        ip,
        requests: docCount,
        source: 'FireHOL Level 1'
      });
      continue;
    }

    // 次選比對 Level 2
    const inLevel2 = isIpNumberInRanges(ipNum, fireholL2.ranges);
    if (inLevel2) {
      listedIpCount++;
      listedRequestCount += docCount;
      level2Count++;
      listedIps.push({
        ip,
        requests: docCount,
        source: 'FireHOL Level 2'
      });
    }
  }

  // 依照請求次數排序
  listedIps.sort((a, b) => b.requests - a.requests);

  const listedIpRatio =
    totalIpCount > 0 ? ((listedIpCount / totalIpCount) * 100).toFixed(4) : '0';
  const listedRequestRatio =
    totalRequestCount > 0
      ? ((listedRequestCount / totalRequestCount) * 100).toFixed(4)
      : '0';

  return {
    overview: {
      totalIpCount,
      ipv4Count,
      ipv6Count,
      totalRequestCount,
      invalidCount,
      listedIpCount,
      listedRequestCount,
      listedIpRatio: `${listedIpRatio}%`,
      listedRequestRatio: `${listedRequestRatio}%`,
      durationMs: Date.now() - startTime,
      source: 'FireHOL Level 1 & Level 2 (IPv4) + Spamhaus DROPv6 (IPv6)',
      lastUpdated: new Date().toISOString(),
      level1Count,
      level2Count,
      spamhausCount
    },
    listedIps
  };
}
