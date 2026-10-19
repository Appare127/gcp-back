import fs from 'fs';
import { analyzeIpCsvStream, checkSingleIpGeoLite } from '../src/services/ipAnalysisService';

async function testDetailList() {
  console.log('=== 測試 1: 使用 Kibana 引號 CSV 測試 detailList ===');
  const csvBuffer = fs.readFileSync('C:/Users/User/.gemini/antigravity-ide/brain/2a72cda4-1bca-4df4-a09d-5489721bf756/.user_uploaded/media_1792378036829.csv');
  const csvResult = await analyzeIpCsvStream(csvBuffer);

  console.log(`總 IP 數: ${csvResult.overview.totalIpCount}`);
  console.log(`detailList 長度: ${csvResult.detailList.length}`);
  console.log('detailList 內容 (前 5 筆):');
  for (const item of csvResult.detailList.slice(0, 5)) {
    console.log(`[#${item.rank}] IP: ${item.ip} | 國家: ${item.country} | ASN: ${item.asn} | 業者: ${item.org} | 分類: ${item.category} | CIDR: ${item.subnet} | 請求數: ${item.requests} | 高風險: ${item.isHighRisk}`);
  }

  console.log('\n=== 測試 2: 單一 IP 查詢 checkSingleIpGeoLite ===');
  const singleResult = await checkSingleIpGeoLite('167.179.111.165');
  console.log(`singleResult.detailList 長度: ${singleResult.detailList.length}`);
  const sItem = singleResult.detailList[0];
  console.log(`IP: ${sItem.ip} | 國家: ${sItem.country} | ASN: ${sItem.asn} | 業者: ${sItem.org} | 分類: ${sItem.category} | CIDR: ${sItem.subnet} | 請求數: ${sItem.requests}`);
}

testDetailList().catch(console.error);
