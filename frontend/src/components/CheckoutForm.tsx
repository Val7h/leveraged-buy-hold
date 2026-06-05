'use client';

import React, { useState } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { AlertCircle, CheckCircle } from 'lucide-react';

interface CheckoutFormProps {
  userEmail?: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export const CheckoutForm: React.FC<CheckoutFormProps> = ({
  userEmail,
  onSuccess,
  onError,
}) => {
  const stripe = useStripe();
  const elements = useElements();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      setError('Payment system not loaded. Please refresh and try again.');
      return;
    }

    if (!agreedToTerms) {
      setError('Please agree to the terms and conditions.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create payment method
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error('Card element not found');
      }

      const { error: paymentError, paymentMethod } =
        await stripe.createPaymentMethod({
          type: 'card',
          card: cardElement,
          billing_details: {
            email: userEmail,
          },
        });

      if (paymentError) {
        setError(paymentError.message || 'Payment failed');
        onError?.(paymentError.message || 'Payment failed');
        setLoading(false);
        return;
      }

      // Send to backend to create subscription
      const response = await fetch('/api/v1/billing/create-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Subscription creation failed');
      }

      const result = await response.json();

      setSuccess(true);
      setError(null);
      onSuccess?.();

      // Show success message with trial details
      setTimeout(() => {
        window.location.href = '/dashboard?trial=active';
      }, 2000);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-slate-900 mb-2">Start Your 14-Day Trial</h2>
      <p className="text-slate-600 mb-6">
        No charge today. Your card will be charged $19.00 on day 15.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email Display */}
        {userEmail && (
          <div className="bg-slate-50 p-4 rounded-lg">
            <p className="text-sm text-slate-600">Billing email</p>
            <p className="font-semibold text-slate-900">{userEmail}</p>
          </div>
        )}

        {/* Card Element */}
        <div className="border border-slate-300 rounded-lg p-4 bg-white">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#1e293b',
                  '::placeholder': {
                    color: '#94a3b8',
                  },
                },
                invalid: {
                  color: '#ef4444',
                },
              },
            }}
          />
        </div>

        {/* Trial Info */}
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
          <div className="flex gap-2">
            <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-900 text-sm">
                14-day free trial
              </p>
              <p className="text-sm text-blue-800">
                Full Pro access. No charge until day 15. Cancel anytime.
              </p>
            </div>
          </div>
        </div>

        {/* Terms Agreement */}
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={agreedToTerms}
            onChange={(e) => setAgreedToTerms(e.target.checked)}
            className="w-4 h-4 mt-1"
          />
          <span className="text-sm text-slate-600">
            I agree to the{' '}
            <a href="/terms" className="text-blue-600 hover:underline">
              Terms of Service
            </a>
            {' '}and{' '}
            <a href="/privacy" className="text-blue-600 hover:underline">
              Privacy Policy
            </a>
          </span>
        </label>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 p-4 rounded-lg flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-900 text-sm">Error</p>
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="bg-green-50 border border-green-200 p-4 rounded-lg flex gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-green-900 text-sm">Success!</p>
              <p className="text-sm text-green-800">
                Your trial is activated. Redirecting to dashboard...
              </p>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !stripe || !agreedToTerms || success}
          className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading && 'Processing...'}
          {!loading && success && 'Trial Activated!'}
          {!loading && !success && 'Start Free 14-Day Trial'}
        </button>

        {/* Disclaimer */}
        <p className="text-xs text-slate-500 text-center">
          This is a secure payment processed by Stripe. Your card details are encrypted.
        </p>
      </form>
    </div>
  );
};

export default CheckoutForm;
