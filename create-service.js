const https = require('https');
const fs = require('fs');

const envFile = fs.readFileSync('.env.render', 'utf8');
const tokenMatch = envFile.match(/RENDER_API_TOKEN=(.+)/);
const API_TOKEN = tokenMatch[1].trim();

// Payload correto para criar web service
const payload = {
  name: 'lbh-system',
  type: 'web_service',
  repo: 'https://github.com/Val7h/leveraged-buy-hold.git',
  branch: 'master',
  rootDir: '',
  buildCommand: '',
  startCommand: '/app/start.sh',
  environmentSlug: 'docker',
  envVars: [{
    key: 'NEXT_PUBLIC_API_URL',
    value: 'http://localhost:8001'
  }]
};

const bodyStr = JSON.stringify(payload);

const options = {
  hostname: 'api.render.com',
  path: '/v1/services',
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${API_TOKEN}`,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(bodyStr)
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    try {
      const parsed = JSON.parse(data);
      console.log(JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log(data);
    }
  });
});

req.on('error', e => console.error(e));
req.write(bodyStr);
req.end();
