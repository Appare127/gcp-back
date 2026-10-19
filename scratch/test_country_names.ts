import maxmind from 'maxmind';
import path from 'path';

async function test() {
  const cityReader = await maxmind.open(path.join(process.cwd(), 'data/GeoLite2-City.mmdb'));
  const ips = ['167.179.111.165', '45.76.184.231', '147.139.178.214', '1.1.1.1', '168.95.1.1', '8.8.8.8'];
  for (const ip of ips) {
    const data = cityReader.get(ip);
    const code = data?.country?.iso_code || data?.registered_country?.iso_code || 'Unknown';
    const zh = data?.country?.names?.['zh-CN'] || data?.registered_country?.names?.['zh-CN'] || '';
    const en = data?.country?.names?.en || data?.registered_country?.names?.en || '';
    console.log(`${ip} -> code: ${code}, zh: ${zh}, en: ${en}`);
  }
}

test().catch(console.error);
