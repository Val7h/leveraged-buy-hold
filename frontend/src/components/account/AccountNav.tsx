"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Lock, Mail, Database, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const ITEMS: NavItem[] = [
  { href: "/conta/perfil", label: "Perfil", icon: User },
  { href: "/conta/senha", label: "Senha", icon: Lock },
  { href: "/conta/preferencias-email", label: "Preferencias de Email", icon: Mail },
  { href: "/conta/dados", label: "Meus Dados", icon: Database },
];

export default function AccountNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegacao da conta"
      className="w-full lg:w-60 flex-shrink-0"
    >
      {/* Mobile: scroll horizontal | Desktop: stack vertical */}
      <ul className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 -mx-1 px-1">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          // Match exato OU subrota (ex: /conta/perfil/edit ainda destaca Perfil)
          const isActive =
            pathname === href || pathname?.startsWith(`${href}/`);

          return (
            <li key={href} className="flex-shrink-0 lg:flex-shrink">
              <Link
                href={href}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
                  isActive
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-text-secondary hover:text-text-primary hover:bg-surface-2 border border-transparent",
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon size={16} className="flex-shrink-0" />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
