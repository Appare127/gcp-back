import fs from 'fs';
import path from 'path';

async function downloadBackup() {
  const url = 'https://raw.githubusercontent.com/firehol/blocklist-ipsets/master/firehol_level2.netset';
  console.log('Downloading firehol_level2.netset...');
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (res.ok) {
    const text = await res.text();
    const target = path.join(process.cwd(), 'data/firehol_level2.netset');
    fs.writeFileSync(target, text, 'utf-8');
    console.log('Saved to', target, 'Size:', text.length, 'bytes');
  } else {
    console.error('Failed to download:', res.status, res.statusText);
  }
}

downloadBackup().catch(console.error);
