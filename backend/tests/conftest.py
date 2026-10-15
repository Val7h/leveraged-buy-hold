"""Configuração da suíte do backend.

Os módulos abaixo testam o subsistema LEGADO de contas/configurações/moderação em SQLAlchemy
(sprints antigos), que não faz parte do produto em produção: autenticação, usuários, assinaturas e
alertas vivem no BFF Next.js (Prisma + Postgres) e o backend Python é interno (X-Internal-Token).
Eles já não importam (mapper `Subscription` ausente, `regex`→`pattern` do Pydantic 2, fixture `db`
inexistente) ou apontam rotas que não existem mais. Ficam fora da coleta até serem reescritos ou
removidos; a suíte do MOTOR (scoring, ranking, backtest, travas) é a que importa e roda inteira.
"""
collect_ignore = [
    "test_analytics.py",
    "test_day9_integration_security.py",
    "test_day9_standalone.py",
    "test_day12_security_hardening.py",
    "test_endpoints_16_20.py",
    "test_moderation.py",
    "test_settings_api.py",
    "test_settings_models.py",
    "test_settings_schemas.py",
]
