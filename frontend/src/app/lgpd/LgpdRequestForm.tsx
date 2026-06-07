"use client";

import { useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

const REQUEST_TYPES = [
  { value: "confirmation", label: "Confirmacao de tratamento" },
  { value: "access", label: "Acesso aos meus dados" },
  { value: "correction", label: "Correcao de dados" },
  { value: "anonymization", label: "Anonimizacao / Bloqueio / Eliminacao" },
  { value: "portability", label: "Portabilidade" },
  { value: "deletion_after_consent", label: "Eliminacao apos consentimento" },
  { value: "sharing_info", label: "Informacao sobre compartilhamento" },
  { value: "revoke_consent", label: "Revogacao de consentimento" },
  { value: "other", label: "Outro / Reclamacao" },
];

export default function LgpdRequestForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [requestType, setRequestType] = useState("access");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [protocol, setProtocol] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !email || !description) {
      setErrorMsg("Preencha nome, e-mail e descricao da solicitacao.");
      setStatus("error");
      return;
    }
    setStatus("loading");
    setErrorMsg(null);
    try {
      const resp = await fetch(`${API_URL}/api/v1/lgpd/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          cpf: cpf || null,
          requestType,
          description,
          submittedAt: new Date().toISOString(),
        }),
      });
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }
      const data = await resp.json().catch(() => ({}));
      setProtocol(data?.protocol || `LGPD-${Date.now()}`);
      setStatus("success");
    } catch (err) {
      // TODO(gerente): backend endpoint POST /api/v1/lgpd/request precisa estar no ar
      // Enquanto isso, instrua o usuario a enviar e-mail direto ao DPO.
      setErrorMsg(
        "Nao foi possivel registrar sua solicitacao agora. Por favor, envie e-mail para dpo@lbh-system.com.br com o conteudo deste formulario."
      );
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="not-prose my-6 p-4 rounded-lg bg-success/10 border border-success/30">
        <h3 className="font-semibold text-success mb-1">Solicitacao registrada</h3>
        <p className="text-sm text-text-secondary">
          Protocolo: <code className="font-mono">{protocol}</code>
        </p>
        <p className="text-sm text-text-secondary mt-2">
          Voce recebera resposta em ate 15 dias corridos no e-mail informado.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="not-prose space-y-3 my-6">
      <div>
        <label htmlFor="lgpd-name" className="block text-xs font-medium mb-1">
          Nome completo *
        </label>
        <input
          id="lgpd-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm"
        />
      </div>
      <div>
        <label htmlFor="lgpd-email" className="block text-xs font-medium mb-1">
          E-mail cadastrado *
        </label>
        <input
          id="lgpd-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm"
        />
      </div>
      <div>
        <label htmlFor="lgpd-cpf" className="block text-xs font-medium mb-1">
          CPF (opcional, para confirmacao de identidade)
        </label>
        <input
          id="lgpd-cpf"
          type="text"
          value={cpf}
          onChange={(e) => setCpf(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm"
        />
      </div>
      <div>
        <label htmlFor="lgpd-type" className="block text-xs font-medium mb-1">
          Tipo de solicitacao *
        </label>
        <select
          id="lgpd-type"
          value={requestType}
          onChange={(e) => setRequestType(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm"
        >
          {REQUEST_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="lgpd-desc" className="block text-xs font-medium mb-1">
          Descricao da solicitacao *
        </label>
        <textarea
          id="lgpd-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          rows={4}
          className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm"
        />
      </div>
      {errorMsg && (
        <p className="text-xs text-danger" role="alert">
          {errorMsg}
        </p>
      )}
      <button
        type="submit"
        disabled={status === "loading"}
        className="px-4 py-2 rounded-lg bg-primary text-background font-semibold text-sm disabled:opacity-60"
      >
        {status === "loading" ? "Enviando..." : "Enviar solicitacao"}
      </button>
      <p className="text-[11px] text-text-muted">
        Ao enviar, voce concorda com o tratamento dos dados aqui informados
        com a finalidade unica de processar sua solicitacao (base legal:
        cumprimento de obrigacao legal, LGPD Art. 7, II).
      </p>
    </form>
  );
}
