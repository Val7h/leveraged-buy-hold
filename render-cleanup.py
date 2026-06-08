#!/usr/bin/env python3
import requests
import json

API_TOKEN = "rnd_h6Nakrt15pVwkog48pZkpYHJug1z"
headers = {"Authorization": f"Bearer {API_TOKEN}"}

print("🔍 Buscando serviços LBH...")

# Listar todos os serviços
resp = requests.get("https://api.render.com/v1/services", headers=headers)
print(f"Status: {resp.status_code}")

if resp.status_code == 200:
    services = resp.json()
    print(f"\n✅ Encontrados {len(services)} serviços\n")

    # Mostrar todos
    lbh_services = []
    for svc in services:
        print(f"ID: {svc['id']}")
        print(f"Name: {svc['name']}")
        print(f"Status: {svc['status']}")
        print("---")

        if 'lbh' in svc['name'].lower():
            lbh_services.append(svc)

    print(f"\n🎯 Serviços LBH encontrados: {len(lbh_services)}")
    for svc in lbh_services:
        print(f"  - {svc['name']} (ID: {svc['id']})")

        # Deletar
        print(f"    Deletando...")
        del_resp = requests.delete(
            f"https://api.render.com/v1/services/{svc['id']}",
            headers=headers
        )
        print(f"    Status: {del_resp.status_code}")

else:
    print(f"❌ Erro: {resp.status_code}")
    print(resp.text)
