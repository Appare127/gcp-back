import { GoogleGenAI } from '@google/genai';

/**
 * IP 安全風險評估結果介面
 */
export interface IpSecurityAssessment {
  connectionType: string;
  riskAssessment: string;
  riskLevel: '高風險' | '中風險' | '低至中' | '低風險';
  source: 'ai_agent' | 'rule_fallback';
}

/**
 * 送交 AI Agent 分析之 IP 屬性特徵
 */
export interface IpAnalysisInputFeatures {
  ip: string;
  country: string;
  asn: string;
  org: string;
  category: string;
  isListed: boolean;
  blacklistSource?: string;
  requests?: number;
}

// 記憶體快取容器：避免相同特徵或重複查詢的 IP 耗費 API 額度 (TTL 24 小時)
interface CacheEntry {
  result: IpSecurityAssessment;
  timestamp: number;
}

const assessmentCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * 取得快取之評估結果
 */
function getCachedAssessment(cacheKey: string): IpSecurityAssessment | null {
  const cached = assessmentCache.get(cacheKey);
  if (!cached) return null;
  if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
    assessmentCache.delete(cacheKey);
    return null;
  }
  return cached.result;
}

/**
 * 設定評估結果至快取
 */
function setCachedAssessment(cacheKey: string, result: IpSecurityAssessment): void {
  assessmentCache.set(cacheKey, {
    result,
    timestamp: Date.now()
  });
}

/**
 * 本機規則備援評估 (當 AI 連線瞬斷或 API 逾時時保證服務不中斷)
 */
function generateFallbackAssessment(
  input: IpAnalysisInputFeatures
): IpSecurityAssessment {
  const { category, isListed, blacklistSource } = input;

  if (isListed) {
    return {
      connectionType: `${category} (惡意黑名單)`,
      riskAssessment: `極高風險（命中線上惡意黑名單 ${blacklistSource || ''}，確認具備攻擊或惡意活動歷史）`,
      riskLevel: '高風險',
      source: 'rule_fallback'
    };
  }

  if (category === '主機供應商') {
    return {
      connectionType: 'Hosting / Datacenter',
      riskAssessment: '高風險（機房 IP，常作 VPN、跳板機、爬蟲或掃描來源）',
      riskLevel: '高風險',
      source: 'rule_fallback'
    };
  }

  if (category === 'CDN／內容傳遞服務商') {
    return {
      connectionType: 'CDN / Proxy',
      riskAssessment: '中風險（邊緣加速節點，使用者真實 IP 常被隱藏於此服務背後）',
      riskLevel: '中風險',
      source: 'rule_fallback'
    };
  }

  if (category === '代理／網路服務供應商') {
    return {
      connectionType: 'Proxy / VPN',
      riskAssessment: '高風險（公開或商用代理/VPN節點，常作為匿名存取或跳板）',
      riskLevel: '高風險',
      source: 'rule_fallback'
    };
  }

  // 預設電信業者
  return {
    connectionType: 'ISP (家用/寬頻)',
    riskAssessment: '低至中（一般電信寬頻；若出現巨量異常請求，常見於殭屍網路遭控肉雞或 Residential Proxy 節點）',
    riskLevel: '低至中',
    source: 'rule_fallback'
  };
}

/**
 * 呼叫 Gemini AI Agent 進行 IP 風險與代理屬性深度評估
 */
export async function analyzeIpWithAiAgent(
  input: IpAnalysisInputFeatures
): Promise<IpSecurityAssessment> {
  const cacheKey = `${input.ip}_${input.asn}_${input.isListed}`;
  const cached = getCachedAssessment(cacheKey);
  if (cached) {
    return cached;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return generateFallbackAssessment(input);
  }

  const prompt = `你是一位世界頂尖的網路安全威脅情資 (Cyber Threat Intelligence) 分析專家。
請依據下方提供的 IP 基礎資訊與情資特徵，評估其「類型判定」與「風險與代理屬性評估」：

【目標 IP 資訊】
- IP 位址: ${input.ip}
- 國家/地區: ${input.country}
- ASN 與組織: ${input.asn} (${input.org})
- 初步業者類別: ${input.category}
- 惡意黑名單命中狀態: ${input.isListed ? `已命中 (${input.blacklistSource})` : '未命中 (乾淨)'}
- 請求頻次特徵: ${input.requests ? `總計 ${input.requests} 次請求` : '單一即時查詢'}

【評估標準參考範例】
1. 若為家用/電信寬頻 (如 Viettel, 中華電信, VNPT)：
   - connectionType: "ISP (家用/寬頻)" 或 "ISP (行動/寬頻)"
   - riskAssessment: "低至中（住宅寬頻，常被住宅代理池利用或遭殭屍網路控制）"
2. 若為機房/雲端 (如 GSL, AWS, DigitalOcean, 阿里雲)：
   - connectionType: "Hosting / Datacenter"
   - riskAssessment: "高風險（機房 IP，常作 VPN、跳板機、爬蟲或掃描來源）"
3. 若為黑名單 IP：
   - riskAssessment 需特別標註惡意攻擊歷史與高威脅。

請以嚴格的 JSON 格式回傳，不要包含 markdown 標籤或額外文字，格式如下：
{
  "connectionType": "字串，例如：ISP (家用/寬頻) 或 Hosting / Datacenter",
  "riskAssessment": "繁體中文字串，精簡專業的風險與代理屬性評估描述",
  "riskLevel": "高風險" 或 "中風險" 或 "低至中" 或 "低風險"
}`;

  try {
    const ai = new GoogleGenAI({ apiKey });
    // 優先使用可用性極高的 gemini-3-flash-preview，若有異常可降級
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt
    });

    const responseText = response.text ? response.text.trim() : '';
    // 去除可能的 markdown ```json 包裝
    const cleanJson = responseText
      .replace(/^```json\s*/i, '')
      .replace(/```$/i, '')
      .trim();

    const parsed = JSON.parse(cleanJson);

    const result: IpSecurityAssessment = {
      connectionType: parsed.connectionType || input.category,
      riskAssessment: parsed.riskAssessment || '',
      riskLevel: parsed.riskLevel || '低至中',
      source: 'ai_agent'
    };

    setCachedAssessment(cacheKey, result);
    return result;
  } catch (err) {
    // 若 AI 連線異常或解析失敗，自動採用備援規則保證穩定運作
    const fallbackResult = generateFallbackAssessment(input);
    return fallbackResult;
  }
}
