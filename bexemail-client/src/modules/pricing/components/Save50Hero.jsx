import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ArrowRight, Sparkles, ShieldCheck, ChevronDown, Zap } from 'lucide-react';

const Save50Hero = ({ activeTab, setActiveTab, onSelectPlan }) => {
  const [selectedContacts, setSelectedContacts] = useState('0-500');
  const navigate = useNavigate();

  const handleBuyNow = () => {
    if (onSelectPlan) {
      onSelectPlan('standard', '50_off');
    } else {
      navigate('/register?plan=standard&discount=50_off');
    }
  };

  return (
    <div className="bg-slate-100/80 border-b border-slate-200 py-12 px-4 sm:px-6 lg:px-12">
      <div className="max-w-6xl mx-auto">
        
        {/* Top Tab Badges */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => setActiveTab('save_50')}
            className={`px-4 py-2 text-xs font-black rounded-full transition-all ${
              activeTab === 'save_50'
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
            }`}
          >
            Save 50%
          </button>

          <button
            onClick={() => setActiveTab('try_free')}
            className={`px-4 py-2 text-xs font-black rounded-full transition-all flex items-center gap-1.5 ${
              activeTab === 'try_free'
                ? 'bg-amber-400 text-slate-900 shadow-md font-extrabold'
                : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
            }`}
          >
            <Sparkles size={14} className="text-slate-900" />
            Try risk-free
          </button>
        </div>

        {/* 2-Column Main Hero */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          {/* Left Column Content */}
          <div className="lg:col-span-7 space-y-6">
            <div>
              <span className="px-3 py-1 bg-amber-200 text-slate-900 font-extrabold text-[11px] uppercase tracking-wider rounded-md inline-block mb-3">
                50% OFF FOR 12 MONTHS
              </span>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                Try our Standard plan for 50% off!
              </h1>
              <h2 className="text-lg sm:text-xl font-bold text-slate-800 mt-2">
                Supercharge your email campaigns for 50% off!
              </h2>
            </div>

            <p className="text-sm sm:text-base text-slate-700 leading-relaxed font-medium">
              Scale your growth on a budget with half-price savings secured for a full 12 months (fully applicable even if you switch to our Premium or Essentials plans). Enjoy complete flexibility with the freedom to cancel or downgrade to our basic Free plan at any time.
            </p>

            {/* Bullet Points */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <span className="text-xs sm:text-sm font-semibold text-slate-800">
                  <strong className="font-extrabold">Cutting-edge Generative AI features</strong> to craft high-converting email content
                </span>
              </div>

              <div className="flex items-start gap-2.5">
                <CheckCircle2 size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <span className="text-xs sm:text-sm font-semibold text-slate-800">
                  <strong className="font-extrabold">Actionable insights</strong> into audience growth & conversion funnels
                </span>
              </div>

              <div className="flex items-start gap-2.5">
                <CheckCircle2 size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <span className="text-xs sm:text-sm font-semibold text-slate-800">
                  <strong className="font-extrabold">Enhanced email automations</strong> to engage your subscribers on autopilot
                </span>
              </div>

              <div className="flex items-start gap-2.5">
                <CheckCircle2 size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <span className="text-xs sm:text-sm font-semibold text-slate-800">
                  <strong className="font-extrabold">Custom-coded email templates</strong> tailored to your brand identity
                </span>
              </div>

              <div className="flex items-start gap-2.5">
                <CheckCircle2 size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <span className="text-xs sm:text-sm font-semibold text-slate-800">
                  <strong className="font-extrabold">Customizable popup forms</strong> designed to capture more leads effortlessly
                </span>
              </div>

              <div className="flex items-start gap-2.5">
                <CheckCircle2 size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <span className="text-xs sm:text-sm font-semibold text-slate-800">
                  <strong className="font-extrabold">Personalized onboarding</strong> to get your email campaigns running at peak performance
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-4">
              <a
                href="#plans-section"
                className="px-6 py-3 bg-white text-slate-900 font-extrabold text-xs sm:text-sm rounded-full border-2 border-slate-900 hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm"
              >
                <Sparkles size={16} className="text-amber-500" />
                Find the Right Plan
              </a>

              <button
                onClick={() => navigate('/compare-plans')}
                className="px-6 py-3 bg-amber-400 text-slate-900 font-black text-xs sm:text-sm rounded-full hover:bg-amber-500 transition-all flex items-center gap-2 shadow-md"
              >
                <span>Request a demo</span>
                <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center">
                  <ArrowRight size={14} />
                </div>
              </button>
            </div>

          </div>

          {/* Right Column Card */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5 relative overflow-hidden">
              
              {/* Save 50% Top Badge */}
              <div className="flex justify-between items-center text-[11px] font-bold text-slate-500">
                <span className="px-2.5 py-1 bg-amber-200 text-slate-900 font-black rounded-md">
                  SAVE 50%
                </span>
                <span className="flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                  ₹ INR <ChevronDown size={12} />
                </span>
              </div>

              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Standard</h3>
                <p className="text-xs text-slate-600 font-medium mt-1 leading-relaxed">
                  Send up to 6,000 emails each month with full 50% discount applied for 12 months.
                </p>
              </div>

              {/* Contacts Dropdown */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Contacts
                </label>
                <div className="relative">
                  <select
                    value={selectedContacts}
                    onChange={(e) => setSelectedContacts(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 appearance-none focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
                  >
                    <option value="0-500">0 - 500 contacts</option>
                    <option value="501-1500">501 - 1,500 contacts</option>
                    <option value="1501-2500">1,501 - 2,500 contacts</option>
                    <option value="2501-5000">2,501 - 5,000 contacts</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Price display */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                <div className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Save 50% Pricing</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-900">₹575</span>
                  <span className="text-xs text-slate-500 font-medium">/mo for 12 months</span>
                  <span className="text-xs text-slate-400 line-through">₹1,150</span>
                </div>
                <div className="text-[11px] text-slate-500">Then, starts at ₹1,150/month*</div>
              </div>

              {/* Buy Now Button */}
              <div className="pt-2">
                <button
                  onClick={handleBuyNow}
                  className="w-full py-3.5 px-4 bg-amber-400 hover:bg-amber-500 text-slate-900 font-black text-xs sm:text-sm rounded-full shadow-md transition-all active:scale-[0.98]"
                >
                  Buy Now
                </button>
              </div>

              <div className="flex items-center justify-center gap-2 pt-1">
                <span className="px-3 py-1 bg-slate-900 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-full flex items-center gap-1">
                  <Zap size={12} className="text-amber-400" />
                  Save 50% for 12 months
                </span>
              </div>

              {/* Terms text */}
              <p className="text-[10px] text-slate-500 text-center font-medium leading-tight">
                *See <a href="#offer-terms" className="underline font-bold text-slate-700">Offer Terms</a>. Overages apply if contact or email send limit is exceeded. <button onClick={() => navigate('/compare-plans')} className="underline font-bold text-slate-800">Learn More.</button>
              </p>

            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default Save50Hero;
