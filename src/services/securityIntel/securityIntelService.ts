import {
  checkSingleIpGeoLite,
  getLookupReaders
} from './geoLiteService';
import { classifyProvider } from './providerClassifier';
import {
  getOrUpdateFireholLevel1Ranges,
  getOrUpdateFireholLevel2Ranges,
  getOrUpdateSpamhausRanges
} from './fireholService';
import {
  checkSingleIpAbuseDb,
  batchCheckAbuseDb,
  AbuseIpDbResult
} from './abuseIpDbService';
import {
  ipToNumber,
  ipv6ToBigInt,
  isIpNumberInRanges,
  isIpv6InRanges,
  formatCountryWithChinese,
  getIpv4Subnet24,
  getIpv6Subnet64
} from '@/utils/ipUtils';
import {
  parseCsvLine,
  isCsvHeader
} from '@/utils/fileUtils';
import type {
  CategorySummaryItem,
  TopSubnetItem,
  SecurityIntelDetailedIpItem,
  SecurityIntelTopIpItem,
  SecurityIntelAnalysisResult,
  SecurityIntelSingleIpResult
} from './types';

// 重新導出型別，維持介面相容性 (相容 isolatedModules)
export type {
  CategorySummaryItem,
  TopSubnetItem,
  SecurityIntelDetailedIpItem,
  SecurityIntelTopIpItem,
  SecurityIntelAnalysisResult,
  SecurityIntelSingleIpResult
};

/**
 * 檢查單一 IP 的 FireHOL 命中狀態
 */
function evaluateFireholStatus(
  ip: string,
  level1Ranges: [number, number][],
  level2Ranges: [number, number][],
  spamhausRanges: [bigint, bigint][]
): { status: 'Level 1' | 'Level 2' | 'Spamhaus' | 'Clean'; isListed: boolean } {
  // IPv6
  if (ip.includes(':')) {
    const bigIntVal = ipv6ToBigInt(ip);
    if (bigIntVal !== null && isIpv6InRanges(bigIntVal, spamhausRanges)) {
      return { status: 'Spamhaus', isListed: true };
    }
    return { status: 'Clean', isListed: false };
  }

  // IPv4
  const numVal = ipToNumber(ip);
  if (numVal === null) {
    return { status: 'Clean', isListed: false };
  }

  if (isIpNumberInRanges(numVal, level1Ranges)) {
    return { status: 'Level 1', isListed: true };
  }
  if (isIpNumberInRanges(numVal, level2Ranges)) {
    return { status: 'Level 2', isListed: true };
  }

  return { status: 'Clean', isListed: false };
}

/**
 * 查詢單一 IP 的完整安全威脅情報 (GeoLite2 + FireHOL L1/L2 + AbuseIPDB + Gemini AI)
 */
export async function checkSingleIpSecurityIntel(
  ip: string
): Promise<SecurityIntelSingleIpResult> {
  // 1. 同步發起 GeoLite2、FireHOL 黑名單快取、與 AbuseIPDB 查詢
  const [geoResult, fireholL1, fireholL2, spamhaus, abuseResult] =
    await Promise.all([
      checkSingleIpGeoLite(ip),
      getOrUpdateFireholLevel1Ranges(),
      getOrUpdateFireholLevel2Ranges(),
      getOrUpdateSpamhausRanges(),
      checkSingleIpAbuseDb(ip)
    ]);

  // 2. 判斷 FireHOL 狀態
  const fireholEval = evaluateFireholStatus(
    ip,
    fireholL1.ranges,
    fireholL2.ranges,
    spamhaus.ranges
  );

  let fireholThreatLevel = 'Clean / Not Listed';
  let fireholMessage = '✅ 未在任何惡意黑名單中';
  if (fireholEval.status === 'Level 1') {
    fireholThreatLevel = 'High Risk (FireHOL Level 1)';
    fireholMessage = '⚠️ 該 IP 命中 FireHOL Level 1 最高信賴度惡意黑名單';
  } else if (fireholEval.status === 'Level 2') {
    fireholThreatLevel = 'Medium-High Risk (FireHOL Level 2)';
    fireholMessage = '⚠️ 該 IP 命中 FireHOL Level 2 惡意黑名單 (近 48 小時活躍攻擊來源)';
  } else if (fireholEval.status === 'Spamhaus') {
    fireholThreatLevel = 'High Risk (Spamhaus DROPv6)';
    fireholMessage = '⚠️ 該 IPv6 命中 Spamhaus DROPv6 惡意黑名單';
  }

  // 3. 綜合評估風險等級
  const reasons: string[] = [];
  let isHighRisk = false;
  let riskLevel: 'High' | 'Medium-High' | 'Low-Medium' | 'Low' = 'Low';

  if (fireholEval.isListed) {
    reasons.push(fireholMessage);
    isHighRisk = true;
    riskLevel = 'High';
  }

  if (abuseResult.abuseConfidenceScore !== null && abuseResult.abuseConfidenceScore >= 50) {
    reasons.push(`AbuseIPDB 信心分數達 ${abuseResult.abuseConfidenceScore}% (高風險)`);
    isHighRisk = true;
    riskLevel = 'High';
  } else if (
    abuseResult.abuseConfidenceScore !== null &&
    abuseResult.abuseConfidenceScore >= 20
  ) {
    reasons.push(`AbuseIPDB 信心分數達 ${abuseResult.abuseConfidenceScore}% (具惡意檢舉歷史)`);
    if (riskLevel === 'Low') {
      riskLevel = 'Medium-High';
    }
  }

  if (geoResult.classification.isHighRisk) {
    reasons.push(`組織分類為 ${geoResult.classification.category}`);
  }

  if (reasons.length === 0) {
    reasons.push('無任何威脅指標或惡意紀錄');
  }

  return {
    ip,
    isValid: geoResult.isValid,
    ipType: geoResult.ipType,
    country: geoResult.geo.country,
    countryName: geoResult.geo.countryName,
    city: geoResult.geo.city,
    asn: geoResult.asn.asn,
    org: geoResult.asn.org,
    category: geoResult.classification.category,
    firehol: {
      isListed: fireholEval.isListed,
      status: fireholEval.status,
      threatLevel: fireholThreatLevel,
      message: fireholMessage
    },
    abuseIpDb: abuseResult,
    aiAssessment: geoResult.aiAssessment,
    overallRisk: {
      level: riskLevel,
      isHighRisk,
      reasons
    }
  };
}

/**
 * 上傳 CSV 執行全方位安全威脅情報分析 (GeoLite2 + FireHOL L1/L2 + AbuseIPDB 聚合主引擎)
 * @param fileBuffer CSV 檔案內容
 * @param options 選項 (includeDetail 是否回傳詳細表格, abuseCheckLimit AbuseIPDB 外部請求上限)
 */
export async function analyzeSecurityIntelCsv(
  fileBuffer: Buffer,
  options: {
    includeDetail?: boolean;
    abuseCheckLimit?: number;
  } = {}
): Promise<SecurityIntelAnalysisResult> {
  const startTime = Date.now();
  const includeDetail = options.includeDetail ?? false;
  const abuseCheckLimit = options.abuseCheckLimit ?? 50;

  // 1. 同步取得 MaxMind 讀取器與預載 FireHOL / Spamhaus 名單
  const [{ asnReader, cityReader }, fireholL1, fireholL2, spamhaus] =
    await Promise.all([
      getLookupReaders(),
      getOrUpdateFireholLevel1Ranges(),
      getOrUpdateFireholLevel2Ranges(),
      getOrUpdateSpamhausRanges()
    ]);

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
      totalRequests: number;
      ipSet: Set<string>;
    }
  >();

  let totalIpCount = 0;
  let ipv4Count = 0;
  let ipv6Count = 0;
  let totalRequestCount = 0;
  let invalidCount = 0;

  // 2. 串流解析 CSV 行與流量聚合
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]?.trim();
    if (!line) continue;

    // 安全解析單行 CSV，支援雙引號包裹與純逗號
    const [ip, rawDocCount] = parseCsvLine(line);
    const docCount = rawDocCount ? parseInt(rawDocCount, 10) || 1 : 1;

    // 排除標題列
    if (isCsvHeader(ip, rawDocCount)) {
      continue;
    }

    const ipType: 'IPv4' | 'IPv6' = ip.includes(':') ? 'IPv6' : 'IPv4';

    let asnData = null;
    let cityData = null;
    try {
      asnData = asnReader.get(ip);
      cityData = cityReader.get(ip);
    } catch {
      invalidCount++;
      continue;
    }

    if (!asnData && !cityData) {
      invalidCount++;
      continue;
    }

    totalIpCount++;
    if (ipType === 'IPv6') {
      ipv6Count++;
    } else {
      ipv4Count++;
    }
    totalRequestCount += docCount;

    const asnNumber = asnData?.autonomous_system_number
      ? `AS${asnData.autonomous_system_number}`
      : 'Unknown';
    const asnOrg = asnData?.autonomous_system_organization || 'Unknown Org';
    const country =
      cityData?.country?.iso_code ||
      cityData?.registered_country?.iso_code ||
      'Unknown';
    const formattedCountry = formatCountryWithChinese(country, cityData);
    const classification = classifyProvider(asnNumber, asnOrg);

    // 網段聚合 (IPv4 /24, IPv6 /64)
    const subnetKey = ipType === 'IPv6' ? getIpv6Subnet64(ip) : getIpv4Subnet24(ip);

    if (!subnetMap.has(subnetKey)) {
      subnetMap.set(subnetKey, {
        subnet: subnetKey,
        ipType,
        asn: asnNumber,
        org: asnOrg,
        country: formattedCountry,
        category: classification.category,
        isHighRisk: classification.isHighRisk,
        totalRequests: 0,
        ipSet: new Set<string>()
      });
    }
    const subnetEntry = subnetMap.get(subnetKey)!;
    subnetEntry.totalRequests += docCount;
    subnetEntry.ipSet.add(ip);

    // 單一 IP 聚合
    if (!ipMap.has(ip)) {
      ipMap.set(ip, {
        ip,
        country: formattedCountry,
        asn: asnNumber,
        org: asnOrg,
        category: classification.category,
        subnet: subnetKey,
        requests: 0,
        isHighRisk: classification.isHighRisk,
        ipType
      });
    }
    const ipEntry = ipMap.get(ip)!;
    ipEntry.requests += docCount;

    // ASN 匯總
    const asnKey = `${asnNumber}_${asnOrg}`;
    if (!asnSummary.has(asnKey)) {
      asnSummary.set(asnKey, {
        asn: asnNumber,
        org: asnOrg,
        country: formattedCountry,
        category: classification.category,
        isHighRisk: classification.isHighRisk,
        ipCount: 0,
        totalRequests: 0
      });
    }
    const entry = asnSummary.get(asnKey)!;
    entry.ipCount++;
    entry.totalRequests += docCount;
  }

  // 3. 整理 Top 30 網段
  const sortedSubnetList = Array.from(subnetMap.values()).sort(
    (a, b) => b.totalRequests - a.totalRequests
  );
  const top30Subnets: TopSubnetItem[] = sortedSubnetList
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
      sampleIps: Array.from(item.ipSet).slice(0, 5)
    }));

  // 4. 排序所有 IP (依照請求量由大到小)
  const sortedIps = Array.from(ipMap.values()).sort(
    (a, b) => b.requests - a.requests
  );

  // 5. 透過微秒級二元搜尋為所有 IP 標記 FireHOL 狀態
  let fireholListedIpCount = 0;
  let fireholL1Count = 0;
  let fireholL2Count = 0;
  let spamhausCount = 0;

  const ipFireholMap = new Map<
    string,
    { status: 'Level 1' | 'Level 2' | 'Spamhaus' | 'Clean'; isListed: boolean }
  >();

  for (const item of sortedIps) {
    const evalResult = evaluateFireholStatus(
      item.ip,
      fireholL1.ranges,
      fireholL2.ranges,
      spamhaus.ranges
    );
    ipFireholMap.set(item.ip, evalResult);

    if (evalResult.isListed) {
      fireholListedIpCount++;
      if (evalResult.status === 'Level 1') fireholL1Count++;
      else if (evalResult.status === 'Level 2') fireholL2Count++;
      else if (evalResult.status === 'Spamhaus') spamhausCount++;
    }
  }

  // 6. 批次查詢 AbuseIPDB (依 abuseCheckLimit 配額防護)
  const targetIpsForAbuse = sortedIps.map((item) => item.ip);
  const abuseResultMap = await batchCheckAbuseDb(
    targetIpsForAbuse,
    abuseCheckLimit
  );

  let abuseCheckedCount = 0;
  for (const abuse of abuseResultMap.values()) {
    if (abuse.status === 'live' || abuse.status === 'cached') {
      abuseCheckedCount++;
    }
  }

  // 7. 裝配 Top 30 IP 清單 (包含 FireHOL 狀態與 AbuseIPDB 分數)
  const top30Ips: SecurityIntelTopIpItem[] = sortedIps
    .slice(0, 30)
    .map((item, index) => {
      const fStatus = ipFireholMap.get(item.ip) || {
        status: 'Clean' as const,
        isListed: false
      };
      const abuse = abuseResultMap.get(item.ip);
      const isHighRisk =
        item.isHighRisk ||
        fStatus.isListed ||
        (abuse?.abuseConfidenceScore !== null &&
          abuse?.abuseConfidenceScore !== undefined &&
          abuse.abuseConfidenceScore >= 20);

      return {
        rank: index + 1,
        ip: item.ip,
        requests: item.requests,
        asn: item.asn,
        org: item.org,
        country: item.country,
        category: item.category,
        fireholStatus: fStatus.status,
        isFireholListed: fStatus.isListed,
        abuseScore: abuse?.abuseConfidenceScore ?? null,
        isHighRisk
      };
    });

  // 8. 裝配詳細表格清單 (只有在 includeDetail 為 true 時才回傳，上限 1000 筆)
  const detailList: SecurityIntelDetailedIpItem[] = includeDetail
    ? sortedIps.slice(0, 1000).map((item, index) => {
        const fStatus = ipFireholMap.get(item.ip) || {
          status: 'Clean' as const,
          isListed: false
        };
        const abuse = abuseResultMap.get(item.ip);
        const abuseScore = abuse?.abuseConfidenceScore ?? null;
        const isHighRisk =
          item.isHighRisk ||
          fStatus.isListed ||
          (abuseScore !== null && abuseScore >= 20);

        return {
          rank: index + 1,
          ip: item.ip,
          country: item.country,
          asn: item.asn,
          org: item.org,
          category: item.category,
          subnet: item.subnet,
          requests: item.requests,
          ipType: item.ipType,
          fireholStatus: fStatus.status,
          isFireholListed: fStatus.isListed,
          abuseScore,
          abuseReports: abuse?.totalReports ?? 0,
          abuseUsageType: abuse?.usageType || '',
          abuseLastReportedAt: abuse?.lastReportedAt || null,
          abuseStatus: abuse?.status || 'not_checked',
          isHighRisk
        };
      })
    : [];

  // 9. 彙整產業分類統計
  const sortedAsnList = Array.from(asnSummary.values()).sort(
    (a, b) => b.totalRequests - a.totalRequests
  );
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
      if (a.category === '其他（無 ASN／資料不足）') return 1;
      if (b.category === '其他（無 ASN／資料不足）') return -1;
      if (a.category === '其他（資料不足）') return 1;
      if (b.category === '其他（資料不足）') return -1;
      return b.totalRequests - a.totalRequests;
    }
  );
  const highRiskCategories = categoryTable.filter((c) => c.isHighRisk);
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
      highRiskIpInTop30Count: top30Ips.filter((i) => i.isHighRisk).length,
      highRiskSubnetInTop30Count: highRiskSubnetsInTop30.length,
      fireholListedIpCount,
      fireholL1Count,
      fireholL2Count,
      spamhausCount,
      abuseCheckedCount,
      durationMs: Date.now() - startTime
    },
    categorySummary: categoryTable,
    top30Subnets,
    top30Ips,
    detailList
  };
}
