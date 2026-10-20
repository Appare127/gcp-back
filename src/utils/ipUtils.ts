import { CityResponse } from 'maxmind';

/**
 * 常見國家與地區 ISO 代碼之繁體中文對照表
 */
export const countryZhMap: Record<string, string> = {
  TW: '台灣',
  JP: '日本',
  US: '美國',
  SG: '新加坡',
  HK: '香港',
  VN: '越南',
  KR: '南韓',
  CN: '中國',
  AU: '澳大利亞',
  GB: '英國',
  DE: '德國',
  FR: '法國',
  CA: '加拿大',
  IN: '印度',
  ID: '印尼',
  MY: '馬來西亞',
  TH: '泰國',
  PH: '菲律賓',
  NL: '荷蘭',
  RU: '俄羅斯',
  BR: '巴西',
  MO: '澳門',
  NZ: '紐西蘭',
  IT: '義大利',
  ES: '西班牙',
  CH: '瑞士',
  SE: '瑞典',
  NO: '挪威',
  FI: '芬蘭',
  DK: '丹麥',
  IE: '愛爾蘭',
  PL: '波蘭',
  AT: '奧地利',
  BE: '比利時',
  CZ: '捷克',
  TR: '土耳其',
  AE: '阿聯酋',
  ZA: '南非',
  MX: '墨西哥',
  AR: '阿根廷',
  CL: '智利',
  CO: '哥倫比亞',
  EG: '埃及',
  IL: '以色列',
  SA: '沙烏地阿拉伯',
  KH: '柬埔寨',
  MM: '緬甸',
  LA: '寮國'
};

/**
 * 格式化國家名稱，將 ISO 代碼與中文名稱組合 (例如 "JP (日本)" 或 "US (美國)")
 * @param countryCode 國家 ISO 兩碼代碼
 * @param cityData MaxMind CityResponse 資料 (可選，作為 fallback 讀取 zh-CN 或英文名稱)
 */
export function formatCountryWithChinese(
  countryCode: string,
  cityData?: CityResponse | null
): string {
  if (!countryCode || countryCode === 'Unknown') {
    return 'Unknown';
  }

  // 1. 優先使用標準繁體中文對照表
  const matchedZh = countryZhMap[countryCode.toUpperCase()];
  if (matchedZh) {
    return `${countryCode} (${matchedZh})`;
  }

  // 2. 次選 GeoLite2 內建中文名稱 (zh-CN)
  const mmdbZh =
    cityData?.country?.names?.['zh-CN'] ||
    cityData?.registered_country?.names?.['zh-CN'];
  if (mmdbZh) {
    return `${countryCode} (${mmdbZh})`;
  }

  // 3. 若無中文則退回英文名稱
  const mmdbEn =
    cityData?.country?.names?.en ||
    cityData?.registered_country?.names?.en;
  if (mmdbEn) {
    return `${countryCode} (${mmdbEn})`;
  }

  return countryCode;
}

/**
 * 將 IPv4 字串轉為 32 位元無號數值
 * @param ip IPv4 字串 (如 "1.1.1.1")
 * @returns 成功返回數值，無效格式返回 null
 */
export function ipToNumber(ip: string): number | null {
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
 * @param ip IPv6 字串 (如 "2001:db8::1")
 * @returns 成功返回 128 位元 BigInt，無效格式返回 null
 */
export function ipv6ToBigInt(ip: string): bigint | null {
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
 * @param cidr CIDR 格式字串 (例如 "192.168.1.0/24")
 */
export function parseCidrToRange(cidr: string): [number, number] | null {
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
 * @param line IPv6 CIDR 格式字串 (例如 "2001:db8::/32")
 */
export function parseIpv6CidrToRange(line: string): [bigint, bigint] | null {
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
 * @param ipNum IPv4 數值
 * @param ranges 已排序且合併的 [start, end] 數值閉區間陣列
 */
export function isIpNumberInRanges(
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
 * @param ipBigInt IPv6 BigInt 數值
 * @param ranges 已排序且合併的 [start, end] BigInt 閉區間陣列
 */
export function isIpv6InRanges(
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
 * 取得 IPv4 之 /24 (Class C) 網段表示法 (例如 1.1.1.0/24)
 * @param ip IPv4 位址
 */
export function getIpv4Subnet24(ip: string): string {
  const lastDotIndex = ip.lastIndexOf('.');
  if (lastDotIndex === -1) return `${ip}/24`;
  return `${ip.substring(0, lastDotIndex)}.0/24`;
}

/**
 * 取得 IPv6 之 /64 前綴網段表示法 (例如 2606:4700:4700:0::/64)
 * @param ip IPv6 位址
 */
export function getIpv6Subnet64(ip: string): string {
  const parts = ip.split('::');
  const left = parts[0] ? parts[0].split(':') : [];
  const right = parts[1] ? parts[1].split(':') : [];

  let full: string[];
  if (parts.length > 1) {
    const missing = 8 - (left.length + right.length);
    const zeros = new Array(Math.max(0, missing)).fill('0');
    full = [...left, ...zeros, ...right];
  } else {
    full = left;
  }

  const h0 = full[0] || '0';
  const h1 = full[1] || '0';
  const h2 = full[2] || '0';
  const h3 = full[3] || '0';
  return `${h0}:${h1}:${h2}:${h3}::/64`;
}
