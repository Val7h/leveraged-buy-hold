"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { authApi } from "@/lib/api";
import RiskDisclaimerModal from "@/components/RiskDisclaimerModal";

export default function LoginPage() {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [riskProfile, setRiskProfile] = useState("balanced");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showRiskModal, setShowRiskModal] = useState(false);
  const [hasAcceptedRisk, setHasAcceptedRisk] = useState(false);
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
      await authApi.register({ email, password, full_name: name, risk_profile: riskProfile });
      await login(email, password);
      // Show risk disclaimer modal instead of redirecting immediately
      setShowRiskModal(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg || "Erro ao criar conta. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleRiskAccepted = () => {
    setHasAcceptedRisk(true);
    setShowRiskModal(false);
    router.push("/dashboard");
  };

  return (
    <>
      {/* Risk Disclaimer Modal */}
      {showRiskModal && !hasAcceptedRisk && (
        <RiskDisclaimerModal onAccept={handleRiskAccepted} />
      )}

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
          <p className="text-text-secondary text-sm">Buy &amp; Hold Alavancado Adaptativo</p>
        </div>

        <div className="card">
          {/* Tabs */}
          <div className="flex gap-1 bg-surface-2 rounded-lg p-1 mb-6">
            {(["login", "register"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
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
                <input className="input" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" />
              </div>
            )}
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" required />
            </div>
            <div>
              <label className="label">Senha</label>
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
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

            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 mt-2">
              {loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
              ) : null}
              {tab === "login" ? "Entrar" : "Criar Conta"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-text-muted mt-6">
          Sistema quantitativo para uso pessoal. Não é recomendação de investimento.
        </p>
      </div>
    </div>
    </>
  );
}
