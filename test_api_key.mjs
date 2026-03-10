import https from 'https';

const apiKey = process.env.GEMINI_API_KEY;

const options = {
  hostname: 'generativelanguage.googleapis.com',
  path: `/v1beta/models?key=${apiKey}`,
  method: 'GET'
};

https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    try {
      const json = JSON.parse(data);
      if (json.models) {
        console.log(`✅ Found ${json.models.length} models:`);
        json.models.forEach(m => console.log(`   - ${m.name}`));
      } else {
        console.log('Response:', JSON.stringify(json, null, 2).substring(0, 500));
      }
    } catch {
      console.log(data.substring(0, 500));
    }
  });
}).on('error', (e) => {
  console.error('Request failed:', e.message);
}).end();
