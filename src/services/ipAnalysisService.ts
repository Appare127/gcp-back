import path from 'path';
import maxmind, { Reader, AsnResponse, CityResponse } from 'maxmind';
import { AppError } from '../utils/appError';
import {
  analyzeIpWithAiAgent,
  IpSecurityAssessment
} from './aiAgentService';
import { checkSingleIpFirehol } from './fireholService';

/**
 * 業者分類與風險標籤
 */
export interface ProviderClassification {
  category: string;
  isHighRisk: boolean;
}

/**
 * 單一 IP 的 GeoLite2 查詢結果介面
 */
export interface GeoLiteIpCheckResult {
  ip: string;
  isValid: boolean;
  ipType: 'IPv4' | 'IPv6';
  asn: {
    asn: string;
    autonomousSystemNumber: number | null;
    org: string;
  };
  geo: {
    continent: string;
    country: string;
    countryName: string;
    city: string;
    subdivision: string;
    timeZone: string;
    latitude: number | null;
    longitude: number | null;
  };
  classification: ProviderClassification;
  aiAssessment: IpSecurityAssessment;
  blacklist: {
    isListed: boolean;
    threatLevel: string;
    source: string;
  };
  categorySummary: CategorySummaryItem[];
  top30Subnets: TopSubnetItem[];
  top30Ips: TopIpItem[];
  detailList: DetailedIpItem[];
}

/**
 * Top 30 巨量流量網段 (Subnet) 分析項目
 */
export interface TopSubnetItem {
  rank: number;
  subnet: string;
  ipType: 'IPv4' | 'IPv6';
  ipCount: number;
  requests: number;
  asn: string;
  org: string;
  country: string;
  category: string;
  isHighRisk: boolean;
  sampleIps: string[];
}

/**
 * Top 30 IP 分析項目
 */
export interface TopIpItem {
  rank: number;
  ip: string;
  requests: number;
  asn: string;
  org: string;
  country: string;
  category: string;
  isHighRisk: boolean;
}

/**
 * 詳細 IP 清單項目 (提供 IP、國家、ASN、業者、分類、CIDR 網段、請求數等完整細節)
 */
export interface DetailedIpItem {
  rank: number;
  ip: string;
  country: string;
  asn: string;
  org: string;
  category: string;
  subnet: string;
  requests: number;
  isHighRisk: boolean;
  ipType: 'IPv4' | 'IPv6';
}

/**
 * 產業分類統計項目
 */
export interface CategorySummaryItem {
  category: string;
  isHighRisk: boolean;
  ispCount: number;
  ipCount: number;
  totalRequests: number;
}

/**
 * 完整 IP 分析回傳結果 (雙層呈現：單一 IP + 網段聚合)
 */
export interface IpAnalysisResult {
  overview: {
    totalIpCount: number;
    totalSubnetCount: number;
    ipv4Count: number;
    ipv6Count: number;
    totalRequestCount: number;
    invalidCount: number;
    highRiskCategoryCount: number;
    highRiskIpInTop30Count: number;
    highRiskSubnetInTop30Count: number;
    durationMs: number;
  };
  categorySummary: CategorySummaryItem[];
  top30Subnets: TopSubnetItem[];
  top30Ips: TopIpItem[];
  detailList: DetailedIpItem[];
}

// 記憶體中的讀取器單例快取，避免每次請求都重複讀取 60MB 的資料庫
let cachedAsnReader: Reader<AsnResponse> | null = null;
let cachedCityReader: Reader<CityResponse> | null = null;

/**
 * 取得 MaxMind MMDB 讀取器 (單例模式)
 */
async function getLookupReaders(): Promise<{
  asnReader: Reader<AsnResponse>;
  cityReader: Reader<CityResponse>;
}> {
  if (!cachedAsnReader) {
    const asnPath = path.join(process.cwd(), 'data/GeoLite2-ASN.mmdb');
    cachedAsnReader = await maxmind.open<AsnResponse>(asnPath);
  }
  if (!cachedCityReader) {
    const cityPath = path.join(process.cwd(), 'data/GeoLite2-City.mmdb');
    cachedCityReader = await maxmind.open<CityResponse>(cityPath);
  }
  return { asnReader: cachedAsnReader, cityReader: cachedCityReader };
}

/**
 * 常見國家與地區 ISO 代碼之繁體中文對照表
 */
const countryZhMap: Record<string, string> = {
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
 */
function formatCountryWithChinese(
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
 * 判定 ASN 所屬的產業角色分類與高風險標籤
 */
function classifyProvider(
  asnNumber: string,
  orgName: string
): ProviderClassification {
  if (!asnNumber || asnNumber === 'Unknown') {
    return { category: '其他（無 ASN／資料不足）', isHighRisk: true };
  }

  if (!orgName || orgName === 'Unknown Org' || orgName.trim() === '') {
    return { category: '其他（資料不足）', isHighRisk: true };
  }

  const lowerOrg = orgName.toLowerCase();

  // 1. 資安／網路防護服務商
  const securityKeywords = [
    'imperva',
    'incapsula',
    'sucuri',
    'f5 networks',
    'palo alto',
    'radware',
    'ddos-guard',
    'qrator'
  ];
  if (securityKeywords.some((keyword) => lowerOrg.includes(keyword))) {
    return { category: '資安／網路防護服務商', isHighRisk: true };
  }

  // 2. CDN／內容傳遞服務商
  const cdnKeywords = [
    'cloudflare',
    'fastly',
    'akamai',
    'cloudfront',
    'edgio',
    'limelight'
  ];
  if (cdnKeywords.some((keyword) => lowerOrg.includes(keyword))) {
    return { category: 'CDN／內容傳遞服務商', isHighRisk: true };
  }

  // 3. 代理／網路服務供應商 (Proxy / VPN / Transit / Peering)
  const proxyKeywords = [
    'zenlayer',
    'm247',
    'packethub',
    'luminati',
    'bright data',
    'oxylabs',
    'smartproxy',
    'proxy',
    'vpn',
    'ipvanish',
    'expressvpn',
    'nordvpn',
    'surfshark',
    'datacamp',
    'teliasonera',
    'cogent',
    'gtt communications',
    'hurricane electric',
    'peering'
  ];
  if (proxyKeywords.some((keyword) => lowerOrg.includes(keyword))) {
    return { category: '代理／網路服務供應商', isHighRisk: true };
  }

  // 4. 主機供應商 (Hosting / Cloud / Datacenter / IDC)
  const hostingKeywords = [
    // 全球主要公有雲
    'amazon',
    'aws',
    'google cloud',
    'google llc',
    'microsoft',
    'azure',
    'alibaba',
    'alicloud',
    'tencent',
    'huawei',
    'oracle',
    // 字節跳動 / 火山引擎
    'byteplus',
    'bytedance',
    'volcengine',
    // 亞洲主流雲端與機房
    'baidu',
    'baidubce',
    'ksyun',
    'kingsoft',
    'jdcloud',
    'qiniu',
    'ucloud',
    'nearoute',
    'gsl networks',
    'gsl',
    'sakura',
    'conoha',
    'gmo internet',
    // 歐美知名 VPS / 機房 / 雲端
    'digitalocean',
    'ovh',
    'ovhcloud',
    'hetzner',
    'linode',
    'choopa',
    'vultr',
    'constant company',
    'the constant company',
    'leaseweb',
    'contabo',
    'rackspace',
    'scaleway',
    'equinix',
    'kamatera',
    'hostinger',
    'bluehost',
    'godaddy',
    'namecheap',
    'ionos',
    'racknerd',
    'colocrossing',
    'greencloud',
    'hostwinds',
    'cherryservers',
    'fastcomet',
    // 通用主機商/資料中心關鍵字
    'datacenter',
    'data center',
    'hosting',
    'server',
    'cloud',
    'vps',
    'colocation',
    'dedicated',
    'idc'
  ];
  if (hostingKeywords.some((keyword) => lowerOrg.includes(keyword))) {
    return { category: '主機供應商', isHighRisk: true };
  }

  // 5. 企業／機構網路 (Enterprise / Org / Edu)
  const enterpriseKeywords = [
    'university',
    'college',
    'institute',
    'hospital',
    'bank',
    'government',
    'ministry'
  ];
  if (enterpriseKeywords.some((keyword) => lowerOrg.includes(keyword))) {
    return { category: '企業／機構網路', isHighRisk: false };
  }

  // 6. 電信業者（一般民生固網寬頻與行動通訊，預設低風險）
  return { category: '電信業者', isHighRisk: false };
}

/**
 * 取得 IPv4 之 /24 (Class C) 網段表示法 (例如 1.1.1.0/24)
 */
function getIpv4Subnet24(ip: string): string {
  const lastDotIndex = ip.lastIndexOf('.');
  if (lastDotIndex === -1) return `${ip}/24`;
  return `${ip.substring(0, lastDotIndex)}.0/24`;
}

/**
 * 取得 IPv6 之 /64 前綴網段表示法 (例如 2606:4700:4700:0::/64)
 */
function getIpv6Subnet64(ip: string): string {
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
 * 解析上傳的 IP CSV 緩衝區並進行 MaxMind GeoIP / ASN 分析 (雙層呈現：單一 IP + 網段聚合)
 */
export async function analyzeIpCsvStream(
  fileBuffer: Buffer,
  options?: { includeDetail?: boolean }
): Promise<IpAnalysisResult> {
  const includeDetail = options?.includeDetail ?? false;
  const startTime = Date.now();
  const { asnReader, cityReader } = await getLookupReaders();

  const content = fileBuffer.toString('utf-8');
  const lines = content.split(/\r?\n/);

  const asnSummary = new Map<string, any>();
  const ipMap = new Map<
    string,
    {
      ip: string;
      country: string;
      asn: string;
      org: string;
      category: string;
      subnet: string;
      requests: number;
      isHighRisk: boolean;
      ipType: 'IPv4' | 'IPv6';
    }
  >();

  // 網段聚合容器 (IPv4: /24, IPv6: /64)
  const subnetMap = new Map<
    string,
    {
      subnet: string;
      ipType: 'IPv4' | 'IPv6';
      asn: string;
      org: string;
      country: string;
      category: string;
      isHighRisk: boolean;
      ipSet: Set<string>;
      totalRequests: number;
    }
  >();

  let totalIpCount = 0;
  let ipv4Count = 0;
  let ipv6Count = 0;
  let totalRequestCount = 0;
  let invalidCount = 0;

  for (const line of lines) {
    if (!line.trim()) continue;

    // 安全解析單行 CSV，全面相容引號 (例如 "167.179.111.165",61)
    const [ip, rawDocCount] = parseCsvLine(line);
    const docCount = rawDocCount ? parseInt(rawDocCount, 10) || 1 : 1;

    // 排除標題列 (例如 client_ip,doc_count 或 "client_ip.keyword 排名最前值","记录计数")
    if (isCsvHeader(ip, rawDocCount)) {
      continue;
    }

    // 驗證是否為合法 IPv4 / IPv6
    if (!maxmind.validate(ip)) {
      invalidCount++;
      continue;
    }

    const isIpv6 = ip.includes(':');
    if (isIpv6) {
      ipv6Count++;
    } else {
      ipv4Count++;
    }

    totalIpCount++;
    totalRequestCount += docCount;

    // 查詢 ASN 與地理位置
    const asnData = asnReader.get(ip);
    const cityData = cityReader.get(ip);

    const asnNumber = asnData?.autonomous_system_number
      ? `AS${asnData.autonomous_system_number}`
      : 'Unknown';
    const asnOrg = asnData?.autonomous_system_organization || 'Unknown Org';
    const rawCountry =
      cityData?.country?.iso_code ||
      cityData?.registered_country?.iso_code ||
      'Unknown';
    const country = formatCountryWithChinese(rawCountry, cityData);
    const classification = classifyProvider(asnNumber, asnOrg);
    const subnetKey = isIpv6 ? getIpv6Subnet64(ip) : getIpv4Subnet24(ip);

    // 1. 記錄並累計單一 IP 請求量與詳細資訊
    const existingIp = ipMap.get(ip);
    if (existingIp) {
      existingIp.requests += docCount;
    } else {
      ipMap.set(ip, {
        ip,
        country,
        asn: asnNumber,
        org: asnOrg,
        category: classification.category,
        subnet: subnetKey,
        requests: docCount,
        isHighRisk: classification.isHighRisk,
        ipType: isIpv6 ? 'IPv6' : 'IPv4'
      });
    }

    // 2. 進行網段聚合 (IPv4 聚合為 /24 Class C，IPv6 聚合為 /64)
    if (!subnetMap.has(subnetKey)) {
      subnetMap.set(subnetKey, {
        subnet: subnetKey,
        ipType: isIpv6 ? 'IPv6' : 'IPv4',
        asn: asnNumber,
        org: asnOrg,
        country,
        category: classification.category,
        isHighRisk: classification.isHighRisk,
        ipSet: new Set<string>(),
        totalRequests: 0
      });
    }

    const currentSubnet = subnetMap.get(subnetKey)!;
    currentSubnet.ipSet.add(ip);
    currentSubnet.totalRequests += docCount;

    // 3. 依據 ASN 做聚合
    const key = `${asnNumber}___${asnOrg}___${country}`;
    if (!asnSummary.has(key)) {
      const classification = classifyProvider(asnNumber, asnOrg);
      asnSummary.set(key, {
        asn: asnNumber,
        org: asnOrg,
        country,
        category: classification.category,
        isHighRisk: classification.isHighRisk,
        ipCount: 0,
        totalRequests: 0
      });
    }

    const currentAsn = asnSummary.get(key);
    currentAsn.ipCount++;
    currentAsn.totalRequests += docCount;
  }

  // 整理 Top 30 巨量流量網段 (依總請求次數由大到小排序)
  const top30Subnets: TopSubnetItem[] = Array.from(subnetMap.values())
    .sort((a, b) => b.totalRequests - a.totalRequests)
    .slice(0, 30)
    .map((item, index) => ({
      rank: index + 1,
      subnet: item.subnet,
      ipType: item.ipType,
      ipCount: item.ipSet.size,
      requests: item.totalRequests,
      asn: item.asn,
      org: item.org,
      country: item.country,
      category: item.category,
      isHighRisk: item.isHighRisk,
      sampleIps: Array.from(item.ipSet).slice(0, 3)
    }));

  // 依總請求次數由大到小排序所有 IP
  const sortedIps = Array.from(ipMap.values()).sort(
    (a, b) => b.requests - a.requests
  );

  // 整理 Top 30 IP (依照真實請求量最高由大到小排序)
  const top30Ips: TopIpItem[] = sortedIps
    .slice(0, 30)
    .map((item, index) => ({
      rank: index + 1,
      ip: item.ip,
      requests: item.requests,
      asn: item.asn,
      org: item.org,
      country: item.country,
      category: item.category,
      isHighRisk: item.isHighRisk
    }));

  // 整理詳細 IP 清單 (只有 includeDetail 為 true 時才回傳，否則為空陣列；上限 1,000 筆)
  const detailList: DetailedIpItem[] = includeDetail
    ? sortedIps
        .slice(0, 1000)
        .map((item, index) => ({
          rank: index + 1,
          ip: item.ip,
          country: item.country,
          asn: item.asn,
          org: item.org,
          category: item.category,
          subnet: item.subnet,
          requests: item.requests,
          isHighRisk: item.isHighRisk,
          ipType: item.ipType
        }))
    : [];

  // 將聚合結果依請求數排序
  const sortedAsnList = Array.from(asnSummary.values()).sort(
    (a, b) => b.totalRequests - a.totalRequests
  );

  // 彙整產業分類統計
  const categorySummaryMap = new Map<string, CategorySummaryItem>();
  for (const item of sortedAsnList) {
    if (!categorySummaryMap.has(item.category)) {
      categorySummaryMap.set(item.category, {
        category: item.category,
        isHighRisk: item.isHighRisk,
        ispCount: 0,
        ipCount: 0,
        totalRequests: 0
      });
    }
    const cat = categorySummaryMap.get(item.category)!;
    cat.ispCount++;
    cat.ipCount += item.ipCount;
    cat.totalRequests += item.totalRequests;
  }

  const categoryTable = Array.from(categorySummaryMap.values()).sort(
    (a, b) => {
      // 將「其他（無 ASN／資料不足）」排在最下方
      if (a.category === '其他（無 ASN／資料不足）') return 1;
      if (b.category === '其他（無 ASN／資料不足）') return -1;
      if (a.category === '其他（資料不足）') return 1;
      if (b.category === '其他（資料不足）') return -1;
      // 其餘項目維持總請求數由大到小排序
      return b.totalRequests - a.totalRequests;
    }
  );
  const highRiskCategories = categoryTable.filter((c) => c.isHighRisk);
  const highRiskIpsInTop30 = top30Ips.filter((item) => item.isHighRisk);
  const highRiskSubnetsInTop30 = top30Subnets.filter((s) => s.isHighRisk);

  return {
    overview: {
      totalIpCount,
      totalSubnetCount: subnetMap.size,
      ipv4Count,
      ipv6Count,
      totalRequestCount,
      invalidCount,
      highRiskCategoryCount: highRiskCategories.length,
      highRiskIpInTop30Count: highRiskIpsInTop30.length,
      highRiskSubnetInTop30Count: highRiskSubnetsInTop30.length,
      durationMs: Date.now() - startTime
    },
    categorySummary: categoryTable,
    top30Subnets,
    top30Ips,
    detailList
  };
}

/**
 * 查詢單一 IP 的 GeoLite2 (ISP / ASN 與地理位置) 資訊
 */
export async function checkSingleIpGeoLite(
  ipInput: string
): Promise<GeoLiteIpCheckResult> {
  const ip = ipInput.trim();
  if (!maxmind.validate(ip)) {
    throw new AppError('輸入的 IP 格式無效 (支援 IPv4 或 IPv6)', 400);
  }

  const { asnReader, cityReader } = await getLookupReaders();
  const asnData = asnReader.get(ip);
  const cityData = cityReader.get(ip);

  const ipType: 'IPv4' | 'IPv6' = ip.includes(':') ? 'IPv6' : 'IPv4';

  const asnNumber = asnData?.autonomous_system_number
    ? `AS${asnData.autonomous_system_number}`
    : 'Unknown';
  const asnOrg = asnData?.autonomous_system_organization || 'Unknown Org';

  const classification = classifyProvider(asnNumber, asnOrg);

  const continent =
    cityData?.continent?.names?.['zh-CN'] ||
    cityData?.continent?.names?.en ||
    'Unknown';
  const country =
    cityData?.country?.iso_code ||
    cityData?.registered_country?.iso_code ||
    'Unknown';
  const countryName =
    cityData?.country?.names?.['zh-CN'] ||
    cityData?.country?.names?.en ||
    cityData?.registered_country?.names?.['zh-CN'] ||
    cityData?.registered_country?.names?.en ||
    'Unknown';
  const city =
    cityData?.city?.names?.['zh-CN'] || cityData?.city?.names?.en || 'Unknown';
  const subdivision =
    cityData?.subdivisions?.[0]?.names?.['zh-CN'] ||
    cityData?.subdivisions?.[0]?.names?.en ||
    'Unknown';
  const timeZone = cityData?.location?.time_zone || 'Unknown';
  const latitude = cityData?.location?.latitude ?? null;
  const longitude = cityData?.location?.longitude ?? null;

  // 1. 同時進行黑名單檢測
  const blacklistCheck = await checkSingleIpFirehol(ip);

  // 2. 呼叫 Gemini AI Agent 進行專業風險與代理屬性判定
  const aiAssessment = await analyzeIpWithAiAgent({
    ip,
    country: `${countryName} (${country})`,
    asn: asnNumber,
    org: asnOrg,
    category: classification.category,
    isListed: blacklistCheck.isListed,
    blacklistSource: blacklistCheck.source
  });

  const formattedCountry = formatCountryWithChinese(country, cityData);

  const topIpItem: TopIpItem = {
    rank: 1,
    ip,
    requests: 1,
    asn: asnNumber,
    org: asnOrg,
    country: formattedCountry,
    category: aiAssessment.connectionType || classification.category,
    isHighRisk: classification.isHighRisk || blacklistCheck.isListed || aiAssessment.riskLevel === '高風險'
  };

  const subnetKey = ipType === 'IPv6' ? getIpv6Subnet64(ip) : getIpv4Subnet24(ip);
  const topSubnetItem: TopSubnetItem = {
    rank: 1,
    subnet: subnetKey,
    ipType,
    ipCount: 1,
    requests: 1,
    asn: asnNumber,
    org: asnOrg,
    country: formattedCountry,
    category: aiAssessment.connectionType || classification.category,
    isHighRisk: topIpItem.isHighRisk,
    sampleIps: [ip]
  };

  const detailedIpItem: DetailedIpItem = {
    rank: 1,
    ip,
    country: formattedCountry,
    asn: asnNumber,
    org: asnOrg,
    category: aiAssessment.connectionType || classification.category,
    subnet: subnetKey,
    requests: 1,
    isHighRisk: topIpItem.isHighRisk,
    ipType
  };

  const categorySummaryItem: CategorySummaryItem = {
    category: aiAssessment.connectionType || classification.category,
    isHighRisk: topIpItem.isHighRisk,
    ispCount: asnNumber !== 'Unknown' ? 1 : 0,
    ipCount: 1,
    totalRequests: 1
  };

  return {
    ip,
    isValid: true,
    ipType,
    asn: {
      asn: asnNumber,
      autonomousSystemNumber: asnData?.autonomous_system_number ?? null,
      org: asnOrg
    },
    geo: {
      continent,
      country,
      countryName,
      city,
      subdivision,
      timeZone,
      latitude,
      longitude
    },
    classification,
    aiAssessment,
    blacklist: {
      isListed: blacklistCheck.isListed,
      threatLevel: blacklistCheck.threatLevel,
      source: blacklistCheck.source
    },
    categorySummary: [categorySummaryItem],
    top30Subnets: [topSubnetItem],
    top30Ips: [topIpItem],
    detailList: [detailedIpItem]
  };
}
