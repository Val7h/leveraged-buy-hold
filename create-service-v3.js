const https = require('https');
const fs = require('fs');

const envFile = fs.readFileSync('.env.render', 'utf8');
const tokenMatch = envFile.match(/RENDER_API_TOKEN=(.+)/);
const API_TOKEN = tokenMatch[1].trim();

// Pegar template de um serviço existente
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
    const existing = servicesData[0].service;
    const ownerId = existing.ownerId;
    
    console.log(`[*] Usando template do serviço: ${existing.name}`);

    // Criar com template correto
    const payload = {
      name: 'lbh-system',
      type: 'web_service',
      ownerId: ownerId,
      repo: 'https://github.com/Val7h/leveraged-buy-hold.git',
      branch: 'master',
      rootDir: '',
      serviceDetails: {
        env: 'docker',
        envSpecificDetails: {
          dockerfilePath: './Dockerfile'
        }
      }
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
          console.log(`\n[SUCCESS] Servico criado!\n`);
          console.log(`ID: ${result.id}`);
          console.log(`Name: ${result.name}`);
          console.log(`Dashboard: ${result.dashboardUrl}`);
          console.log(`\n[*] Aguardando deploy automático...`);
        } else {
          console.log('[!] Erro:');
          console.log(data);
        }
      });
    });

    req.on('error', e => console.error(e));
    req.write(bodyStr);
    req.end();
  });
}).on('error', e => console.error(e));
