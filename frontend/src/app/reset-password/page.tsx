"use client";
import { useState, FormEvent, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, Loader2, Check, AlertTriangle } from "lucide-react";

function ResetPasswordInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const token = sp.get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) setError("Link inválido. Solicite um novo email de recuperação.");
  }, [token]);

  const valid =
    newPassword.length >= 8 && newPassword === confirm && token.length > 20;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/v1/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (body.error === "invalid_or_expired_token") {
          setError(
            "Link inválido ou expirado. Solicite um novo email de recuperação."
          );
        } else {
          setError("Não foi possível redefinir sua senha. Tente novamente.");
        }
        return;
      }
      setDone(true);
      setTimeout(() => router.replace("/login"), 3000);
    } catch {
      setError("Erro de rede. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
              <span className="text-primary font-bold text-lg">L</span>
            </div>
            <span className="text-xl font-semibold text-text-primary">
              LBH System
            </span>
          </div>
        </div>

        <div className="card">
          {done ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-success/10 border border-success/30 flex items-center justify-center mx-auto mb-4">
                <Check size={20} className="text-success" />
              </div>
              <h1 className="text-base font-semibold text-text-primary mb-2">
                Senha redefinida com sucesso
              </h1>
              <p className="text-sm text-text-muted">
                Redirecionando para o login…
              </p>
            </div>
          ) : (
            <>
              <h1 className="text-lg font-semibold text-text-primary mb-2">
                Nova senha
              </h1>
              <p className="text-sm text-text-muted mb-6">
                Defina uma nova senha. Mínimo 8 caracteres.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="np" className="label">
                    Nova senha
                  </label>
                  <input
                    id="np"
                    className="input"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={8}
                    autoFocus
                  />
                </div>
                <div>
                  <label htmlFor="cf" className="label">
                    Confirme a nova senha
                  </label>
                  <input
                    id="cf"
                    className="input"
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={8}
                  />
                  {confirm && confirm !== newPassword && (
                    <p className="text-xs text-danger mt-1">
                      As senhas não coincidem.
                    </p>
                  )}
                </div>

                {error && (
                  <div className="flex items-start gap-2 text-sm bg-danger/10 border border-danger/20 rounded-lg px-3 py-2 text-danger">
                    <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !valid}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Lock size={16} />
                  )}
                  Redefinir senha
                </button>
              </form>
            </>
          )}

          <div className="mt-6 pt-4 border-t border-border text-center">
            <Link
              href="/login"
              className="text-xs text-text-muted hover:text-primary transition-colors"
            >
              Voltar para o login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-background">
          <Loader2 className="animate-spin text-primary" size={24} />
        </div>
      }
    >
      <ResetPasswordInner />
    </Suspense>
  );
}
