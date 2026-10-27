import { checkSingleIpGeoLite, getLookupReaders } from './geoLiteService';
import { classifyProvider } from './providerClassifier';
import {
  checkSingleIpFirehol,
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
  getIpv6Subnet64,
  sanitizeIp,
  isValidIp
} from '@/utils/ipUtils';
import { analyzeIpWithAiAgent } from './aiAgentService';
import { parseCsvLine, isCsvHeader } from '@/utils/fileUtils';
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
 * 查詢單一 IP 的完整安全威脅情報 (GeoLite2 + FireHOL L1/L2/Spamhaus + AbuseIPDB + Gemini AI Agent)
 */
export async function checkSingleIpSecurityIntel(
  ip: string
): Promise<SecurityIntelSingleIpResult> {
  // 1. 同步發起 GeoLite2、FireHOL / Spamhaus 黑名單與 AbuseIPDB 查詢
  const [geoResult, fireholResult, abuseResult] = await Promise.all([
    checkSingleIpGeoLite(ip),
    checkSingleIpFirehol(ip),
    checkSingleIpAbuseDb(ip)
  ]);

  const baseResult: Omit<SecurityIntelSingleIpResult, 'aiAssessment'> = {
    ip,
    isValid: geoResult.isValid,
    ipType: geoResult.ipType,
    country: geoResult.geo.country,
    countryName: geoResult.geo.countryName,
    city: geoResult.geo.city,
    asn: geoResult.asn.asn,
    org: geoResult.asn.org,
    category: geoResult.classification.category,
    // 聚合網段 (IPv4 為 /24，IPv6 為 /64)
    subnet:
      geoResult.ipType === 'IPv6' ? getIpv6Subnet64(ip) : getIpv4Subnet24(ip),
    firehol: fireholResult,
    abuseIpDb: abuseResult
  };

  // 2. 將整包情報提供給 AI Agent，結合 Google 搜尋公開網路資料進行專業深度研判
  // const aiAssessment = await analyzeIpWithAiAgent(baseResult);

  return {
    ...baseResult
    // aiAssessment
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
  const includeDetail = options.includeDetail ?? false;
  const abuseCheckLimit = options.abuseCheckLimit ?? 50;

  // 移除可能存在的 UTF-8 BOM
  let content = fileBuffer.toString('utf-8');
  if (content.charCodeAt(0) === 0xfeff) {
    content = content.slice(1);
  }

  const lines = content.split(/\r?\n/);
  const result = [] as SecurityIntelSingleIpResult[];

  // 解析 CSV
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]?.trim();
    if (!line) continue;

    // 略過註解列
    if (
      line.startsWith('#') ||
      line.startsWith('//') ||
      line.startsWith(';')
    ) {
      continue;
    }

    // 安全解析單行 CSV，支援雙引號包裹與純逗號
    const [rawIp, rawDocCount] = parseCsvLine(line);
    if (!rawIp) continue;

    // 排除標題列與統計彙總列
    if (isCsvHeader(rawIp, rawDocCount)) {
      continue;
    }

    // 正規化 IP 字串 (清理前後符號、引號、中括號與 port)
    const ip = sanitizeIp(rawIp);

    // 校驗是否為合法的 IPv4 或 IPv6 格式
    if (!isValidIp(ip)) {
      // 若第一行不是合法 IP，視為自訂標題列略過
      if (i === 0) continue;
      // 其餘行若格式無效則略過，避免造成整批分析中斷崩潰
      continue;
    }

    try {
      const [geoResult, fireholResult] = await Promise.all([
        checkSingleIpGeoLite(ip),
        checkSingleIpFirehol(ip)
      ]);

      const baseResult: Omit<SecurityIntelSingleIpResult, 'aiAssessment'> = {
        ip,
        isValid: geoResult.isValid,
        ipType: geoResult.ipType,
        country: geoResult.geo.country,
        countryName: geoResult.geo.countryName,
        city: geoResult.geo.city,
        asn: geoResult.asn.asn,
        org: geoResult.asn.org,
        category: geoResult.classification.category,
        // 聚合網段 (IPv4 為 /24，IPv6 為 /64)
        subnet:
          geoResult.ipType === 'IPv6' ? getIpv6Subnet64(ip) : getIpv4Subnet24(ip),
        firehol: fireholResult,
        abuseIpDb: null,
        hitCount: rawDocCount
      };
      result.push(baseResult);
    } catch (err) {
      // 若單一 IP 查詢非預期出錯，記錄警告並略過，保護整體批次分析流程
      console.warn(
        `[analyzeSecurityIntelCsv] 略過異常 IP 列 [第 ${i + 1} 行]: ${ip}`,
        err
      );
    }
  }

  // const abuseResult = await batchCheckAbuseDb(result.map((r) => r.ip));
  // result.forEach((r) => {
  //   r.abuseIpDb = abuseResult.get(r.ip) ?? null;
  // });

  return {
    detailList: result as unknown as SecurityIntelSingleIpResult[]
  };
}
