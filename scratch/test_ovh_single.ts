import { checkSingleIpGeoLite } from '../src/services/ipAnalysisService';

async function testSingleIp() {
  const ip = '192.99.15.12';
  console.log(`測試單一 IP 查詢: ${ip} (OVH SAS)`);
  const res = await checkSingleIpGeoLite(ip);
  console.log('detailList category:', res.detailList[0].category);
  console.log('top30Ips category:', res.top30Ips[0].category);
  console.log('top30Subnets category:', res.top30Subnets[0].category);
  console.log('categorySummary category:', res.categorySummary[0].category);
  console.log('aiAssessment.connectionType (保留在 AI 評估物件中):', res.aiAssessment.connectionType);
}

testSingleIp().catch(console.error);
