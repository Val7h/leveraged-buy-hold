"use client";

import React, { useState } from "react";
import { AlertTriangle, X } from "lucide-react";

interface RiskDisclaimerModalProps {
  onConfirm?: () => void;
  onAccept?: () => void;
  isOpen?: boolean;
  title?: string;
}

const RiskDisclaimerModal: React.FC<RiskDisclaimerModalProps> = ({
  onConfirm,
  onAccept,
  isOpen = true,
  title = "Important Risk Disclosure",
}) => {
  const [acceptRisk, setAcceptRisk] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!acceptRisk || !acceptTerms) {
      setError("Please accept both items to continue");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const timestamp = new Date().toISOString();

      const response = await fetch("/api/v1/user/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          acceptRisk: true,
          acceptTerms: true,
          timestamp: timestamp,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.detail || `Failed to log consent (${response.status})`;
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log("Consent logged successfully:", data);

      // Call callbacks
      if (onAccept) {
        onAccept();
      } else if (onConfirm) {
        onConfirm();
      } else {
        // Default: redirect to dashboard
        window.location.href = "/dashboard";
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred while logging consent";
      console.error("Consent error:", errorMessage);
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full max-h-screen overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-red-50 to-orange-50 border-b border-red-200 p-4 sm:p-6 flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">{title}</h2>
            <p className="text-xs sm:text-sm text-gray-600">
              Please read carefully before proceeding
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4">
          {/* Risk Disclosure */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-semibold text-yellow-900 text-sm sm:text-base mb-2">
              Leverage & Margin Risk
            </h3>
            <p className="text-xs sm:text-sm text-yellow-800 mb-2">
              This platform enables leveraged trading using 2x to 3.5x margin on your portfolio. Leverage amplifies both gains AND losses.
            </p>
            <p className="text-xs sm:text-sm text-yellow-800">
              Example: With 3x leverage, a 10% market decline results in a 30% loss to your capital. You can lose more than your initial investment.
            </p>
          </div>

          {/* Key Risks */}
          <div className="space-y-2">
            <h3 className="font-semibold text-gray-900 text-sm">Key Risks:</h3>
            <ul className="text-xs sm:text-sm text-gray-700 space-y-1 list-disc list-inside">
              <li>Margin calls may force liquidation of positions at unfavorable prices</li>
              <li>Interest charges apply daily on borrowed funds</li>
              <li>Market volatility can trigger rapid losses</li>
              <li>Algorithmic trading may not work in all market conditions</li>
              <li>Technical failures or broker issues may prevent intended trades</li>
              <li>Past performance does not guarantee future results</li>
            </ul>
          </div>

          {/* Qualification */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs sm:text-sm text-blue-900">
              <strong>You should only use leverage if:</strong> You understand these risks, have sufficient capital to absorb losses, and have experience with leverage trading.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-xs sm:text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Checkboxes */}
          <div className="space-y-3 pt-4 border-t border-gray-200">
            <label className="flex items-start gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
              <input
                type="checkbox"
                checked={acceptRisk}
                onChange={(e) => setAcceptRisk(e.target.checked)}
                className="w-4 h-4 mt-1 text-red-600 border-gray-300 rounded focus:ring-2 focus:ring-red-500"
                disabled={isSubmitting}
              />
              <span className="text-xs sm:text-sm text-gray-700">
                I understand the leverage and margin risks, and I accept full responsibility for potential losses.
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="w-4 h-4 mt-1 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                disabled={isSubmitting}
              />
              <span className="text-xs sm:text-sm text-gray-700">
                I have read and accept the{" "}
                <a href="/legal/terms-of-service" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  Terms of Service
                </a>
                {" "}and{" "}
                <a href="/legal/risk-disclosure" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  Risk Disclosure
                </a>
                .
              </span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 border-t border-gray-200 bg-gray-50 p-4 sm:p-6 space-y-3">
          <button
            onClick={handleSubmit}
            disabled={!acceptRisk || !acceptTerms || isSubmitting}
            className={`w-full py-2 sm:py-3 px-4 rounded-md font-semibold text-white text-sm sm:text-base transition ${
              !acceptRisk || !acceptTerms || isSubmitting
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {isSubmitting ? "Processing..." : "I Understand & Accept"}
          </button>

          <p className="text-xs text-gray-500 text-center">
            Your consent is logged for regulatory compliance purposes.
          </p>
        </div>
      </div>
    </div>
  );
};

export default RiskDisclaimerModal;
