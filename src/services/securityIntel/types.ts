import { IpSecurityAssessment } from './aiAgentService';
import { AbuseIpDbResult } from './abuseIpDbService';
import type { FireholIpCheckResult } from './fireholService';

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
  aiAssessment?: IpSecurityAssessment | undefined;
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
 * 整合安全情報的詳細 IP 清單項目 (結合 GeoLite2 + FireHOL + AbuseIPDB)
 */
export interface SecurityIntelDetailedIpItem {
  rank: number;
  ip: string;
  country: string; // 格式如 "JP (日本)" 或 "JP"
  countryName?: string;
  city?: string;
  asn: string;
  org: string;
  category: string;
  subnet: string;
  requests: number;
  ipType: 'IPv4' | 'IPv6';
  // FireHOL 威脅情報
  firehol?: FireholIpCheckResult;
  fireholStatus?: 'Level 1' | 'Level 2' | 'Spamhaus' | 'Clean';
  isFireholListed?: boolean;
  // AbuseIPDB 威脅情報
  abuseIpDb?: AbuseIpDbResult;
  abuseScore?: number | null;
  abuseReports?: number;
  abuseUsageType?: string;
  abuseLastReportedAt?: string | null;
  abuseStatus?: string;
  // Gemini AI 即時評估 (參考 checkSingleIpSecurityIntel)
  aiAssessment?: IpSecurityAssessment;
  // 綜合風險狀態
  isHighRisk: boolean;
}

/**
 * 整合安全情報的 Top 30 IP 項目
 */
export interface SecurityIntelTopIpItem {
  rank: number;
  ip: string;
  requests: number;
  asn: string;
  org: string;
  country: string;
  category: string;
  fireholStatus: 'Level 1' | 'Level 2' | 'Spamhaus' | 'Clean';
  isFireholListed: boolean;
  abuseScore: number | null;
  isHighRisk: boolean;
}

/**
 * 整合安全情報 CSV 分析結果
 */
export interface SecurityIntelAnalysisResult {
  overview?: {
    totalIpCount: number;
    totalSubnetCount: number;
    ipv4Count: number;
    ipv6Count: number;
    totalRequestCount: number;
    invalidCount: number;
    highRiskCategoryCount: number;
    highRiskIpInTop30Count: number;
    highRiskSubnetInTop30Count: number;
    // FireHOL 統計
    fireholListedIpCount: number;
    fireholL1Count: number;
    fireholL2Count: number;
    spamhausCount: number;
    // AbuseIPDB 統計
    abuseCheckedCount: number;
    durationMs: number;
  };
  categorySummary?: CategorySummaryItem[];
  top30Subnets?: TopSubnetItem[];
  top30Ips?: SecurityIntelTopIpItem[];
  detailList: SecurityIntelDetailedIpItem[];
}

/**
 * 單一 IP 整合情報分析結果
 */
export interface SecurityIntelSingleIpResult {
  /** IP 位址 */
  ip: string;
  /** IP 是否有效 */
  isValid: boolean;
  /** IP 类型: IPv4 或 IPv6 */
  ipType: 'IPv4' | 'IPv6';
  /** 國家 */
  country: string;
  /** 國家名稱 */
  countryName: string;
  /** 城市 */
  city: string;
  /** 自動系統編號 */
  asn: string;
  /** 自動系統組織 */
  org: string;
  /** 產業分類 */
  category: string;
  /** 聚合網段 (IPv4 為 /24，IPv6 為 /64) */
  subnet: string;
  /** FireHOL / Spamhaus 威脅情報 (直接沿用 fireholService 的單一 IP 查詢結果) */
  firehol: FireholIpCheckResult;
  /** AbuseIPDB 威脅情報 */
  abuseIpDb: AbuseIpDbResult;
  /** Gemini AI Agent 深度評估 (結合 Google Search 網路即時情資與防禦建議) */
  aiAssessment?: IpSecurityAssessment;
}
