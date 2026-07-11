"use client";

// SELEÇÃO DE PERFIL REMOVIDA (decisão Valth): o app é UNIVERSAL. Não há mais dropdown de
// conservador/moderado/agressivo capando o motor — todo usuário vê a FRONTEIRA MÁXIMA de
// aceleração segura (o motor mostra quanto dá p/ alavancar CADA ativo e sobreviver). O perfil
// REAL de cada um emerge das ESCOLHAS: quais ativos compra e quanto aloca. Esta página virou
// um explicador (a rota fica p/ o nav não quebrar).

import { Info, TrendingUp, ShieldCheck } from "lucide-react";

export default function PerfilPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-text-primary">Perfil de risco</h1>
        <p className="text-sm text-text-muted mt-1">
          O app não usa mais seleção de perfil — o motor é universal.
        </p>
      </div>

      <div className="card border border-primary/20 bg-primary/5">
        <div className="flex items-start gap-3">
          <TrendingUp size={20} className="flex-shrink-0 mt-0.5 text-primary" />
          <div className="text-sm text-text-secondary leading-relaxed space-y-2">
            <p>
              <strong className="text-text-primary">Você vê a fronteira máxima de aceleração segura.</strong>{" "}
              Para cada ativo, o motor calcula quanta alavancagem dá pra usar <em>e sobreviver</em>
              {" "}ao pior tombo — governado por beta, drawdown, aptidão e stops, não por um dropdown.
            </p>
            <p>
              O dropdown de perfil (conservador/moderado/agressivo) só atrapalhava: capava o motor e
              escondia oportunidade. Foi removido.
            </p>
          </div>
        </div>
      </div>

      <div className="card border border-border">
        <div className="flex items-start gap-3">
          <ShieldCheck size={20} className="flex-shrink-0 mt-0.5 text-success" />
          <div className="text-sm text-text-secondary leading-relaxed space-y-2">
            <p>
              <strong className="text-text-primary">Seu perfil real vem das suas escolhas.</strong>{" "}
              Filosofia do app: <em>alavancagem com segurança relativa pra acelerar patrimônio</em>.
              Sobreviver é a restrição (não quebrar); acelerar é o objetivo. Quem decide o quanto de
              risco tomar é você — pelos ativos que escolhe comprar e pelo tamanho de cada posição.
            </p>
          </div>
        </div>
      </div>

      <p className="flex items-center gap-2 text-xs text-text-muted">
        <Info size={13} />
        Cada recomendação já traz o teto de alavancagem seguro do ativo e o risco (máx. queda) junto.
      </p>
    </div>
  );
}
