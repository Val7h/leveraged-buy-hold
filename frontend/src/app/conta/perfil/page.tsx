"use client";

import { useEffect, useState, FormEvent } from "react";
import toast from "react-hot-toast";
import { Info, Loader2, Save } from "lucide-react";
import Tooltip from "@/components/ui/Tooltip";
import { useAuthStore } from "@/store/authStore";

const RISK_PROFILES = [
  { value: "conservative", label: "Conservador" },
  { value: "moderate", label: "Moderado" },
  { value: "aggressive", label: "Agressivo" },
];

// O Prisma persiste o perfil em PT ("conservador"/"moderado"/"agressivo"),
// mas as <option> do select usam values em EN. Sem normalizar, o select nao
// acha o value e cai no default (Conservador) — mostrando errado mesmo apos
// salvar "Agressivo". Mapeia PT (e variantes) -> value EN canonico do select.
function normalizeRiskProfile(raw: string | null | undefined): string {
  const v = (raw ?? "").trim().toLowerCase();
  switch (v) {
    case "conservador":
    case "conservative":
      return "conservative";
    case "moderado":
    case "moderate":
    case "balanced":
      return "moderate";
    case "agressivo":
    case "aggressive":
      return "aggressive";
    default:
      return "moderate";
  }
}

interface ProfileForm {
  fullName: string;
  riskProfile: string;
  email: string;
}

export default function PerfilPage() {
  const { user, fetchMe } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ProfileForm>({
    fullName: "",
    riskProfile: "moderate",
    email: "",
  });

  // Hidrata o form. Se authStore vazio, busca direto da API (mais resiliente que
  // depender do authStore — evita spinner infinito quando store esta sujo).
  useEffect(() => {
    let cancelled = false;

    async function load() {
      // Caminho rapido: store ja tem dados
      if (user) {
        setForm({
          fullName: user.fullName ?? "",
          riskProfile: normalizeRiskProfile(user.riskProfile),
          email: user.email,
        });
        setLoading(false);
        return;
      }
      // Fallback: busca direto da API (nao depende do authStore)
      try {
        const res = await fetch("/api/v1/account/profile", { credentials: "same-origin" });
        if (cancelled) return;
        if (!res.ok) {
          // 401 -> redireciona pra login (cookie expirado/ausente)
          if (res.status === 401) {
            window.location.href = "/login";
            return;
          }
          throw new Error("HTTP " + res.status);
        }
        const data = await res.json();
        if (cancelled) return;
        setForm({
          fullName: data.fullName ?? "",
          riskProfile: normalizeRiskProfile(data.riskProfile),
          email: data.email ?? "",
        });
        // Atualiza store em paralelo (sem bloquear)
        fetchMe().catch(() => {});
      } catch (e) {
        console.error("[perfil] load error", e);
        toast.error("Não foi possível carregar seu perfil. Tente recarregar.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [user, fetchMe]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/v1/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          riskProfile: form.riskProfile,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      // Re-sync com o backend pra refletir mudanca no Sidebar/Header.
      await fetchMe();
      toast.success("Perfil atualizado com sucesso");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      toast.error(`Falha ao salvar: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-primary" size={24} />
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-xl border border-border p-6">
      <h2 className="text-lg font-bold text-text-primary mb-1">
        Informacoes do Perfil
      </h2>
      <p className="text-sm text-text-secondary mb-6">
        Atualize seu nome e perfil de risco. O email so pode ser alterado via suporte.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label
            htmlFor="fullName"
            className="block text-sm font-medium text-text-primary mb-1.5"
          >
            Nome completo
          </label>
          <input
            id="fullName"
            type="text"
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            placeholder="Seu nome"
            maxLength={120}
            className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition"
          />
        </div>

        <div>
          <label
            htmlFor="riskProfile"
            className="block text-sm font-medium text-text-primary mb-1.5"
          >
            Perfil de risco
          </label>
          <select
            id="riskProfile"
            value={form.riskProfile}
            onChange={(e) => setForm({ ...form, riskProfile: e.target.value })}
            className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition"
          >
            {RISK_PROFILES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-text-muted mt-1.5">
            Usado pelo screening pra calibrar alavancagem sugerida.
          </p>
        </div>

        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-text-primary"
            >
              Email
            </label>
            <Tooltip
              content="Email so muda via suporte por seguranca"
              side="right"
            >
              <Info size={13} className="text-text-muted cursor-help" />
            </Tooltip>
          </div>
          <input
            id="email"
            type="email"
            value={form.email}
            readOnly
            disabled
            className="w-full bg-surface-3 border border-border rounded-lg px-3 py-2 text-sm text-text-muted cursor-not-allowed"
          />
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 bg-primary text-background font-semibold text-sm px-5 py-2.5 rounded-lg hover:bg-primary-light disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {saving ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              <Save size={16} />
            )}
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </form>
    </div>
  );
}
