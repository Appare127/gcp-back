import { GoogleGenAI } from '@google/genai';
import { AppError } from '@/utils/appError';
import type { SecurityIntelSingleIpResult } from './types';

/**
 * AI 網路查詢參考來源
 */
export interface AiReferenceSource {
  /** 來源標題 */
  title: string;
  /** 來源網址 */
  uri: string;
}

/**
 * IP 安全風險評估結果介面
 */
export interface IpSecurityAssessment {
  /** 連線屬性判定 (例如：Hosting / Datacenter、ISP (家用/寬頻)、VPN / Proxy、CDN / Edge 等) */
  connectionType: string;
  /** 風險等級 (例如：高風險、中風險、低至中、低風險 等) */
  riskLevel: string;
  /** 專業資安情資分析與威脅評估 (深入、專業、不侷限篇幅的繁體中文分析論述) */
  riskAssessment: string;
  /** 網路公開情資查證結果 (條列說明搜尋取得之威脅報告、社群評價或歷史通報；若無則說明查無公開威脅情資) */
  onlineFindings: string;
  /** 處置與防禦建議 (例如：防火牆封鎖、限流、行為監控或正常通行等) */
  recommendations: string;
  /** 網路查詢參考來源 (Google Search Grounding) */
  references: AiReferenceSource[];
  /** 評估來源 */
  source: 'ai_agent' | 'rule_fallback';
}

/**
 * 送交 AI Agent 分析之 IP 綜合情資 (即單一 IP 綜合查詢結果，不含 AI 評估本身)
 */
export type IpAnalysisInputFeatures = Omit<
  SecurityIntelSingleIpResult,
  'aiAssessment'
>;

/**
 * AI Agent 測試溝通輸入選項
 */
export interface AiAgentChatOptions {
  /** 測試提示詞或訊息 (若未提供則預設發送資安 Agent 診斷指令) */
  prompt?: string | undefined;
  /** 系統角色指示指令 (System Instruction) */
  systemInstruction?: string | undefined;
  /** 是否啟用 Google Search 即時聯網搜尋 (預設 true) */
  enableGoogleSearch?: boolean | undefined;
  /** 指定 Gemini 模型 (預設 gemini-3-flash-preview) */
  model?: string | undefined;
}

/**
 * AI Agent 測試溝通回應結果
 */
export interface AiAgentChatResult {
  /** 測試提示詞 */
  prompt: string;
  /** AI 回應內容 (繁體中文回覆) */
  reply: string;
  /** 使用之模型名稱 */
  model: string;
  /** 是否啟用 Google 搜尋工具 */
  googleSearchEnabled: boolean;
  /** 搜尋參考來源清單 (若有啟用 Google Search) */
  references: AiReferenceSource[];
  /** 執行耗時 (毫秒) */
  durationMs: number;
  /** 系統降級或提醒提示 (例如 Google Search 工具配額超限時的降級說明) */
  note?: string | undefined;
  /** 建立時間 ISO 字串 */
  timestamp: string;
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
function setCachedAssessment(
  cacheKey: string,
  result: IpSecurityAssessment
): void {
  assessmentCache.set(cacheKey, {
    result,
    timestamp: Date.now()
  });
}

/**
 * 依 FireHOL / Spamhaus 命中狀態組成黑名單來源文字 (例如 "FireHOL Level 1 / FireHOL Level 2")
 */
function getBlacklistSourceText(
  firehol: IpAnalysisInputFeatures['firehol']
): string {
  const sources: string[] = [];
  if (firehol.ipv4ListedLevel1) sources.push('FireHOL Level 1');
  if (firehol.ipv4ListedLevel2) sources.push('FireHOL Level 2');
  if (firehol.ipv6SpamhausListed) sources.push('Spamhaus DROPv6');
  return sources.join(' / ');
}

/**
 * 本機規則備援評估 (當 AI 連線瞬斷或 API 逾時時保證服務不中斷)
 */
function generateFallbackAssessment(
  input: IpAnalysisInputFeatures
): IpSecurityAssessment {
  const { category, firehol } = input;
  const isListed = firehol.isListed;
  const blacklistSource = getBlacklistSourceText(firehol);
  const offline = {
    onlineFindings: '未進行網路即時查詢 (採用本機資安規則庫備援分析)',
    references: []
  };

  if (isListed) {
    return {
      connectionType: `${category} (惡意黑名單)`,
      riskLevel: '高風險',
      riskAssessment: `該 IP 已命中線上高信賴度惡意黑名單（${blacklistSource}），具備確認的攻擊、惡意掃描或濫用歷史。通常代表該節點正被攻擊者活躍控制中，或屬於已知殭屍網路 C2 節點、惡意爬蟲發送端。`,
      recommendations:
        '強烈建議直接在邊界防火牆或 WAF 設定 Drop/Block 規則，全面拒絕該 IP 存取；若有主動通訊應深入排查內部受害主機。',
      ...offline,
      source: 'rule_fallback'
    };
  }

  if (category === '主機供應商') {
    return {
      connectionType: 'Hosting / Datacenter',
      riskLevel: '高風險',
      riskAssessment: `該 IP 屬於機房與資料中心（Hosting / Datacenter）環境。機房網段常被惡意人士租用作為 VPN、匿名代理跳板、爬蟲、暴力密碼破解或分散式阻斷服務（DDoS）的流量來源。`,
      recommendations:
        '若您的系統服務對象主要為一般終端使用者，可考慮對機房來源 IP 實施嚴格速率限制 (Rate Limit) 或啟用驗證碼 (CAPTCHA) 防護。',
      ...offline,
      source: 'rule_fallback'
    };
  }

  if (category === 'CDN／內容傳遞服務商') {
    return {
      connectionType: 'CDN / Proxy',
      riskLevel: '中風險',
      riskAssessment: `該 IP 屬於 CDN 內容傳遞或反向代理邊緣節點。正常情況下使用者真實 IP 可能被隱藏在此節點之後，需透過 X-Forwarded-For 等標頭輔助檢視原始客戶端來源。`,
      recommendations:
        '建議檢查反向代理之 X-Forwarded-For 標頭以確認真實請求客戶端，並持續觀察是否有偽裝 CDN 的連線行為。',
      ...offline,
      source: 'rule_fallback'
    };
  }

  if (category === '代理／網路服務供應商') {
    return {
      connectionType: 'Proxy / VPN',
      riskLevel: '高風險',
      riskAssessment: `該 IP 被歸類為商業或公開代理／VPN 服務供應商，常被作為規避地域限制或隱匿攻擊真實身分的通道，具有較高的匿名偽裝與繞過風險。`,
      recommendations:
        '建議強化對此 IP 之身分驗證程序，並密切監控敏感業務（如登入、轉帳、下單等）之異常活動。',
      ...offline,
      source: 'rule_fallback'
    };
  }

  // 預設電信業者
  return {
    connectionType: 'ISP (家用/寬頻)',
    riskLevel: '低至中',
    riskAssessment: `該 IP 屬於標準電信運營商（ISP）所配發之寬頻或行動網路地址。大部分情況下為真實使用者連線，但若近期出現異常巨量請求或被 AbuseIPDB 社群回報，則可能代表該終端設備已感染惡意軟體遭殭屍網路控制（如住宅代理 Residential Proxy 或肉雞）。`,
    recommendations:
      '可維持一般防護監控。若出現短時間高頻存取或觸發 WAF 規則，可啟動暫時性封鎖或行為驗證。',
    ...offline,
    source: 'rule_fallback'
  };
}

/**
 * 將單一 IP 綜合情資組成 AI Agent 提示詞
 */
function buildAssessmentPrompt(input: IpAnalysisInputFeatures): string {
  const { firehol, abuseIpDb } = input;
  const blacklistSource = getBlacklistSourceText(firehol);

  return `你是一位世界頂尖的網路安全威脅情資 (Cyber Threat Intelligence, CTI) 分析專家。
請務必同時結合「已知系統分析資料」與「你透過 Google Search 搜尋取得的公開網路威脅情報」，針對目標 IP 撰寫專業、深入且客製化的安全情報評估報告。
文字說明請使用繁體中文，行文應展現專業資安分析師的洞察力與權威性，不要使用簡陋或受限的套版文字。

【已知情資：本系統檢測資料】
① 基礎地理與網路營運商 (GeoLite2)
- IP 位址: ${input.ip} (協定版本: ${input.ipType})
- 國家與地區: ${input.countryName} (${input.country})，城市: ${input.city}
- 自治系統: ${input.asn} (組織: ${input.org})
- 聚合網段: ${input.subnet}
- 初步產業角色分類: ${input.category}

② 線上黑名單命中狀態 (FireHOL Level 1 & 2 / Spamhaus DROPv6)
- 黑名單狀態: ${firehol.isListed ? `⚠️ 命中黑名單 (${blacklistSource})` : '✅ 未列入惡意黑名單 (乾淨)'}
- 資料庫更新時間: ${firehol.lastUpdated}

③ 社群惡意檢舉歷史 (AbuseIPDB 近 90 天)
- 查詢狀態: ${abuseIpDb.status}
- 濫用信心指數 (Abuse Confidence Score): ${abuseIpDb.abuseConfidenceScore ?? '無紀錄'}${abuseIpDb.abuseConfidenceScore !== null ? '%' : ''}
- 90 天檢舉總次數: ${abuseIpDb.totalReports} 次
- 最後檢舉時間: ${abuseIpDb.lastReportedAt ?? '無'}
- 登記用途類型: ${abuseIpDb.usageType || '未知'}
- 登記 ISP / 網域: ${abuseIpDb.isp || '未知'} / ${abuseIpDb.domain || '未知'}
- 白名單狀態: ${abuseIpDb.isWhitelisted === null ? '未知' : abuseIpDb.isWhitelisted ? '已列入白名單' : '未列入白名單'}

【網路即時查詢任務 (重要必做)】
請充分使用 Google 搜尋工具，主動查證以下情報：
1. 查詢目標 IP「${input.ip}」在公開資安社群或情資平台（如 AbuseIPDB、VirusTotal、GreyNoise、Shodan、Cisco Talos、AlienVault OTX、SANS ISC 等）是否有近期的惡意活動通報、掃描紀錄、CVE 攻擊、垃圾郵件發送或暴力破解紀錄。
2. 查詢該聚合網段「${input.subnet}」或營運商「${input.asn} ${input.org}」的資安聲譽（是否為惡名昭彰的防彈主機 Bulletproof Hoster、惡意跳板集散地、常見 VPN/商業代理，或是一般良善之民用寬頻電信商）。
3. 若網路查詢查無負面資料，亦請如實說明「查無公開惡意威脅通報」，不得憑空捏造。

【撰寫評估指引】
1. 分析報告請兼顧網路營運環境屬性、威脅信號（黑名單與檢舉分數）以及網路查得之情資做深度交叉比對。
2. 若系統情資與網路公開情資有差異（例如本系統顯示乾淨但社群已有通報，或反之），請專業客觀地指出其差異與潛在威脅演變。
3. 風險評估文字請專業、嚴謹且深入，充分剖析可能攻擊手法（如 C2 通訊、殭屍網路肉雞、字典檔暴力破解、漏洞利用掃描或住宅代理池存取等）。

【回傳格式要求】
請只回傳標準 JSON 物件，不要包覆額外說明文字或非 JSON 內容，結構如下：
{
  "connectionType": "連線屬性判定，例如：Hosting / Datacenter (雲端主機)、ISP (家用/寬頻)、VPN / Proxy (商業匿名節點)、CDN / Edge 等",
  "riskLevel": "風險等級判定，例如：極高風險、高風險、中風險、低至中、低風險",
  "riskAssessment": "繁體中文專業資安分析評論，請以詳細且嚴謹的文字闡述該 IP 的網路背景、威脅態勢、潛在攻擊行為與整體安全評估",
  "onlineFindings": "繁體中文條列說明透過 Google 搜尋查得的公開情資與資安通報；若無則說明查無公開惡意活動資料",
  "recommendations": "具體的資安防禦或處置建議 (如防火牆封鎖、限流、加強驗證或正常放行等)"
}`;
}

/**
 * 從 Gemini 回應文字中擷取 JSON 物件 (啟用 Google Search 時可能自帶多餘文字)
 */
function extractJsonText(responseText: string): string {
  const matched = responseText.match(/\{[\s\S]*\}/);
  return matched ? matched[0] : responseText;
}

/**
 * 呼叫 Gemini AI Agent (啟用 Google Search 網路即時情資查詢) 進行 IP 風險與代理屬性深度評估
 * @param input 單一 IP 綜合情資 (GeoLite2 + FireHOL / Spamhaus + AbuseIPDB)
 */
/**
 * 檢查是否為 Gemini API 配額超限錯誤 (HTTP 429 或 RESOURCE_EXHAUSTED)
 */
function isQuotaExceededError(err: unknown): boolean {
  if (!err) return false;
  const errorStr = String(err);
  return (
    errorStr.includes('429') ||
    errorStr.includes('RESOURCE_EXHAUSTED') ||
    errorStr.includes('quota') ||
    errorStr.includes('rate-limit')
  );
}

/**
 * 格式化 AI 錯誤訊息，過濾原始 RPC JSON 雜訊並給出清晰引導
 */
function formatAiErrorMessage(err: unknown): string {
  if (!err) return 'AI Agent 連線發生未知錯誤';
  const rawMsg = err instanceof Error ? err.message : String(err);
  if (isQuotaExceededError(err)) {
    return 'Gemini API 配額已達上限 (429 RESOURCE_EXHAUSTED)。免費額度可能已耗盡或頻率過高，請稍候重試或至 Google AI Studio 檢查配額狀態。';
  }
  const jsonMatch = rawMsg.match(/"message":\s*"([^"]+)"/);
  if (jsonMatch && jsonMatch[1]) {
    return `AI Agent 溝通失敗：${jsonMatch[1]}`;
  }
  return `AI Agent 溝通失敗：${rawMsg.replace(/[\r\n\t]+/g, ' ').slice(0, 200)}`;
}

/**
 * 呼叫 Gemini AI Agent (啟用 Google Search 網路即時情資查詢) 進行 IP 風險與代理屬性深度評估
 * @param input 單一 IP 綜合情資 (GeoLite2 + FireHOL / Spamhaus + AbuseIPDB)
 */
export async function analyzeIpWithAiAgent(
  input: IpAnalysisInputFeatures
): Promise<IpSecurityAssessment> {
  const cacheKey = `${input.ip}_${input.asn}_${input.firehol.isListed}_${input.abuseIpDb.abuseConfidenceScore}`;
  const cached = getCachedAssessment(cacheKey);
  if (cached) {
    return cached;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return generateFallbackAssessment(input);
  }

  const prompt = buildAssessmentPrompt(input);

  try {
    const ai = new GoogleGenAI({ apiKey });
    let response;
    let usedSearch = true;

    try {
      // 優先使用具備推論與 Grounding 能力的 gemini-3-flash-preview
      response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });
    } catch (searchErr) {
      // 若遭遇 Google Search 429 配額超額，自動平滑降級為純模型推論
      if (isQuotaExceededError(searchErr)) {
        usedSearch = false;
        response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: prompt
        });
      } else {
        throw searchErr;
      }
    }

    const responseText = response.text ? response.text.trim() : '';
    const parsed = JSON.parse(extractJsonText(responseText));

    // 取出 Google Search 參考來源 (Grounding chunks)
    const groundingChunks =
      response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
    const references: AiReferenceSource[] = groundingChunks
      .filter((chunk) => chunk.web?.uri)
      .map((chunk) => ({
        title: chunk.web?.title || '',
        uri: chunk.web?.uri || ''
      }));

    const result: IpSecurityAssessment = {
      connectionType: parsed.connectionType || input.category,
      riskLevel: parsed.riskLevel || '低至中',
      riskAssessment: parsed.riskAssessment || '',
      onlineFindings:
        parsed.onlineFindings ||
        (usedSearch
          ? '未查得公開惡意活動情資'
          : '未進行網路即時查詢 (Google Search 工具配額達上限，採用純模型推論)'),
      recommendations: parsed.recommendations || '建議維持一般連線監控。',
      references,
      source: 'ai_agent'
    };

    setCachedAssessment(cacheKey, result);
    return result;
  } catch (err) {
    // 若連純模型都連線異常、API 逾時或配額超標，自動平滑切換至本機備援規則庫
    const fallbackResult = generateFallbackAssessment(input);
    return fallbackResult;
  }
}

/**
 * 測試與 Gemini AI Agent 進行即時對話與連線
 * @param options 測試溝通選項 (包含 prompt、systemInstruction、enableGoogleSearch、model)
 */
export async function testAiAgentCommunication(
  options: AiAgentChatOptions = {}
): Promise<AiAgentChatResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new AppError(
      '未設定 GEMINI_API_KEY 環境變數，無法與 AI Agent 建立連線',
      500
    );
  }

  const prompt =
    options.prompt && options.prompt.trim().length > 0
      ? options.prompt.trim()
      : '請簡短自我介紹你的角色與職責，並列出一則近期的重大網路資安威脅或防禦建議。';

  const model = options.model?.trim() || 'gemini-3-flash-preview';
  const initialGoogleSearch = options.enableGoogleSearch ?? true;
  const systemInstruction =
    options.systemInstruction?.trim() ||
    '你是一位頂尖的網路安全威脅情資 (Cyber Threat Intelligence, CTI) 分析 Agent。請使用專業、親切且嚴謹的繁體中文回答使用者的問題與指示。';

  const startTime = Date.now();
  const ai = new GoogleGenAI({ apiKey });

  let actualGoogleSearch = initialGoogleSearch;
  let fallbackNote: string | undefined;
  let response;

  try {
    const config = actualGoogleSearch
      ? { systemInstruction, tools: [{ googleSearch: {} }] }
      : { systemInstruction };

    response = await ai.models.generateContent({
      model,
      contents: prompt,
      config
    });
  } catch (err: unknown) {
    // 若原先啟用 Google Search 且遭遇 429 配額超額或錯誤，自動降級為純模型推論重試
    if (actualGoogleSearch && isQuotaExceededError(err)) {
      actualGoogleSearch = false;
      fallbackNote =
        '⚠️ 偵測到 Google Search 工具目前配額已用盡 (429 RESOURCE_EXHAUSTED)，已自動平滑降級為純模型推論模式。';
      try {
        response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: { systemInstruction }
        });
      } catch (retryErr: unknown) {
        throw new AppError(formatAiErrorMessage(retryErr), 502);
      }
    } else {
      throw new AppError(formatAiErrorMessage(err), 502);
    }
  }

  const durationMs = Date.now() - startTime;
  const reply = response.text ? response.text.trim() : '';

  // 取出 Google Search 參考來源 (Grounding chunks)
  const groundingChunks =
    response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  const references: AiReferenceSource[] = groundingChunks
    .filter((chunk) => chunk.web?.uri)
    .map((chunk) => ({
      title: chunk.web?.title || '',
      uri: chunk.web?.uri || ''
    }));

  const result: AiAgentChatResult = {
    prompt,
    reply,
    model,
    googleSearchEnabled: actualGoogleSearch,
    references,
    durationMs,
    timestamp: new Date().toISOString()
  };

  if (fallbackNote) {
    result.note = fallbackNote;
  }

  return result;
}

