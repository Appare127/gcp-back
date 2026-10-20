import path from 'path';
import maxmind, { Reader, AsnResponse, CityResponse } from 'maxmind';
import { AppError } from '@/utils/appError';
import {
  getIpv4Subnet24,
  getIpv6Subnet64
} from '@/utils/ipUtils';
// import { analyzeIpWithAiAgent } from './aiAgentService';
import { classifyProvider } from './providerClassifier';
import { GeoLiteIpCheckResult } from './types';

// 重新匯出網段工具以維持模組相容性
export { getIpv4Subnet24, getIpv6Subnet64 };

// 記憶體中的讀取器單例快取，避免每次請求都重複讀取 60MB 的資料庫
let cachedAsnReader: Reader<AsnResponse> | null = null;
let cachedCityReader: Reader<CityResponse> | null = null;

/**
 * 取得 MaxMind MMDB 讀取器 (單例模式)
 */
export async function getLookupReaders(): Promise<{
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
 * 查詢單一 IP 的 GeoLite2 (ISP / ASN 與地理位置) 資訊
 * @param ipInput 欲查詢的 IPv4 或 IPv6 位址
 */
export async function checkSingleIpGeoLite(
  ipInput: string
): Promise<GeoLiteIpCheckResult> {
  const ip = ipInput.trim();
  if (!maxmind.validate(ip)) {
    throw new AppError('輸入的 IP 格式無效 (支援 IPv4 或 IPv6)', 400);
  }

  const { asnReader, cityReader } = await getLookupReaders();
  const asnData = asnReader.get(ip);
  const cityData = cityReader.get(ip);

  const ipType: 'IPv4' | 'IPv6' = ip.includes(':') ? 'IPv6' : 'IPv4';

  const asnNumber = asnData?.autonomous_system_number
    ? `AS${asnData.autonomous_system_number}`
    : 'Unknown';
  const asnOrg = asnData?.autonomous_system_organization || 'Unknown Org';

  const classification = classifyProvider(asnNumber, asnOrg);

  const continent =
    cityData?.continent?.names?.['zh-CN'] ||
    cityData?.continent?.names?.en ||
    'Unknown';
  const country =
    cityData?.country?.iso_code ||
    cityData?.registered_country?.iso_code ||
    'Unknown';
  const countryName =
    cityData?.country?.names?.['zh-CN'] ||
    cityData?.country?.names?.en ||
    cityData?.registered_country?.names?.['zh-CN'] ||
    cityData?.registered_country?.names?.en ||
    'Unknown';
  const city =
    cityData?.city?.names?.['zh-CN'] || cityData?.city?.names?.en || 'Unknown';
  const subdivision =
    cityData?.subdivisions?.[0]?.names?.['zh-CN'] ||
    cityData?.subdivisions?.[0]?.names?.en ||
    'Unknown';
  const timeZone = cityData?.location?.time_zone || 'Unknown';
  const latitude = cityData?.location?.latitude ?? null;
  const longitude = cityData?.location?.longitude ?? null;

  // 暫時關閉 Gemini AI Agent 分析
  /*
  const aiAssessment = await analyzeIpWithAiAgent({
    ip,
    country: `${countryName} (${country})`,
    asn: asnNumber,
    org: asnOrg,
    category: classification.category
  });
  */

  return {
    ip,
    isValid: true,
    ipType,
    asn: {
      asn: asnNumber,
      autonomousSystemNumber: asnData?.autonomous_system_number ?? null,
      org: asnOrg
    },
    geo: {
      continent,
      country,
      countryName,
      city,
      subdivision,
      timeZone,
      latitude,
      longitude
    },
    classification
  };
}
