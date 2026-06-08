#!/usr/bin/env node

const https = require('https');
const fs = require('fs');

// Carregar token
const envFile = fs.readFileSync('.env.render', 'utf8');
const tokenMatch = envFile.match(/RENDER_API_TOKEN=(.+)/);
const API_TOKEN = tokenMatch ? tokenMatch[1].trim() : null;

if (!API_TOKEN) {
  console.error('[ERROR] Token nao encontrado em .env.render');
  process.exit(1);
}

console.log('[*] Token carregado com sucesso');

// Fazer requisição HTTPS
function apiCall(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.render.com',
      port: 443,
      path: `/v1${path}`,
      method: method,
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json',
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            body: data ? JSON.parse(data) : null,
            headers: res.headers
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            body: data,
            headers: res.headers
          });
        }
      });
    });

    req.on('error', reject);

    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  try {
    // 1. Listar serviços
    console.log('\n[*] Listando servicos...');
    const listRes = await apiCall('GET', '/services');

    if (listRes.status !== 200) {
      console.error(`[ERROR] Falha ao listar: ${listRes.status}`);
      console.error(listRes.body);
      process.exit(1);
    }

    const servicesData = listRes.body;
    // Extrair serviços da resposta paginada
    const services = servicesData.map(item => item.service);
    console.log(`[OK] ${services.length} servicos encontrados\n`);

    // 2. Encontrar e deletar serviços LBH
    const lbhServices = services.filter(s => s && s.name && s.name.includes('lbh'));
    console.log(`[!] ${lbhServices.length} servicos LBH encontrados:`);

    for (const svc of lbhServices) {
      console.log(`\n  [DELETE] ${svc.name} (${svc.id})`);
      const delRes = await apiCall('DELETE', `/services/${svc.id}`);
      console.log(`  Status: ${delRes.status}`);

      if (delRes.status >= 400) {
        console.error(`  [ERROR] ${delRes.body}`);
      } else {
        console.log(`  [OK] Deletado!`);
      }

      // Aguardar entre requisições
      await new Promise(r => setTimeout(r, 1000));
    }

    // 3. Criar novo serviço
    console.log('\n[*] Criando novo servico lbh-system...');

    const createPayload = {
      name: 'lbh-system',
      type: 'web_service',
      environmentId: 'oregon', // Default region
      repositoryUrl: 'https://github.com/Val7h/leveraged-buy-hold.git',
      branch: 'master',
      buildCommand: '',
      startCommand: '/app/start.sh',
      envVars: {
        'NEXT_PUBLIC_API_URL': 'http://localhost:8001'
      }
    };

    const createRes = await apiCall('POST', '/services', createPayload);
    console.log(`[*] Status: ${createRes.status}`);

    if (createRes.status === 201 || createRes.status === 200) {
      console.log('[OK] Servico criado!');
      console.log(`[OK] ID: ${createRes.body.id}`);
      console.log(`[OK] Name: ${createRes.body.name}`);
    } else {
      console.log('[!] Resposta:');
      console.log(createRes.body);
    }

    console.log('\n[SUCCESS] Processo concluido!');

  } catch (error) {
    console.error('[ERROR]', error.message);
    process.exit(1);
  }
}

main();
