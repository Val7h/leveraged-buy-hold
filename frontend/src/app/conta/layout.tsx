"use client";

import { Toaster } from "react-hot-toast";
import AppShell from "@/components/layout/AppShell";
import AccountNav from "@/components/account/AccountNav";

// Layout das paginas de /conta/*:
// - AppShell ja injeta Sidebar global + auth guard via /me.
// - AccountNav e o "sub-menu" lateral (vertical em desktop, scrollable em mobile).
// - Toaster local cobre todas as subrotas — root layout nao tem Toaster global.
export default function ContaLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "var(--surface-2, #1a1f2e)",
            color: "#F8FAFB",
            border: "1px solid rgba(255,255,255,0.08)",
          },
        }}
      />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        <header className="mb-6 lg:mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold text-text-primary">
            Minha Conta
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Gerencie seu perfil, seguranca e dados pessoais.
          </p>
        </header>

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-10">
          <AccountNav />
          <div className="flex-1 min-w-0">{children}</div>
        </div>
      </div>
    </AppShell>
  );
}
