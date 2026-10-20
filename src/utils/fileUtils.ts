/**
 * 檔案通用處理工具庫 (File Utilities)
 * 涵蓋 CSV、文字日誌與結構化檔案之行解析、欄位清洗與標題過濾等通用函式
 */

/**
 * 清理單一欄位文字：去除前後空白、雙引號或單引號
 * @param field 原始欄位字串
 */
export function cleanCsvField(field?: string): string {
  if (!field) return '';
  return field
    .trim()
    .replace(/^["']+|["']+$/g, '')
    .trim();
}

/**
 * 安全解析單行 CSV，全面相容雙引號包裹欄位 (如 "1.1.1.1",42) 與純逗號格式
 * @param line 單行 CSV 內容
 * @returns 解析後的 [欄位1, 欄位2] 字串陣列
 */
export function parseCsvLine(line: string): [string, string] {
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
 * 判斷是否為 CSV 的標題列 (相容 Kibana、Elasticsearch、繁簡中文與常見英文 Header)
 * @param ipStr 第一欄字串 (通常為 IP 欄位)
 * @param rawDocCount 第二欄字串 (通常為計數欄位)
 */
export function isCsvHeader(ipStr: string, rawDocCount?: string): boolean {
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
