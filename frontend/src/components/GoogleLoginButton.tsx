"use client";

import { GoogleLogin } from "@react-oauth/google";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

export default function GoogleLoginButton() {
  const router = useRouter();
  const { setToken, fetchMe } = useAuthStore();
  const [error, setError] = useState("");

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      setError("");
      const response = await fetch(`${API_URL}/api/v1/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_token: credentialResponse.credential }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Erro ao fazer login com Google");
      }

      const data = await response.json();
      setToken(data.access_token);
      await fetchMe();
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao fazer login com Google");
    }
  };

  const handleGoogleError = () => {
    setError("Erro ao fazer login com Google. Tente novamente.");
  };

  return (
    <div className="w-full">
      {error && (
        <p className="text-danger text-xs bg-danger/10 border border-danger/20 rounded-lg px-3 py-2 mb-3">
          {error}
        </p>
      )}
      <div className="flex justify-center">
        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={handleGoogleError}
          text="signin_with"
        />
      </div>
    </div>
  );
}
