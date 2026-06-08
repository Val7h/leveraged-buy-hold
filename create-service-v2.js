const https = require('https');
const fs = require('fs');

const envFile = fs.readFileSync('.env.render', 'utf8');
const tokenMatch = envFile.match(/RENDER_API_TOKEN=(.+)/);
const API_TOKEN = tokenMatch[1].trim();

// Primeiro, pegar ownerId de um serviço existente
const options1 = {
  hostname: 'api.render.com',
  path: '/v1/services',
  method: 'GET',
  headers: {'Authorization': `Bearer ${API_TOKEN}`}
};

https.get(options1, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const servicesData = JSON.parse(data);
    const ownerId = servicesData[0].service.ownerId;
    console.log(`[*] OwnerId encontrado: ${ownerId}`);

    // Agora criar o novo serviço
    const payload = {
      name: 'lbh-system',
      type: 'web_service',
      ownerId: ownerId,
      repo: 'https://github.com/Val7h/leveraged-buy-hold.git',
      branch: 'master',
      buildCommand: '',
      startCommand: '/app/start.sh'
    };

    const bodyStr = JSON.stringify(payload);

    const options2 = {
      hostname: 'api.render.com',
      path: '/v1/services',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr)
      }
    };

    const req = https.request(options2, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`[*] Status: ${res.statusCode}`);
        if (res.statusCode === 201 || res.statusCode === 200) {
          const result = JSON.parse(data);
          console.log(`[OK] Servico criado!`);
          console.log(`[OK] ID: ${result.id}`);
          console.log(`[OK] Name: ${result.name}`);
          console.log(`[OK] Dashboard: ${result.dashboardUrl}`);
        } else {
          console.log('[!] Resposta:');
          console.log(data);
        }
      });
    });

    req.on('error', e => console.error(e));
    req.write(bodyStr);
    req.end();
  });
}).on('error', e => console.error(e));
