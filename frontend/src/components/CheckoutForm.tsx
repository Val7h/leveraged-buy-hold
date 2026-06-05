"use client";

import React, { useState } from "react";
import { useStripe, useElements, CardElement } from "@stripe/react-stripe-js";

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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [cardComplete, setCardComplete] = useState(false);

  const prices = {
    pro: { amount: 1900, currency: "usd", label: "Pro - $19/mo" },
    enterprise: { amount: 29900, currency: "usd", label: "Enterprise - $299/mo" },
  };

  const selectedPrice = prices[tier];

  const cardElementOptions = {
    style: {
      base: { fontSize: "16px", color: "#424770", "::placeholder": { color: "#aab7c4" } },
      invalid: { color: "#fa755a", iconColor: "#fa755a" },
    },
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) {
      setError("Stripe failed to load");
      return;
    }
    if (!cardComplete) {
      setError("Please enter valid card information");
      return;
    }
    if (!email) {
      setError("Please enter your email address");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new Error("Card element not found");

      const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
        type: "card",
        card: cardElement,
        billing_details: { email },
      });

      if (pmError) throw new Error(pmError.message || "Payment method failed");

      const response = await fetch("/api/v1/billing/create-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethodId: paymentMethod?.id, email, tier }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Subscription creation failed");
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
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      if (onError) onError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`w-full max-w-md mx-auto p-4 sm:p-6 ${className}`}>
      <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
        <h2 className="text-xl sm:text-2xl font-bold mb-2">
          Upgrade to {tier === "pro" ? "Pro" : "Enterprise"}
        </h2>
        <p className="text-sm sm:text-base text-gray-600 mb-6">
          {tier === "pro" ? "14-day free trial, then $19/month" : "Custom pricing"}
        </p>

        {error && (
          <div className="mb-4 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-xs sm:text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
              Card Details
            </label>
            <div className="border border-gray-300 rounded-md p-3 bg-white">
              <CardElement
                options={cardElementOptions}
                onChange={(e) => {
                  setCardComplete(e.complete);
                  setError(e.error?.message || null);
                }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Charged ${selectedPrice.amount / 100}.00 on Day 15.
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-blue-900 font-semibold">
              ✅ 14-day free trial
            </p>
            <p className="text-xs text-blue-700 mt-2">No charge until Day 15. Cancel anytime.</p>
          </div>

          <button
            type="submit"
            disabled={isLoading || !stripe || !cardComplete}
            className={`w-full py-2 sm:py-3 px-4 rounded-md font-semibold text-white text-sm sm:text-base transition ${
              isLoading || !stripe || !cardComplete
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {isLoading ? "Processing..." : `Start Trial — ${selectedPrice.label}`}
          </button>

          <p className="text-xs text-gray-500 text-center">
            By proceeding, you agree to our Terms and Privacy Policy.
          </p>
        </form>
      </div>
    </div>
  );
};

export default CheckoutForm;
