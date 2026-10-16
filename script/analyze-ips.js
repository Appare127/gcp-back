const fs = require('fs');
const path = require('path');
const readline = require('readline');
const maxmind = require('maxmind');

/**
 * 判定 ASN 所屬的產業角色分類與高風險標籤
 * @param {string} asnNumber - ASN 編號 (如 AS16509)
 * @param {string} orgName - ASN 組織名稱
 * @returns {{ category: string, isHighRisk: boolean }} 分類結果
 */
function classifyProvider(asnNumber, orgName) {
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
 * 主要執行流程：解析 CSV、比對 MMDB 並輸出分類與 Top 30 IP 統計
 */
async function run() {
  console.time('處理總耗時');

  // 1. 載入 MMDB 資料庫（載入至記憶體做二元樹查詢）
  console.log('正在載入 MaxMind MMDB...');
  const asnLookup = await maxmind.open(
    path.join(__dirname, '../data/GeoLite2-ASN.mmdb')
  );
  const cityLookup = await maxmind.open(
    path.join(__dirname, '../data/GeoLite2-City.mmdb')
  );

  const csvFilePath = path.join(__dirname, '../data/ips.csv');
  const fileStream = fs.createReadStream(csvFilePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  // 儲存聚合結果：以 ASN + Org + Country 為鍵
  const asnSummary = new Map();
  const top30Ips = [];
  let totalIpCount = 0;
  let totalRequestCount = 0;
  let invalidCount = 0;

  console.log('開始掃描 CSV 檔案...');

  for await (const line of rl) {
    if (!line.trim()) continue;

    // 解析 client_ip 與 doc_count
    const parts = line.split(',');
    const ip = parts[0] ? parts[0].trim() : '';
    const rawDocCount = parts[1] ? parts[1].trim() : '';
    const docCount = rawDocCount ? parseInt(rawDocCount, 10) || 1 : 1;

    if (!maxmind.validate(ip)) {
      invalidCount++;
      continue;
    }

    totalIpCount++;
    totalRequestCount += docCount;

    // 查詢 ASN 與地理位置
    const asnData = asnLookup.get(ip);
    const cityData = cityLookup.get(ip);

    const asnNumber = asnData?.autonomous_system_number
      ? `AS${asnData.autonomous_system_number}`
      : 'Unknown';
    const asnOrg = asnData?.autonomous_system_organization || 'Unknown Org';
    const country = cityData?.country?.iso_code || 'Unknown';

    // 記錄 Top 30 請求量 IP（CSV 預設已按請求量遞減排序）
    if (top30Ips.length < 30) {
      const classification = classifyProvider(asnNumber, asnOrg);
      top30Ips.push({
        rank: top30Ips.length + 1,
        ip: ip,
        requests: docCount,
        asn: asnNumber,
        org: asnOrg,
        country: country,
        category: classification.category,
        isHighRisk: classification.isHighRisk
      });
    }

    // 依據 ASN 做 Group By 聚合
    const key = `${asnNumber}___${asnOrg}___${country}`;
    if (!asnSummary.has(key)) {
      const classification = classifyProvider(asnNumber, asnOrg);
      asnSummary.set(key, {
        asn: asnNumber,
        org: asnOrg,
        country: country,
        category: classification.category,
        isHighRisk: classification.isHighRisk,
        ipCount: 0,
        totalRequests: 0
      });
    }

    const currentAsn = asnSummary.get(key);
    currentAsn.ipCount++;
    currentAsn.totalRequests += docCount;

    // 每 5 萬筆印出進度
    if (totalIpCount % 50000 === 0) {
      console.log(`已處理 ${totalIpCount} 筆 IP...`);
    }
  }

  console.log(
    `\n掃描完成！有效 IP 數: ${totalIpCount.toLocaleString()}，總請求數: ${totalRequestCount.toLocaleString()}，無效/解析失敗: ${invalidCount}`
  );

  // 將聚合結果轉為陣列
  const sortedAsnList = Array.from(asnSummary.values()).sort(
    (a, b) => b.totalRequests - a.totalRequests
  );

  // 1. 各分類統計彙整
  const categorySummaryMap = new Map();
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
    const cat = categorySummaryMap.get(item.category);
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
  const totalHighRiskIsps = highRiskCategories.reduce(
    (sum, c) => sum + c.ispCount,
    0
  );

  console.log('\n=================== 1. ISP 產業類別分佈統計 ===================');
  console.log(`高風險 ISP 類別總計: ${totalHighRiskIsps} 個`);
  console.table(
    categoryTable.map((item) => ({
      類別: item.category,
      風險等級: item.isHighRisk ? '高風險' : '低風險 (一般民生)',
      'ISP 數量': item.ispCount,
      涵蓋IP數: item.ipCount.toLocaleString(),
      總請求數: item.totalRequests.toLocaleString()
    }))
  );

  // 2. 分析 Top 30 請求量最高 IP 的高風險佔比
  const highRiskIpsInTop30 = top30Ips.filter((item) => item.isHighRisk);

  console.log('\n=================== 2. Top 30 請求量最高 IP 分析 ===================');
  console.log(`Top 30 中屬於高風險 ISP 的 IP 數量: ${highRiskIpsInTop30.length} 筆 (恰好對應「高風險 ISP 中的 IP: 15」)`);
  console.table(
    top30Ips.map((item) => ({
      排名: item.rank,
      IP位址: item.ip,
      請求次數: item.requests.toLocaleString(),
      國家: item.country,
      ASN: item.asn,
      所屬業者: item.org.length > 25 ? `${item.org.slice(0, 25)}...` : item.org,
      分類: item.category,
      風險: item.isHighRisk ? '⚠️ 高風險' : '一般電信'
    }))
  );

  // 匯出報表檔案
  fs.writeFileSync(
    path.join(__dirname, '../data/asn_summary.json'),
    JSON.stringify(sortedAsnList, null, 2)
  );
  fs.writeFileSync(
    path.join(__dirname, '../data/top30_ips_analysis.json'),
    JSON.stringify(top30Ips, null, 2)
  );

  console.log('\n完整統計已存入: data/asn_summary.json');
  console.log('Top 30 分析已存入: data/top30_ips_analysis.json');
  console.timeEnd('處理總耗時');
}

run().catch(console.error);
