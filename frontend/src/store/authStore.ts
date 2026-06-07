import { create } from "zustand";

// Auth store — sessão vive 100% em cookie httpOnly emitido pelo backend Next.
// Não armazenamos token; o store só guarda o user object (público) p/ a UI.
// Não usamos `persist` — rehidratação stale + XSS surface desnecessários.

export interface AuthUser {
  id: string;
  email: string;
  fullName?: string | null;
  riskProfile?: string;
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    fullName?: string;
    riskProfile?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
}

async function postJson(url: string, body: unknown): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    credentials: "same-origin",
  });
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  isLoading: false,

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const res = await postJson("/api/v1/auth/login", { email, password });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `login_failed_${res.status}`);
      }
      const user = (await res.json()) as AuthUser;
      set({ user });
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (data) => {
    set({ isLoading: true });
    try {
      const res = await postJson("/api/v1/auth/register", data);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `register_failed_${res.status}`);
      }
      const user = (await res.json()) as AuthUser;
      set({ user });
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    try {
      await fetch("/api/v1/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });
    } finally {
      set({ user: null });
    }
  },

  fetchMe: async () => {
    try {
      const res = await fetch("/api/v1/auth/me", {
        credentials: "same-origin",
      });
      if (!res.ok) {
        set({ user: null });
        return;
      }
      const user = (await res.json()) as AuthUser;
      set({ user });
    } catch {
      set({ user: null });
    }
  },
}));
