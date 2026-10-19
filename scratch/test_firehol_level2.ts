async function testFetch() {
  const url = 'https://raw.githubusercontent.com/firehol/blocklist-ipsets/master/firehol_level2.netset';
  console.log('Fetching', url);
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    console.log('Status:', res.status, res.statusText);
    if (res.ok) {
      const text = await res.text();
      console.log('Fetched lines:', text.split('\n').length);
      console.log('First 5 lines:');
      console.log(text.split('\n').slice(0, 5).join('\n'));
    }
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

testFetch();
