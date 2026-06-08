"use client";

import { useState, FormEvent } from "react";
import toast from "react-hot-toast";
import { Eye, EyeOff, Loader2, Lock } from "lucide-react";

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

const EMPTY: PasswordForm = {
  currentPassword: "",
  newPassword: "",
  confirmNewPassword: "",
};

export default function SenhaPage() {
  const [form, setForm] = useState<PasswordForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof PasswordForm, string>>>({});

  const validate = (): boolean => {
    const next: typeof errors = {};
    if (!form.currentPassword) {
      next.currentPassword = "Informe a senha atual";
    }
    if (form.newPassword.length < 8) {
      next.newPassword = "Nova senha precisa ter pelo menos 8 caracteres";
    }
    if (form.newPassword !== form.confirmNewPassword) {
      next.confirmNewPassword = "As senhas nao coincidem";
    }
    if (form.newPassword && form.newPassword === form.currentPassword) {
      next.newPassword = "Nova senha deve ser diferente da atual";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/v1/account/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        // Erro mais comum aqui: 401 senha atual incorreta
        if (res.status === 401) {
          setErrors({ currentPassword: "Senha atual incorreta" });
          throw new Error("Senha atual incorreta");
        }
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      toast.success("Senha alterada com sucesso");
      setForm(EMPTY);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      toast.error(`Falha: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-surface rounded-xl border border-border p-6">
      <div className="flex items-center gap-2 mb-1">
        <Lock size={18} className="text-primary" />
        <h2 className="text-lg font-bold text-text-primary">Alterar Senha</h2>
      </div>
      <p className="text-sm text-text-secondary mb-6">
        Use no minimo 8 caracteres. Recomendamos uma combinacao de letras, numeros e simbolos.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Senha atual */}
        <div>
          <label
            htmlFor="currentPassword"
            className="block text-sm font-medium text-text-primary mb-1.5"
          >
            Senha atual
          </label>
          <div className="relative">
            <input
              id="currentPassword"
              type={showCurrent ? "text" : "password"}
              value={form.currentPassword}
              onChange={(e) => {
                setForm({ ...form, currentPassword: e.target.value });
                if (errors.currentPassword) {
                  setErrors({ ...errors, currentPassword: undefined });
                }
              }}
              autoComplete="current-password"
              className={`w-full bg-surface-2 border rounded-lg px-3 py-2 pr-10 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 transition ${
                errors.currentPassword
                  ? "border-danger/50 focus:border-danger focus:ring-danger/30"
                  : "border-border focus:border-primary/50 focus:ring-primary/30"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowCurrent((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-text-primary"
              aria-label={showCurrent ? "Ocultar senha" : "Mostrar senha"}
            >
              {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.currentPassword && (
            <p className="text-xs text-danger mt-1.5">{errors.currentPassword}</p>
          )}
        </div>

        {/* Nova senha */}
        <div>
          <label
            htmlFor="newPassword"
            className="block text-sm font-medium text-text-primary mb-1.5"
          >
            Nova senha
          </label>
          <div className="relative">
            <input
              id="newPassword"
              type={showNew ? "text" : "password"}
              value={form.newPassword}
              onChange={(e) => {
                setForm({ ...form, newPassword: e.target.value });
                if (errors.newPassword) {
                  setErrors({ ...errors, newPassword: undefined });
                }
              }}
              autoComplete="new-password"
              minLength={8}
              className={`w-full bg-surface-2 border rounded-lg px-3 py-2 pr-10 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 transition ${
                errors.newPassword
                  ? "border-danger/50 focus:border-danger focus:ring-danger/30"
                  : "border-border focus:border-primary/50 focus:ring-primary/30"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowNew((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-text-primary"
              aria-label={showNew ? "Ocultar senha" : "Mostrar senha"}
            >
              {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.newPassword ? (
            <p className="text-xs text-danger mt-1.5">{errors.newPassword}</p>
          ) : (
            <p className="text-xs text-text-muted mt-1.5">Minimo 8 caracteres.</p>
          )}
        </div>

        {/* Confirmar */}
        <div>
          <label
            htmlFor="confirmNewPassword"
            className="block text-sm font-medium text-text-primary mb-1.5"
          >
            Confirmar nova senha
          </label>
          <input
            id="confirmNewPassword"
            type={showNew ? "text" : "password"}
            value={form.confirmNewPassword}
            onChange={(e) => {
              setForm({ ...form, confirmNewPassword: e.target.value });
              if (errors.confirmNewPassword) {
                setErrors({ ...errors, confirmNewPassword: undefined });
              }
            }}
            autoComplete="new-password"
            className={`w-full bg-surface-2 border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 transition ${
              errors.confirmNewPassword
                ? "border-danger/50 focus:border-danger focus:ring-danger/30"
                : "border-border focus:border-primary/50 focus:ring-primary/30"
            }`}
          />
          {errors.confirmNewPassword && (
            <p className="text-xs text-danger mt-1.5">{errors.confirmNewPassword}</p>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 bg-primary text-background font-semibold text-sm px-5 py-2.5 rounded-lg hover:bg-primary-light disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {saving && <Loader2 className="animate-spin" size={16} />}
            {saving ? "Alterando..." : "Alterar senha"}
          </button>
        </div>
      </form>
    </div>
  );
}
