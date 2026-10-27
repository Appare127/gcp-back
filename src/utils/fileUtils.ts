/**
 * 檔案通用處理工具庫 (File Utilities)
 * 涵蓋 CSV、文字日誌與結構化檔案之行解析、欄位清洗與標題過濾等通用函式
 */

/**
 * 清理單一欄位文字：去除前後空白、雙引號或單引號，並剔除 UTF-8 BOM 與隱形零寬字元
 * @param field 原始欄位字串
 */
export function cleanCsvField(field?: string): string {
  if (!field) return '';
  return field
    .replace(/^[\uFEFF\u200B-\u200D]+|[\uFEFF\u200B-\u200D]+$/g, '')
    .trim()
    .replace(/^["']+|["']+$/g, '')
    .replace(/^[\uFEFF\u200B-\u200D]+|[\uFEFF\u200B-\u200D]+$/g, '')
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
 * 判斷是否為 CSV 的標題列、註解或統計彙總列 (相容 Kibana、Elasticsearch、繁簡中文與常見英文 Header)
 * @param ipStr 第一欄字串 (通常為 IP 欄位)
 * @param rawDocCount 第二欄字串 (通常為計數欄位)
 */
export function isCsvHeader(ipStr: string, rawDocCount?: string): boolean {
  const cleanIp = cleanCsvField(ipStr).toLowerCase();
  const cleanCount = cleanCsvField(rawDocCount).toLowerCase();

  // 若首欄為空，視為無效行
  if (!cleanIp) {
    return true;
  }

  // 1. 若以註解符號開頭 (#, //, ;)
  if (
    cleanIp.startsWith('#') ||
    cleanIp.startsWith('//') ||
    cleanIp.startsWith(';')
  ) {
    return true;
  }

  // 2. 彙總與結算關鍵字 (例如 Total, Sum, 合計等，避免統計列被誤當 IP 查詢)
  const summaryKeywords = [
    'total',
    'summary',
    'sum',
    'all',
    'others',
    'other',
    '合計',
    '總計',
    '小計',
    '彙整',
    '統計'
  ];
  if (summaryKeywords.includes(cleanIp)) {
    return true;
  }

  // 3. 若首欄包含常見 IP / 主機 / 來源標題關鍵字
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
    'host',
    'source',
    'client',
    'origin',
    'remote',
    'destination',
    'target',
    'src',
    'dst',
    'cip',
    'c-ip',
    '排名',
    '最前值',
    '地址',
    '位址',
    '主機',
    '來源',
    '客戶端',
    '用戶',
    '訪客',
    '目標'
  ];
  if (ipKeywords.some((kw) => cleanIp.includes(kw))) {
    return true;
  }

  // 4. 若次欄包含計數相關標題關鍵字
  if (cleanCount) {
    const countKeywords = [
      'doc_count',
      'count',
      'requests',
      'request_count',
      'total',
      'hits',
      'events',
      'times',
      '计数',
      '計數',
      '次數',
      '次数',
      '記錄',
      '记录',
      '數量',
      '数量'
    ];
    if (countKeywords.some((kw) => cleanCount.includes(kw))) {
      return true;
    }
  }

  return false;
}
