import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Sparkles, Star, Zap, ChevronDown, ArrowRight } from 'lucide-react';
import axios from 'axios';

const PlansGrid = ({ onSelectPlan }) => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [contactRanges, setContactRanges] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const res = await axios.get('http://localhost:5000/api/plans');
      if (Array.isArray(res.data) && res.data.length > 0) {
        setPlans(res.data);
      } else {
        setPlans(fallbackPlans);
      }
    } catch (err) {
      console.error('Fetch plans error:', err);
      setPlans(fallbackPlans);
    } finally {
      setLoading(false);
    }
  };

  const fallbackPlans = [
    {
      id: 1,
      plan_code: 'free',
      name: "Under 350 contacts? It's free",
      tagline: 'Basic tools for senders getting started with email marketing.',
      monthly_price: 0.00,
      discount_percent: 0,
      trial_days: 0,
      contacts_limit: 350,
      emails_limit: 1000,
      is_popular: 0,
      features: [
        'Up to 350 contacts & 1,000 email sends',
        'Pre-built email templates',
        'Basic email automation workflows',
        'Standard reporting & analytics',
        '24/7 Email customer support'
      ]
    },
    {
      id: 2,
      plan_code: 'essentials',
      name: 'Essentials',
      tagline: 'Great for senders who need support and core automation features.',
      monthly_price: 775.00,
      discount_percent: 50,
      trial_days: 14,
      contacts_limit: 500,
      emails_limit: 5000,
      is_popular: 0,
      features: [
        '24/7 Email & Chat Support',
        'A/B Testing for email subject lines & content',
        'Custom branding on emails & forms',
        'Basic Audience Segmentation',
        'Automated customer journeys'
      ]
    },
    {
      id: 3,
      plan_code: 'standard',
      name: 'Standard',
      tagline: 'Advanced AI tools, deeper insights & higher email delivery speed.',
      monthly_price: 1150.00,
      discount_percent: 50,
      trial_days: 14,
      contacts_limit: 500,
      emails_limit: 6000,
      is_popular: 1,
      features: [
        'Advanced Generative AI features for your email campaigns',
        'Actionable insights into audience growth & conversion funnels',
        'Enhanced email automations to engage your subscribers on autopilot',
        'Custom-coded email templates tailored to your brand identity',
        'Customizable popup forms designed to capture more leads effortlessly',
        'Personalized onboarding to get your email campaigns running smoothly'
      ]
    },
    {
      id: 4,
      plan_code: 'premium',
      name: 'Premium',
      tagline: 'Enterprise-grade capabilities, dedicated IP & priority phone support.',
      monthly_price: 23000.00,
      discount_percent: 50,
      trial_days: 14,
      contacts_limit: 10000,
      emails_limit: 150000,
      is_popular: 0,
      features: [
        'Unlimited contacts & high-volume sending rate',
        'Dedicated IP address & custom DKIM authentication',
        'Advanced multivariate testing & predictive analytics',
        'Priority phone & live chat 24/7 support',
        'Custom role-based permissions & multi-user collaboration'
      ]
    }
  ];

  const handleSelect = (plan) => {
    if (onSelectPlan) {
      onSelectPlan(plan.plan_code, plan.trial_days > 0 ? 'trial' : 'free');
    } else {
      navigate(`/register?plan=${plan.plan_code}&trial=${plan.trial_days}days`);
    }
  };

  return (
    <div id="plans-section" className="py-16 px-4 sm:px-6 lg:px-12 bg-white">
      <div className="max-w-7xl mx-auto space-y-12">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <span className="px-3.5 py-1 bg-amber-100 text-amber-900 font-extrabold text-xs uppercase tracking-wider rounded-full inline-block">
            Flexible Marketing Plans
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Find the perfect BexEmail plan for your business
          </h2>
          <p className="text-sm text-slate-600 font-medium">
            Choose from our 4 tailored marketing plans. All paid plans include a 14-day risk-free trial with zero upfront credit card commitment.
          </p>
        </div>

        {/* 4 Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
          {plans.map((plan) => {
            const isPopular = Number(plan.is_popular) === 1 || plan.plan_code === 'standard';
            const price = Number(plan.monthly_price);
            const discountPrice = plan.discount_percent > 0 ? (price * (100 - plan.discount_percent) / 100) : price;

            return (
              <div
                key={plan.id || plan.plan_code}
                className={`rounded-3xl p-6 sm:p-7 flex flex-col justify-between transition-all duration-300 relative ${
                  isPopular
                    ? 'bg-slate-900 text-white shadow-2xl ring-4 ring-amber-400 scale-[1.02]'
                    : 'bg-slate-50 text-slate-900 border border-slate-200 hover:shadow-xl'
                }`}
              >
                {/* Popular Badge */}
                {isPopular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-amber-400 text-slate-900 font-black text-[11px] uppercase tracking-wider px-3.5 py-1 rounded-full shadow-md flex items-center gap-1">
                    <Star size={12} className="fill-slate-900" />
                    RECOMMENDED
                  </div>
                )}

                <div className="space-y-5">
                  <div>
                    <h3 className={`text-xl font-extrabold tracking-tight ${isPopular ? 'text-white' : 'text-slate-900'}`}>
                      {plan.name}
                    </h3>
                    <p className={`text-xs mt-1.5 font-medium leading-relaxed ${isPopular ? 'text-slate-300' : 'text-slate-500'}`}>
                      {plan.tagline}
                    </p>
                  </div>

                  {/* Pricing Box */}
                  <div className="pt-2">
                    {price === 0 ? (
                      <div>
                        <div className="text-3xl font-black">Free</div>
                        <div className={`text-xs mt-0.5 ${isPopular ? 'text-slate-400' : 'text-slate-500'}`}>
                          Up to 350 contacts
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-black">₹{discountPrice.toLocaleString()}</span>
                          <span className={`text-xs ${isPopular ? 'text-slate-300' : 'text-slate-500'}`}>/mo</span>
                          {plan.discount_percent > 0 && (
                            <span className="text-xs line-through opacity-60">₹{price.toLocaleString()}</span>
                          )}
                        </div>
                        <div className={`text-[11px] mt-1 font-semibold ${isPopular ? 'text-amber-300' : 'text-slate-600'}`}>
                          {plan.trial_days > 0 ? `Free for ${plan.trial_days} days` : 'Standard Rate'}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Contacts Limit Selector */}
                  <div>
                    <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${isPopular ? 'text-slate-400' : 'text-slate-500'}`}>
                      Contact Capacity
                    </label>
                    <div className="relative">
                      <select
                        value={contactRanges[plan.plan_code] || `${plan.contacts_limit}`}
                        onChange={(e) => setContactRanges({ ...contactRanges, [plan.plan_code]: e.target.value })}
                        className={`w-full px-3 py-2 text-xs font-bold rounded-xl appearance-none cursor-pointer outline-none ${
                          isPopular
                            ? 'bg-slate-800 text-white border border-slate-700'
                            : 'bg-white text-slate-800 border border-slate-300'
                        }`}
                      >
                        <option value={plan.contacts_limit}>{plan.contacts_limit.toLocaleString()} contacts</option>
                        <option value={plan.contacts_limit * 2}>{(plan.contacts_limit * 2).toLocaleString()} contacts</option>
                        <option value={plan.contacts_limit * 5}>{(plan.contacts_limit * 5).toLocaleString()} contacts</option>
                      </select>
                      <ChevronDown size={14} className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${isPopular ? 'text-slate-400' : 'text-slate-400'}`} />
                    </div>
                  </div>

                  {/* Features List */}
                  <div className="pt-3 border-t border-slate-200/40 space-y-2.5">
                    <div className={`text-[11px] font-extrabold uppercase tracking-wider ${isPopular ? 'text-amber-300' : 'text-slate-700'}`}>
                      Included Features:
                    </div>
                    {Array.isArray(plan.features) && plan.features.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs font-medium">
                        <Check size={16} className={`flex-shrink-0 mt-0.5 ${isPopular ? 'text-amber-400' : 'text-amber-600'}`} />
                        <span className={isPopular ? 'text-slate-200' : 'text-slate-700'}>{feat}</span>
                      </div>
                    ))}
                  </div>

                </div>

                {/* Card CTA Button */}
                <div className="pt-6">
                  <button
                    onClick={() => handleSelect(plan)}
                    className={`w-full py-3 px-4 rounded-full font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-[0.98] ${
                      isPopular
                        ? 'bg-amber-400 hover:bg-amber-500 text-slate-900'
                        : 'bg-slate-900 hover:bg-slate-800 text-white'
                    }`}
                  >
                    <span>{price === 0 ? 'Sign Up Free' : (plan.trial_days > 0 ? `Try Free for ${plan.trial_days} Days` : 'Select Plan')}</span>
                    <ArrowRight size={14} />
                  </button>
                </div>

              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
};

export default PlansGrid;
