const https = require('https');
const fs = require('fs');

const envFile = fs.readFileSync('.env.render', 'utf8');
const tokenMatch = envFile.match(/RENDER_API_TOKEN=(.+)/);
const API_TOKEN = tokenMatch[1].trim();

const options = {
  hostname: 'api.render.com',
  path: '/v1/services',
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${API_TOKEN}`,
  }
};

https.get(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:');
    try {
      const parsed = JSON.parse(data);
      console.log(JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log(data);
    }
  });
}).on('error', (e) => {
  console.error(e);
});
