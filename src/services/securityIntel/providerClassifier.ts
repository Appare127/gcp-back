import { ProviderClassification } from './types';

/**
 * 判定 ASN 所屬的產業角色分類與高風險標籤
 * @param asnNumber 自治系統編號 (例如 "AS13335")
 * @param orgName 組織或業者名稱 (例如 "Cloudflare, Inc.")
 */
export function classifyProvider(
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
