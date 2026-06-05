"use client";

import React, { useState } from "react";
import { useStripe, useElements, CardElement } from "@stripe/react-stripe-js";
import { useAuthStore } from "@/store/authStore";
import { ShieldCheck, Lock } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

interface CheckoutFormProps {
  onSuccess?: (subscriptionId: string) => void;
  onError?: (error: string) => void;
  tier?: "pro" | "enterprise";
  className?: string;
}

const CheckoutForm: React.FC<CheckoutFormProps> = ({
  onSuccess,
  onError,
  tier = "pro",
  className = "",
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cardComplete, setCardComplete] = useState(false);

  const plans = {
    pro: { price: "R$ 19/mês", trialLabel: "14 dias grátis", billingLabel: "Cobrança a partir do 15º dia", label: "Pro" },
    enterprise: { price: "R$ 299/mês", trialLabel: "Personalizado", billingLabel: "Cobrado mensalmente", label: "Enterprise" },
  };

  const plan = plans[tier];

  const cardElementOptions = {
    style: {
      base: {
        fontSize: "15px",
        color: "#E2E8F0",
        backgroundColor: "transparent",
        "::placeholder": { color: "#475569" },
        iconColor: "#00D4FF",
      },
      invalid: { color: "#EF4444", iconColor: "#EF4444" },
    },
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) {
      setError("Stripe não carregou. Recarregue a página.");
      return;
    }
    if (!cardComplete) {
      setError("Preencha os dados do cartão corretamente.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new Error("Elemento do cartão não encontrado");

      const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
        type: "card",
        card: cardElement,
        billing_details: { email: user?.email },
      });

      if (pmError) throw new Error(pmError.message || "Erro ao processar cartão");

      const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
      const response = await fetch(`${API_URL}/api/v1/billing/create-subscription`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ paymentMethodId: paymentMethod?.id, email: user?.email, tier }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Erro ao criar assinatura");
      }

      const data = await response.json();

      if (data.client_secret) {
        const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
          data.client_secret,
          { payment_method: paymentMethod?.id }
        );
        if (confirmError) throw new Error(confirmError.message);
        if (paymentIntent?.status === "succeeded") {
          if (onSuccess) onSuccess(data.subscription_id);
          window.location.href = "/dashboard";
        }
      } else {
        if (onSuccess) onSuccess(data.subscription_id);
        window.location.href = "/dashboard";
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      setError(msg);
      if (onError) onError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Plan summary */}
      <div className="mb-5">
        <h2 className="text-lg font-bold text-text-primary">Assinar plano {plan.label}</h2>
        <p className="text-sm text-text-secondary mt-0.5">{plan.trialLabel} — depois {plan.price}</p>
      </div>

      {/* Trial info */}
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 mb-5 flex items-start gap-2">
        <ShieldCheck className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-semibold text-primary">{plan.trialLabel} sem cobrança</p>
          <p className="text-xs text-text-muted mt-0.5">{plan.billingLabel}. Cancele a qualquer momento.</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-danger/10 border border-danger/20 rounded-lg">
          <p className="text-danger text-xs">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email — pre-filled from user */}
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1.5">E-mail</label>
          <input
            type="email"
            value={user?.email || ""}
            readOnly
            className="input w-full opacity-60 cursor-not-allowed text-sm"
          />
        </div>

        {/* Card */}
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1.5">Dados do cartão</label>
          <div className="border border-border rounded-lg p-3 bg-surface-2 focus-within:border-primary/50 transition-colors">
            <CardElement
              options={cardElementOptions}
              onChange={(e) => {
                setCardComplete(e.complete);
                setError(e.error?.message || null);
              }}
            />
          </div>
        </div>

        {/* Security badges */}
        <div className="flex items-center justify-center gap-4 text-[11px] text-text-muted">
          <span className="flex items-center gap-1">
            <Lock className="w-3 h-3" /> SSL 256-bit
          </span>
          <span>Powered by Stripe</span>
          <span>VISA • Mastercard • Amex</span>
        </div>

        <button
          type="submit"
          disabled={isLoading || !stripe || !cardComplete}
          className={`w-full py-3 px-4 rounded-lg font-semibold text-sm transition-all ${
            isLoading || !stripe || !cardComplete
              ? "bg-surface-2 text-text-muted cursor-not-allowed"
              : "bg-primary text-background hover:bg-primary/90 active:scale-[0.98]"
          }`}
        >
          {isLoading ? "Processando..." : !stripe ? "Carregando..." : `Começar Trial Grátis →`}
        </button>

        <p className="text-[11px] text-text-muted text-center">
          Ao continuar, você aceita nossos Termos de Uso e Política de Privacidade.
        </p>
      </form>
    </div>
  );
};

export default CheckoutForm;
