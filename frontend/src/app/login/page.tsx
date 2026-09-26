"use client";
import { useEffect, useState } from "react";
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

  // ?tab=register abre direto na aba de cadastro (CTAs "Criar conta" da landing).
  // Erros vindos do callback do Google (?error=...) → mensagem amigável.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("tab") === "register") setTab("register");
    const code = q.get("error");
    if (!code) return;
    const msgs: Record<string, string> = {
      google_nao_configurado: "Login com Google ainda não está configurado.",
      servico_indisponivel: "Serviço temporariamente indisponível. Tente de novo em instantes.",
      google_email_nao_verificado: "Seu e-mail Google não está verificado.",
    };
    setError(msgs[code] ?? "Não foi possível entrar com o Google. Tente de novo.");
  }, []);

  // Respeita de onde a pessoa veio: middleware manda ?from=, a /pricing manda ?next=.
  // Sem isso, quem clicava em "Assinar" na /pricing logava e se perdia no /dashboard.
  const destinoPosLogin = () => {
    try {
      const q = new URLSearchParams(window.location.search);
      const dest = q.get("from") ?? q.get("next");
      return dest && dest.startsWith("/") ? dest : "/dashboard";
    } catch {
      return "/dashboard";
    }
  };

  // Mensagens honestas por código de erro (a API devolve `error`, não `detail`;
  // antes TODA falha virava "Email ou senha inválidos"/"Erro ao criar conta").
  const msgDoErro = (err: unknown, contexto: "login" | "register") => {
    const resp = (err as { response?: { status?: number; data?: { error?: string } } })?.response;
    const code = resp?.data?.error;
    if (resp?.status === 429) return "Muitas tentativas. Espere alguns minutos e tente de novo.";
    if (resp?.status === 503 || code === "service_unavailable")
      return "Serviço temporariamente indisponível. Tente de novo em instantes.";
    if (code === "email_in_use") return "Este e-mail já tem conta. Entre na aba Entrar ou use o Google.";
    if (code === "invalid_payload")
      return contexto === "register"
        ? "Confira os campos: senha com pelo menos 8 caracteres."
        : "Confira e-mail e senha.";
    return contexto === "login" ? "Email ou senha inválidos" : "Erro ao criar conta. Tente novamente.";
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(email, password);
      router.push(destinoPosLogin());
    } catch (err: unknown) {
      setError(msgDoErro(err, "login"));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      // fullName SÓ quando preenchido: mandar "" derrubava o cadastro no zod
      // (min 1 char) — quem deixava o nome em branco não conseguia criar conta.
      await authApi.register({
        email,
        password,
        ...(name.trim() ? { fullName: name.trim() } : {}),
        riskProfile,
      });
      await login(email, password);
      router.push(destinoPosLogin());
    } catch (err: unknown) {
      setError(msgDoErro(err, "register"));
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
                minLength={tab === "register" ? 8 : 6}
              />
              {tab === "register" && (
                <p className="text-[11px] text-text-muted mt-1">Mínimo de 8 caracteres.</p>
              )}
            </div>

            {/* Dropdown de Perfil de Risco REMOVIDO do cadastro (decisão Valth: motor
                UNIVERSAL — o perfil real emerge das escolhas; o dropdown capava e
                contradizia o app). O backend segue com default "moderado". */}

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

          {/* Login com Google (mesma conta se o e-mail for o mesmo) */}
          <div className="flex items-center gap-3 my-4">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[11px] text-text-muted">ou</span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <a
            href="/api/v1/auth/google"
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-border bg-bg-secondary/40 hover:bg-bg-secondary px-4 py-2.5 text-sm font-medium text-text-primary transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M23.49 12.27c0-.85-.07-1.46-.22-2.1H12.2v3.83h6.48c-.13 1.06-.84 2.65-2.41 3.72l-.02.15 3.5 2.66.24.02c2.23-2.02 3.5-4.99 3.5-8.28" />
              <path fill="#34A853" d="M12.2 23.5c3.18 0 5.85-1.03 7.8-2.8l-3.72-2.83c-.99.68-2.32 1.16-4.08 1.16-3.12 0-5.76-2.02-6.7-4.82l-.14.01-3.63 2.76-.05.13c1.94 3.78 5.91 6.39 10.52 6.39" />
              <path fill="#FBBC05" d="M5.5 14.21a7.05 7.05 0 0 1-.39-2.28c0-.8.14-1.56.37-2.28l-.01-.15-3.67-2.8-.12.06A11.51 11.51 0 0 0 .43 11.93c0 1.85.45 3.6 1.25 5.17z" />
              <path fill="#EB4335" d="M12.2 4.9c2.21 0 3.7.94 4.55 1.72l3.32-3.18C18.03 1.55 15.38.43 12.2.43 7.59.43 3.62 3.03 1.68 6.81l3.8 2.9c.96-2.8 3.6-4.81 6.72-4.81" />
            </svg>
            Entrar com Google
          </a>

        </div>

        <p className="text-center text-xs text-text-muted mt-6">
          Sistema quantitativo para uso pessoal. Não é recomendação de investimento.
        </p>
      </div>
    </div>
  );
}
