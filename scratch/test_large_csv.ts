import fs from 'fs';
import { analyzeIpCsvStream } from '../src/services/ipAnalysisService';

async function testLargeCsv() {
  console.log('Testing large CSV (data/ips.csv)...');
  const buffer = fs.readFileSync('data/ips.csv');
  console.time('analyze');
  const result = await analyzeIpCsvStream(buffer);
  console.timeEnd('analyze');

  console.log('Total IPs:', result.overview.totalIpCount);
  console.log('Total Subnets:', result.overview.totalSubnetCount);
  console.log('Detail list length:', result.detailList.length);
  console.log('Top 30 subnets length:', result.top30Subnets.length);
  console.log('Top 30 IPs length:', result.top30Ips.length);
  console.log('First detail item:', result.detailList[0]);
}

testLargeCsv().catch(console.error);
