"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { authApi } from "@/lib/api";

export default function LoginPage() {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [riskProfile, setRiskProfile] = useState("balanced");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch {
      setError("Email ou senha inválidos");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await authApi.register({ email, password, fullName: name, riskProfile });
      await login(email, password);
      router.push("/dashboard");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg || "Erro ao criar conta. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  // Modo Demo REMOVIDO: auth real esta funcionando (bcrypt + JWT + cookie httpOnly).
  // O antigo handler escrevia em localStorage e causava conflito com a sessao real
  // (tela em branco quando user logado real tinha access_token legado).
  // Quem quiser testar sem se cadastrar usa email/senha quaisquer ja persistidos.

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
              <span className="text-primary font-bold text-lg">L</span>
            </div>
            <span className="text-xl font-semibold text-text-primary">LBH System</span>
          </div>
          <p className="text-text-secondary text-sm">Simulador educacional de Buy &amp; Hold Alavancado Adaptativo</p>
          <p className="text-[10px] text-text-muted/70 mt-1">Conteúdo educacional. Não constitui recomendação de investimento. CVM Of-Circ 04/2023.</p>
        </div>

        <div className="card">
          {/* Tabs */}
          <div className="flex gap-1 bg-surface-2 rounded-lg p-1 mb-6">
            {(["login", "register"] as const).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(""); }}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                  tab === t ? "bg-surface text-text-primary shadow-sm" : "text-text-muted hover:text-text-secondary"
                }`}
              >
                {t === "login" ? "Entrar" : "Criar Conta"}
              </button>
            ))}
          </div>

          <form onSubmit={tab === "login" ? handleLogin : handleRegister} className="space-y-4">
            {tab === "register" && (
              <div>
                <label className="label">Nome completo</label>
                <input
                  className="input"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                />
              </div>
            )}
            <div>
              <label className="label">Email</label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@exemplo.com"
                required
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="label mb-0">Senha</label>
                {tab === "login" && (
                  <Link
                    href="/forgot-password"
                    className="text-xs text-primary hover:underline"
                  >
                    Esqueci a senha
                  </Link>
                )}
              </div>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            {tab === "register" && (
              <div>
                <label className="label">Perfil de Risco</label>
                <select className="input" value={riskProfile} onChange={(e) => setRiskProfile(e.target.value)}>
                  <option value="conservative">Conservador — Alavancagem máx. 2x</option>
                  <option value="balanced">Balanceado — Alavancagem máx. 3x</option>
                  <option value="aggressive">Agressivo — Alavancagem máx. 4x</option>
                </select>
              </div>
            )}

            {error && (
              <p className="text-danger text-sm bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
            >
              {loading && <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />}
              {tab === "login" ? "Entrar" : "Criar Conta"}
            </button>
          </form>

        </div>

        <p className="text-center text-xs text-text-muted mt-6">
          Sistema quantitativo para uso pessoal. Não é recomendação de investimento.
        </p>
      </div>
    </div>
  );
}
