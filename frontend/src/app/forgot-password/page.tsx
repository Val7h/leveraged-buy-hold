"use client";
import { useState, FormEvent } from "react";
import Link from "next/link";
import { Mail, Loader2, ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch("/api/v1/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      // Resposta sempre generica — mostramos confirmacao igual.
      setSubmitted(true);
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
          <p className="text-text-secondary text-sm">Recuperar senha</p>
        </div>

        <div className="card">
          {!submitted ? (
            <>
              <h1 className="text-lg font-semibold text-text-primary mb-2">
                Esqueceu sua senha?
              </h1>
              <p className="text-sm text-text-muted mb-6">
                Digite seu email e enviaremos um link para redefinir sua senha.
                O link expira em 1 hora.
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="label">
                    Email
                  </label>
                  <input
                    id="email"
                    className="input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@exemplo.com"
                    required
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !email}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Mail size={16} />
                  )}
                  Enviar link
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-success/10 border border-success/30 flex items-center justify-center mx-auto mb-4">
                <Mail size={20} className="text-success" />
              </div>
              <h1 className="text-base font-semibold text-text-primary mb-2">
                Verifique seu email
              </h1>
              <p className="text-sm text-text-muted">
                Se o email <strong>{email}</strong> estiver cadastrado, você
                receberá um link para redefinir sua senha em alguns minutos.
              </p>
              <p className="text-xs text-text-muted/70 mt-4">
                Não recebeu? Confira a pasta de spam ou tente novamente em
                alguns minutos.
              </p>
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-border">
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 text-xs text-text-muted hover:text-primary transition-colors"
            >
              <ArrowLeft size={12} />
              Voltar para o login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
