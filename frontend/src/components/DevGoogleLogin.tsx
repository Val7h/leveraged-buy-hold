"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { AlertCircle } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

export default function DevGoogleLogin() {
  const router = useRouter();
  const { setToken, fetchMe } = useAuthStore();
  const [email, setEmail] = useState("valthguime@gmail.com");
  const [fullName, setFullName] = useState("Valthur Guime");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleDevLogin = async () => {
    try {
      setError("");
      setLoading(true);
      const response = await fetch(`${API_URL}/api/v1/auth/google-dev`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, full_name: fullName }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Erro ao fazer login de teste");
      }

      const data = await response.json();
      setToken(data.access_token);
      await fetchMe();
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full p-4 rounded-lg border-2 border-warning/30 bg-warning/5">
      <div className="flex items-center gap-2 mb-3">
        <AlertCircle size={16} className="text-warning" />
        <p className="text-xs font-semibold text-warning">Modo Teste (sem Google Client ID)</p>
      </div>

      <div className="space-y-2">
        <div>
          <label className="label text-xs">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            className="input text-sm"
          />
        </div>
        <div>
          <label className="label text-xs">Nome Completo</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Seu Nome"
            className="input text-sm"
          />
        </div>

        {error && (
          <p className="text-danger text-xs bg-danger/10 border border-danger/20 rounded px-2 py-1">
            {error}
          </p>
        )}

        <button
          onClick={handleDevLogin}
          disabled={loading}
          className="btn-primary w-full text-sm flex items-center justify-center gap-2"
        >
          {loading ? (
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-background border-t-transparent" />
          ) : null}
          Entrar (Teste)
        </button>
      </div>

      <p className="text-[10px] text-text-muted mt-2">
        ⚠️ Apenas para desenvolvimento. Desaparece em produção.
      </p>
    </div>
  );
}
