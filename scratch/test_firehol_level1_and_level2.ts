import { checkSingleIpFirehol, analyzeCsvWithFirehol } from '../src/services/fireholService';

async function testFireholLevel2() {
  console.log('=== 測試 1: 單一 IP 比對 ===');

  // 1.10.16.5 命中 Level 1 (1.10.16.0/20)
  console.log('查詢 1.10.16.5 (預期 Level 1):');
  const resL1 = await checkSingleIpFirehol('1.10.16.5');
  console.log(`- isListed: ${resL1.isListed}`);
  console.log(`- threatLevel: ${resL1.threatLevel}`);
  console.log(`- source: ${resL1.source}`);
  console.log(`- message: ${resL1.message}`);

  // 1.6.29.197 命中 Level 2
  console.log('\n查詢 1.6.29.197 (預期 Level 2):');
  const resL2 = await checkSingleIpFirehol('1.6.29.197');
  console.log(`- isListed: ${resL2.isListed}`);
  console.log(`- threatLevel: ${resL2.threatLevel}`);
  console.log(`- source: ${resL2.source}`);
  console.log(`- message: ${resL2.message}`);

  // 1.1.1.1 乾淨 IP
  console.log('\n查詢 1.1.1.1 (預期 Clean):');
  const resClean = await checkSingleIpFirehol('1.1.1.1');
  console.log(`- isListed: ${resClean.isListed}`);
  console.log(`- threatLevel: ${resClean.threatLevel}`);
  console.log(`- source: ${resClean.source}`);

  console.log('\n=== 測試 2: CSV 批次分析 ===');
  const sampleCsv = `ip,doc_count
1.10.16.5,50
1.6.29.197,30
1.1.1.1,100`;

  const csvRes = await analyzeCsvWithFirehol(Buffer.from(sampleCsv));
  console.log(`總 IP 數: ${csvRes.overview.totalIpCount}`);
  console.log(`命中 IP 數: ${csvRes.overview.listedIpCount}`);
  console.log(`Level 1 命中數: ${csvRes.overview.level1Count}`);
  console.log(`Level 2 命中數: ${csvRes.overview.level2Count}`);
  console.log(`Spamhaus 命中數: ${csvRes.overview.spamhausCount}`);
  console.log('命中清單:');
  for (const item of csvRes.listedIps) {
    console.log(`- ${item.ip} | 請求數: ${item.requests} | 來源: ${item.source}`);
  }
}

testFireholLevel2().catch(console.error);
