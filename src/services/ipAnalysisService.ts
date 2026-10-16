import path from 'path';
import maxmind, { Reader, AsnResponse, CityResponse } from 'maxmind';

/**
 * 業者分類與風險標籤
 */
export interface ProviderClassification {
  category: string;
  isHighRisk: boolean;
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
 * 完整 IP 分析回傳結果
 */
export interface IpAnalysisResult {
  overview: {
    totalIpCount: number;
    totalRequestCount: number;
    invalidCount: number;
    highRiskCategoryCount: number;
    highRiskIpInTop30Count: number;
    durationMs: number;
  };
  categorySummary: CategorySummaryItem[];
  top30Ips: TopIpItem[];
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
    'digitalocean',
    'oracle',
    'ovh',
    'hetzner',
    'linode',
    'choopa',
    'vultr',
    'leaseweb',
    'contabo',
    'ucloud',
    'datacenter',
    'data center',
    'hosting',
    'server',
    'cloud',
    'vps',
    'colocation',
    'dedicated',
    'idc',
    'rackspace',
    'scaleway',
    'equinix'
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
 * 判斷是否為 CSV 的標題列 (例如 client_ip,doc_count 或 ip,count)
 */
function isCsvHeader(ipStr: string, rawDocCount?: string): boolean {
  const lowerIp = ipStr.toLowerCase();
  const knownIpHeaders = [
    'client_ip',
    'ip',
    'ip_address',
    'ipaddress',
    'clientip',
    'remote_addr',
    'source_ip',
    'src_ip',
    'address'
  ];
  if (knownIpHeaders.includes(lowerIp)) {
    return true;
  }
  if (rawDocCount) {
    const lowerCount = rawDocCount.toLowerCase();
    const knownCountHeaders = [
      'doc_count',
      'count',
      'requests',
      'request_count',
      'total',
      'hits'
    ];
    if (knownCountHeaders.includes(lowerCount)) {
      return true;
    }
  }
  return false;
}

/**
 * 解析上傳的 IP CSV 緩衝區並進行 MaxMind GeoIP / ASN 分析
 */
export async function analyzeIpCsvStream(
  fileBuffer: Buffer
): Promise<IpAnalysisResult> {
  const startTime = Date.now();
  const { asnReader, cityReader } = await getLookupReaders();

  const content = fileBuffer.toString('utf-8');
  const lines = content.split(/\r?\n/);

  const asnSummary = new Map<string, any>();
  const top30Ips: TopIpItem[] = [];
  let totalIpCount = 0;
  let totalRequestCount = 0;
  let invalidCount = 0;

  for (const line of lines) {
    if (!line.trim()) continue;

    // 解析 client_ip 與 doc_count
    const parts = line.split(',');
    const ip = parts[0] ? parts[0].trim() : '';
    const rawDocCount = parts[1] ? parts[1].trim() : '';
    const docCount = rawDocCount ? parseInt(rawDocCount, 10) || 1 : 1;

    // 排除標題列 (例如 client_ip,doc_count)
    if (isCsvHeader(ip, rawDocCount)) {
      continue;
    }

    // 驗證是否為合法 IPv4 / IPv6
    if (!maxmind.validate(ip)) {
      invalidCount++;
      continue;
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
    const country = cityData?.country?.iso_code || 'Unknown';

    // 記錄 Top 30 請求量 IP（CSV 預設按請求量排序）
    if (top30Ips.length < 30) {
      const classification = classifyProvider(asnNumber, asnOrg);
      top30Ips.push({
        rank: top30Ips.length + 1,
        ip,
        requests: docCount,
        asn: asnNumber,
        org: asnOrg,
        country,
        category: classification.category,
        isHighRisk: classification.isHighRisk
      });
    }

    // 依據 ASN 做聚合
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

  return {
    overview: {
      totalIpCount,
      totalRequestCount,
      invalidCount,
      highRiskCategoryCount: highRiskCategories.length,
      highRiskIpInTop30Count: highRiskIpsInTop30.length,
      durationMs: Date.now() - startTime
    },
    categorySummary: categoryTable,
    top30Ips
  };
}
