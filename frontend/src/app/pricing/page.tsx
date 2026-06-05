'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import CheckoutForm from '@/components/CheckoutForm';

interface PricingTier {
  name: string;
  price: string;
  description: string;
  period: string;
  cta: string;
  highlight?: boolean;
  features: { text: string; included: boolean }[];
}

const pricingTiers: PricingTier[] = [
  {
    name: 'Free',
    price: '$0',
    description: 'Perfect for beginners exploring algorithmic investing',
    period: '/month',
    cta: 'Get Started',
    features: [
      { text: 'Screen up to 5 assets per month', included: true },
      { text: '1 backtest (5-year history)', included: true },
      { text: '1 portfolio folder', included: true },
      { text: 'Community support', included: true },
      { text: 'Basic CSV export', included: true },
      { text: 'Unlimited screening', included: false },
      { text: 'Monte Carlo analysis', included: false },
      { text: 'Email support', included: false },
      { text: 'PDF export & reports', included: false },
      { text: 'API access', included: false },
    ],
  },
  {
    name: 'Pro',
    price: '$19',
    description: 'For active investors who need advanced tools',
    period: '/month, billed monthly',
    cta: 'Start 14-day Trial',
    highlight: true,
    features: [
      { text: 'Unlimited asset screening', included: true },
      { text: '10 backtests per month (20-year history)', included: true },
      { text: '5 portfolio folders', included: true },
      { text: 'Price & value alerts (20 max)', included: true },
      { text: 'Monte Carlo simulation', included: true },
      { text: 'PDF export & reports', included: true },
      { text: 'Email support (24h response)', included: true },
      { text: 'Ad-free experience', included: true },
      { text: 'REST API access', included: false },
      { text: 'White-label & custom branding', included: false },
    ],
  },
  {
    name: 'Enterprise',
    price: '$299',
    description: 'For advisors, RIAs, and professional teams',
    period: '/month+, custom',
    cta: 'Contact Sales',
    features: [
      { text: 'All Pro features included', included: true },
      { text: 'Unlimited backtests (unlimited history)', included: true },
      { text: 'Unlimited portfolios & folders', included: true },
      { text: 'Unlimited custom alerts (100+)', included: true },
      { text: 'White-label & custom branding', included: true },
      { text: 'REST API access (full)', included: true },
      { text: 'Webhooks & integrations', included: true },
      { text: 'Dedicated account manager', included: true },
      { text: 'Phone & Slack support (priority)', included: true },
      { text: '99.9% uptime SLA', included: true },
    ],
  },
];

const faqItems = [
  {
    question: 'How does the 14-day free trial work?',
    answer: 'Sign up for Pro, and we\'ll give you full access to all Pro features for 14 days. Your credit card is required but you won\'t be charged. After 14 days, we\'ll automatically charge your card $19. You can cancel anytime before then.',
  },
  {
    question: 'Why $19 per month?',
    answer: '$19 reflects the professional-grade tools and analysis you get. This price point signals quality and attracts serious investors while remaining accessible. We\'ve stress-tested it with hundreds of potential users.',
  },
  {
    question: 'Can I cancel my subscription?',
    answer: 'Yes, anytime. If you cancel before Day 15, you won\'t be charged. If you\'re a paid subscriber, your features remain active until the end of your billing cycle.',
  },
  {
    question: 'Do you offer annual billing or discounts?',
    answer: 'We\'re launching with monthly billing. Annual billing (with 10% discount) comes in Q3 2026. Early adopters might get special pricing—watch your email!',
  },
  {
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit cards (Visa, Mastercard, Amex) via Stripe. We also support Apple Pay and Google Pay for mobile users.',
  },
  {
    question: 'What if my payment fails?',
    answer: 'We\'ll retry your payment automatically. If it continues to fail, we\'ll email you within 24 hours. You have a grace period to update your payment method before losing Pro access.',
  },
  {
    question: 'Do you offer refunds?',
    answer: 'Yes. If you cancel within 7 days of your first charge, we\'ll refund it in full. After 7 days, no refunds—but you can cancel anytime.',
  },
  {
    question: 'Is there a contract or lock-in?',
    answer: 'No. Monthly billing with no commitments. Cancel anytime (no phone calls or support tickets required).',
  },
  {
    question: 'What\'s included in Enterprise pricing?',
    answer: 'Enterprise is fully customized based on your needs: white-label branding, API access, dedicated manager, custom SLAs, integrations, and more. Contact our sales team for a tailored quote.',
  },
  {
    question: 'Do you offer discounts for nonprofits or students?',
    answer: 'Contact us at sales@lbhsystem.com and we\'ll discuss options. We support financial education and may have special programs.',
  },
  {
    question: 'Can I upgrade or downgrade mid-cycle?',
    answer: 'Yes. Upgrade anytime and we\'ll prorate. Downgrade and we\'ll credit your account. Changes take effect immediately.',
  },
  {
    question: 'What happens after my trial ends?',
    answer: 'Your card is charged $19 on Day 15. Pro features remain active. You can cancel anytime to revert to Free tier (limited features only).',
  },
];

export default function PricingPage() {
  const router = useRouter();
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);

  const handleCTA = (tierName: string) => {
    if (tierName === 'Free') {
      // Redirect to login/signup
      router.push('/login');
    } else if (tierName === 'Pro') {
      // Show CheckoutForm modal
      setShowCheckout(true);
    } else if (tierName === 'Enterprise') {
      // Open contact form or email
      window.location.href = 'mailto:sales@lbhsystem.com?subject=Enterprise%20Pricing%20Inquiry';
    }
  };

  return (
    <>
      {/* Checkout Modal */}
      {showCheckout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 relative">
            <button
              onClick={() => setShowCheckout(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
            <div className="p-6">
              <CheckoutForm tier="pro" />
            </div>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-slate-900 mb-6">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-slate-600 mb-8">
            Choose the plan that fits your investing style. Start free, upgrade anytime.
          </p>
          <div className="flex justify-center gap-8 text-sm text-slate-600">
            <div>✓ No credit card required for Free</div>
            <div>✓ 14-day Pro trial included</div>
            <div>✓ Cancel anytime</div>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-4">
            {pricingTiers.map((tier, idx) => (
              <div
                key={idx}
                className={`relative rounded-2xl transition-all duration-300 ${
                  tier.highlight
                    ? 'ring-2 ring-blue-500 transform scale-105 shadow-2xl bg-white'
                    : 'bg-slate-50 border border-slate-200 hover:border-slate-300 shadow-lg'
                }`}
              >
                {tier.highlight && (
                  <div className="absolute -top-4 left-0 right-0 flex justify-center">
                    <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="p-8">
                  {/* Tier Name */}
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">
                    {tier.name}
                  </h3>
                  <p className="text-sm text-slate-600 mb-6 min-h-10">
                    {tier.description}
                  </p>

                  {/* Price */}
                  <div className="mb-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-5xl font-bold text-slate-900">
                        {tier.price}
                      </span>
                      <span className="text-slate-600">{tier.period}</span>
                    </div>
                  </div>

                  {/* CTA Button */}
                  <button
                    onClick={() => handleCTA(tier.name)}
                    className={`w-full py-3 px-6 rounded-lg font-semibold transition-all mb-8 ${
                      tier.highlight
                        ? 'bg-blue-500 text-white hover:bg-blue-600 active:scale-95'
                        : 'bg-slate-200 text-slate-900 hover:bg-slate-300 active:scale-95'
                    }`}
                  >
                    {tier.cta}
                  </button>

                  {/* Features List */}
                  <ul className="space-y-4">
                    {tier.features.map((feature, fidx) => (
                      <li key={fidx} className="flex items-start gap-3">
                        {feature.included ? (
                          <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        ) : (
                          <div className="w-5 h-5 border border-slate-300 rounded flex-shrink-0 mt-0.5" />
                        )}
                        <span
                          className={`text-sm ${
                            feature.included
                              ? 'text-slate-700'
                              : 'text-slate-400 line-through'
                          }`}
                        >
                          {feature.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">
            Detailed Feature Comparison
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-slate-300">
                  <th className="text-left py-4 px-4 font-semibold text-slate-900">
                    Feature
                  </th>
                  <th className="text-center py-4 px-4 font-semibold text-slate-900">
                    Free
                  </th>
                  <th className="text-center py-4 px-4 font-semibold text-slate-900">
                    Pro
                  </th>
                  <th className="text-center py-4 px-4 font-semibold text-slate-900">
                    Enterprise
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr className="bg-white">
                  <td className="py-4 px-4 text-slate-900 font-semibold">
                    Asset Screening
                  </td>
                  <td className="text-center py-4 px-4">5/mo</td>
                  <td className="text-center py-4 px-4">
                    <Check className="w-5 h-5 text-green-500 mx-auto" />
                  </td>
                  <td className="text-center py-4 px-4">
                    <Check className="w-5 h-5 text-green-500 mx-auto" />
                  </td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="py-4 px-4 text-slate-900 font-semibold">
                    Backtests
                  </td>
                  <td className="text-center py-4 px-4">1 (5yr)</td>
                  <td className="text-center py-4 px-4">10/mo (20yr)</td>
                  <td className="text-center py-4 px-4">Unlimited</td>
                </tr>
                <tr className="bg-white">
                  <td className="py-4 px-4 text-slate-900 font-semibold">
                    Monte Carlo
                  </td>
                  <td className="text-center py-4 px-4">-</td>
                  <td className="text-center py-4 px-4">
                    <Check className="w-5 h-5 text-green-500 mx-auto" />
                  </td>
                  <td className="text-center py-4 px-4">
                    <Check className="w-5 h-5 text-green-500 mx-auto" />
                  </td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="py-4 px-4 text-slate-900 font-semibold">
                    Alerts
                  </td>
                  <td className="text-center py-4 px-4">-</td>
                  <td className="text-center py-4 px-4">20</td>
                  <td className="text-center py-4 px-4">100+</td>
                </tr>
                <tr className="bg-white">
                  <td className="py-4 px-4 text-slate-900 font-semibold">
                    API Access
                  </td>
                  <td className="text-center py-4 px-4">-</td>
                  <td className="text-center py-4 px-4">-</td>
                  <td className="text-center py-4 px-4">
                    <Check className="w-5 h-5 text-green-500 mx-auto" />
                  </td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="py-4 px-4 text-slate-900 font-semibold">
                    Support
                  </td>
                  <td className="text-center py-4 px-4">Community</td>
                  <td className="text-center py-4 px-4">Email (24h)</td>
                  <td className="text-center py-4 px-4">
                    Slack + Phone
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {faqItems.map((item, idx) => (
              <div
                key={idx}
                className="border border-slate-200 rounded-lg overflow-hidden"
              >
                <button
                  onClick={() =>
                    setExpandedFaq(expandedFaq === idx ? null : idx)
                  }
                  className="w-full px-6 py-4 text-left font-semibold text-slate-900 hover:bg-slate-50 flex justify-between items-center transition-colors"
                >
                  {item.question}
                  <span
                    className={`transition-transform ${
                      expandedFaq === idx ? 'rotate-180' : ''
                    }`}
                  >
                    ▼
                  </span>
                </button>
                {expandedFaq === idx && (
                  <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 text-slate-700">
                    {item.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-blue-50">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">
            Ready to get started?
          </h2>
          <p className="text-lg text-slate-600 mb-8">
            No credit card required to start with Free. Upgrade to Pro anytime.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => handleCTA('Free')}
              className="px-8 py-3 bg-slate-200 text-slate-900 rounded-lg font-semibold hover:bg-slate-300 transition-colors"
            >
              Start Free
            </button>
            <button
              onClick={() => handleCTA('Pro')}
              className="px-8 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors"
            >
              Try Pro Free for 14 Days
            </button>
          </div>
        </div>
      </section>
    </div>
    </>
  );
}
