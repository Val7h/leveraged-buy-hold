"use client";

/**
 * Pagina de preferencias de email — LGPD art. 18 (direito de opt-out).
 *
 * Notas:
 * - Transacional fica disabled (LGPD art. 7-V — execucao de contrato).
 * - Marketing default OFF — opt-in explicito (LGPD art. 7-I).
 * - Usa @radix-ui/react-switch (ja instalado) + react-hot-toast (ja instalado).
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import * as Switch from "@radix-ui/react-switch";
import toast, { Toaster } from "react-hot-toast";

type Prefs = {
  transactional: boolean;
  alerts: boolean;
  product_updates: boolean;
  marketing: boolean;
  updatedAt?: string;
};

const DEFAULT_PREFS: Prefs = {
  transactional: true,
  alerts: true,
  product_updates: true,
  marketing: false,
};

export default function EmailPreferencesPage() {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/v1/account/email-preferences", {
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok) {
          if (res.status === 401) {
            toast.error("Voce precisa estar logado para acessar suas preferencias.");
          } else {
            toast.error("Nao foi possivel carregar suas preferencias.");
          }
          return;
        }
        const data = (await res.json()) as Prefs;
        if (!cancelled) setPrefs(data);
      } catch {
        if (!cancelled) toast.error("Erro de rede ao carregar preferencias.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      // Nao mandamos transactional — backend rejeita tentativa de desabilita-lo.
      const res = await fetch("/api/v1/account/email-preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          alerts: prefs.alerts,
          product_updates: prefs.product_updates,
          marketing: prefs.marketing,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err?.message || "Falha ao salvar preferencias.");
        return;
      }
      const data = (await res.json()) as Prefs;
      setPrefs(data);
      toast.success("Preferencias atualizadas com sucesso.");
    } catch {
      toast.error("Erro de rede ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Toaster position="top-right" />

      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">Preferencias de email</h1>
        <p className="mt-2 text-sm text-slate-600">
          Voce pode escolher quais emails recebe. Emails transacionais (pagamento, seguranca) nao
          podem ser desativados por exigencia legal.
        </p>
      </header>

      {loading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500">
          Carregando suas preferencias...
        </div>
      ) : (
        <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-6">
          <ToggleRow
            label="Transacional"
            description="Pagamentos, recuperacao de senha, alteracoes de seguranca."
            badge="Sempre ativo — base legal LGPD art. 7-V"
            checked={true}
            disabled
            onChange={() => {
              /* noop */
            }}
          />

          <Divider />

          <ToggleRow
            label="Alertas tecnicos"
            description="Notificacoes de alertas de preco e gatilhos das suas estrategias."
            checked={prefs.alerts}
            onChange={(v) => setPrefs((p) => ({ ...p, alerts: v }))}
          />

          <Divider />

          <ToggleRow
            label="Novidades do produto"
            description="Lancamentos de funcionalidades, melhorias e dicas de uso."
            checked={prefs.product_updates}
            onChange={(v) => setPrefs((p) => ({ ...p, product_updates: v }))}
          />

          <Divider />

          <ToggleRow
            label="Marketing e promocoes"
            description="Ofertas, descontos e comunicados de marketing."
            badge="Opt-in — desligado por padrao"
            checked={prefs.marketing}
            onChange={(v) => setPrefs((p) => ({ ...p, marketing: v }))}
          />

          <div className="flex items-center justify-end pt-4">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-md bg-slate-900 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </section>
      )}

      <footer className="mt-8 text-xs text-slate-500">
        Para mais detalhes sobre como tratamos seus dados, consulte nossa{" "}
        <Link href="/lgpd" className="text-slate-700 underline hover:text-slate-900">
          Politica LGPD
        </Link>
        .
      </footer>
    </main>
  );
}

// ───────────────────────── helpers de UI ─────────────────────────

function Divider() {
  return <div className="h-px w-full bg-slate-100" />;
}

function ToggleRow({
  label,
  description,
  badge,
  checked,
  disabled = false,
  onChange,
}: {
  label: string;
  description: string;
  badge?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-900">{label}</span>
          {badge && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-600">
              {badge}
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-slate-500">{description}</p>
      </div>
      <Switch.Root
        checked={checked}
        disabled={disabled}
        onCheckedChange={onChange}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          disabled
            ? "cursor-not-allowed bg-slate-300"
            : checked
              ? "bg-emerald-600"
              : "bg-slate-300"
        }`}
        aria-label={label}
      >
        <Switch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white shadow-sm transition-transform data-[state=checked]:translate-x-[22px]" />
      </Switch.Root>
    </div>
  );
}
