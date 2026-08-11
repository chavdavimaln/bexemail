import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TryForFreeHero from '../modules/pricing/components/TryForFreeHero';
import Save50Hero from '../modules/pricing/components/Save50Hero';
import PlansGrid from '../modules/pricing/components/PlansGrid';
import TrustedIndustryLeader from '../modules/pricing/components/TrustedIndustryLeader';
import SmallBusinessPlans from '../modules/pricing/components/SmallBusinessPlans';
import PricingFAQs from '../modules/pricing/components/PricingFAQs';
import { ArrowLeft, Sparkles } from 'lucide-react';

const Pricing = () => {
  const [activeTab, setActiveTab] = useState('try_free'); // 'try_free' or 'save_50'
  const navigate = useNavigate();

  const handleSelectPlan = (planCode, type) => {
    navigate(`/register?plan=${planCode}&mode=${type}`);
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">
      
      {/* Global Top Bar */}
      <div className="bg-slate-900 text-white py-3 px-4 sm:px-8 flex items-center justify-between border-b border-slate-800">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-white transition"
        >
          <ArrowLeft size={16} />
          <span>Back to Dashboard</span>
        </button>

        <div className="flex items-center gap-2 text-xs font-black">
          <span className="text-amber-400">BexEmail Marketing Plans</span>
          <span className="hidden sm:inline text-slate-500">|</span>
          <button
            onClick={() => navigate('/compare-plans')}
            className="hidden sm:inline-flex items-center gap-1 text-slate-300 hover:text-amber-300 transition"
          >
            <Sparkles size={14} className="text-amber-400" />
            Compare All Features
          </button>
        </div>

        <button
          onClick={() => navigate('/login')}
          className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-500 text-slate-900 font-black text-xs rounded-full transition shadow-sm"
        >
          Sign In
        </button>
      </div>

      {/* Hero Section based on activeTab */}
      {activeTab === 'try_free' ? (
        <TryForFreeHero activeTab={activeTab} setActiveTab={setActiveTab} onSelectPlan={handleSelectPlan} />
      ) : (
        <Save50Hero activeTab={activeTab} setActiveTab={setActiveTab} onSelectPlan={handleSelectPlan} />
      )}

      {/* Plans Grid Section (Connected to MySQL DB) */}
      <PlansGrid onSelectPlan={handleSelectPlan} />

      {/* Trusted Industry Leader Section */}
      <TrustedIndustryLeader />

      {/* Basic Plans for Smaller Businesses Section */}
      <SmallBusinessPlans onSelectPlan={handleSelectPlan} />

      {/* FAQs Section */}
      <PricingFAQs />

      {/* Footer CTA */}
      <div className="bg-slate-900 text-white py-12 px-6 text-center border-t border-slate-800 space-y-4">
        <h3 className="text-2xl sm:text-3xl font-black">Ready to scale your email marketing?</h3>
        <p className="text-xs sm:text-sm text-slate-400 font-medium max-w-md mx-auto">
          Start your 14-day free trial today. Full access to generative AI features, template builders, and high-speed delivery.
        </p>
        <div>
          <button
            onClick={() => navigate('/register?trial=14-days')}
            className="px-8 py-3.5 bg-amber-400 hover:bg-amber-500 text-slate-900 font-black text-xs sm:text-sm rounded-full shadow-lg transition active:scale-[0.98]"
          >
            Start 14-Day Free Trial
          </button>
        </div>
      </div>

    </div>
  );
};

export default Pricing;
