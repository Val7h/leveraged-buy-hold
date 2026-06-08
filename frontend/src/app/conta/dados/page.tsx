"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Download, Loader2, ShieldCheck, Trash2 } from "lucide-react";
import DangerZone from "@/components/account/DangerZone";

export default function DadosPage() {
  const router = useRouter();
  const [exporting, setExporting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [password, setPassword] = useState("");

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/v1/account/export", {
        method: "GET",
        credentials: "same-origin",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      // Dispara download no browser via Blob (preserva JSON formatado)
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ts = new Date().toISOString().slice(0, 10);
      a.download = `lbh-meus-dados-${ts}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Download iniciado");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      toast.error(`Falha ao exportar: ${msg}`);
    } finally {
      setExporting(false);
    }
  };

  const closeModal = () => {
    setShowDeleteModal(false);
    setConfirmation("");
    setPassword("");
  };

  const handleDelete = async (e: FormEvent) => {
    e.preventDefault();
    setDeleting(true);
    try {
      const res = await fetch("/api/v1/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ confirmation: "DELETAR", password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (res.status === 401) {
          throw new Error("Senha incorreta");
        }
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      toast.success("Conta excluida");
      // Backend ja deve ter limpado o cookie httpOnly — redireciona pro login.
      router.replace("/login");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      toast.error(`Falha ao excluir: ${msg}`);
      setDeleting(false);
    }
  };

  const canDelete = confirmation === "DELETAR" && password.length >= 1 && !deleting;

  return (
    <div className="space-y-6">
      {/* Card 1: Export LGPD art. 18-V */}
      <div className="bg-surface rounded-xl border border-border p-6">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck size={18} className="text-primary" />
          <h2 className="text-lg font-bold text-text-primary">
            Exportar meus dados
          </h2>
        </div>
        <p className="text-sm text-text-secondary mb-4">
          Direito garantido pela <strong>LGPD art. 18-V</strong>. Voce recebera um
          arquivo JSON com todos os seus dados cadastrais, portfolios, simulacoes
          e historico de uso.
        </p>
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className="inline-flex items-center gap-2 bg-surface-2 border border-border hover:border-primary/40 hover:bg-surface-3 text-text-primary font-semibold text-sm px-4 py-2.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {exporting ? (
            <Loader2 className="animate-spin" size={16} />
          ) : (
            <Download size={16} />
          )}
          {exporting ? "Preparando..." : "Baixar arquivo JSON"}
        </button>
      </div>

      {/* Card 2: Delete LGPD art. 18-VI */}
      <DangerZone>
        <p className="text-text-secondary mb-1">
          Excluir minha conta permanentemente
          <span className="text-text-muted"> — LGPD art. 18-VI</span>.
        </p>
        <p className="text-text-muted text-xs mb-4">
          Esta acao e <strong>irreversivel</strong>. Todos os portfolios,
          simulacoes, alertas e dados pessoais serao removidos. Voce nao podera
          recuperar essa conta nem reativar o email associado.
        </p>
        <button
          type="button"
          onClick={() => setShowDeleteModal(true)}
          className="inline-flex items-center gap-2 bg-danger/10 border border-danger/40 hover:bg-danger/20 text-danger font-semibold text-sm px-4 py-2.5 rounded-lg transition"
        >
          <Trash2 size={16} />
          Excluir minha conta
        </button>
      </DangerZone>

      {/* Modal de confirmacao */}
      {showDeleteModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget && !deleting) closeModal();
          }}
        >
          <div className="bg-surface border border-danger/40 rounded-xl p-6 w-full max-w-md shadow-glow-danger">
            <h3
              id="delete-modal-title"
              className="text-lg font-bold text-danger mb-2 flex items-center gap-2"
            >
              <Trash2 size={18} />
              Excluir conta permanentemente
            </h3>
            <p className="text-sm text-text-secondary mb-5">
              Para confirmar, digite <strong className="text-danger">DELETAR</strong>{" "}
              e sua senha. Esta acao nao pode ser desfeita.
            </p>

            <form onSubmit={handleDelete} className="space-y-4">
              <div>
                <label
                  htmlFor="delete-confirmation"
                  className="block text-sm font-medium text-text-primary mb-1.5"
                >
                  Digite DELETAR para confirmar
                </label>
                <input
                  id="delete-confirmation"
                  type="text"
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  placeholder="DELETAR"
                  autoComplete="off"
                  autoFocus
                  className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-danger/50 focus:ring-1 focus:ring-danger/30 transition font-mono"
                />
              </div>

              <div>
                <label
                  htmlFor="delete-password"
                  className="block text-sm font-medium text-text-primary mb-1.5"
                >
                  Sua senha
                </label>
                <input
                  id="delete-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-danger/50 focus:ring-1 focus:ring-danger/30 transition"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={deleting}
                  className="flex-1 bg-surface-2 border border-border hover:bg-surface-3 text-text-primary font-semibold text-sm px-4 py-2.5 rounded-lg disabled:opacity-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!canDelete}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-danger hover:bg-danger-dark text-white font-semibold text-sm px-4 py-2.5 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  {deleting && <Loader2 className="animate-spin" size={16} />}
                  {deleting ? "Excluindo..." : "Excluir permanentemente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
