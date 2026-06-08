const https = require('https');
const fs = require('fs');

const envFile = fs.readFileSync('.env.render', 'utf8');
const tokenMatch = envFile.match(/RENDER_API_TOKEN=(.+)/);
const API_TOKEN = tokenMatch[1].trim();

const options = {
  hostname: 'api.render.com',
  path: '/v1/services',
  method: 'GET',
  headers: {'Authorization': `Bearer ${API_TOKEN}`}
};

https.get(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const servicesData = JSON.parse(data);
    const services = servicesData.map(item => item.service);
    
    console.log('Servicos restantes:');
    services.forEach(s => {
      if (s) console.log(`  - ${s.name} (${s.id}) [${s.type}]`);
    });
  });
}).on('error', e => console.error(e));
