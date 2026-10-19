import fs from 'fs';
import { analyzeIpCsvStream, checkSingleIpGeoLite } from '../src/services/ipAnalysisService';

async function testToggle() {
  const csvBuffer = fs.readFileSync('C:/Users/User/.gemini/antigravity-ide/brain/2a72cda4-1bca-4df4-a09d-5489721bf756/.user_uploaded/media_1792378036829.csv');

  console.log('=== CSV 測試: 明確傳入 includeDetail: true ===');
  const resWithDetail = await analyzeIpCsvStream(csvBuffer, { includeDetail: true });
  for (const item of resWithDetail.detailList) {
    console.log(`[#${item.rank}] IP: ${item.ip} | 地理位置: ${item.country} | 業者: ${item.org}`);
  }

  console.log('\n=== 單一 IP 測試 ===');
  const single = await checkSingleIpGeoLite('167.179.111.165');
  console.log('單一 IP detailList country:', single.detailList[0].country);
  console.log('單一 IP top30Ips country:', single.top30Ips[0].country);
}

testToggle().catch(console.error);
