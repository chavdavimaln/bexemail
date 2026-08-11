import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, CheckCircle2, ArrowRight, ShieldCheck, Mail, Users, Zap } from 'lucide-react';

const SmallBusinessPlans = ({ onSelectPlan }) => {
  const navigate = useNavigate();

  const handleSelect = (planCode) => {
    if (onSelectPlan) {
      onSelectPlan(planCode, 'trial');
    } else {
      navigate(`/register?plan=${planCode}&trial=14-days`);
    }
  };

  return (
    <div className="py-16 bg-slate-50 border-t border-slate-200 px-4 sm:px-6 lg:px-12">
      <div className="max-w-6xl mx-auto space-y-12">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <span className="px-3 py-1 bg-indigo-100 text-indigo-900 font-extrabold text-xs uppercase tracking-wider rounded-full inline-block">
            Starter Options
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Basic plans for smaller businesses
          </h2>
          <p className="text-sm text-slate-600 font-medium">
            Just starting out or sending to a targeted small audience? Choose a lightweight starter plan with essential tools, zero bloat, and full flexibility.
          </p>
        </div>

        {/* 2-Card Grid for Small Businesses */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          
          {/* Free Starter Card */}
          <div className="bg-white p-7 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-extrabold text-[10px] uppercase tracking-wider rounded-md">
                  100% FREE FOREVER
                </span>
                <span className="text-xs text-slate-400 font-semibold">Under 350 Contacts</span>
              </div>

              <div>
                <h3 className="text-2xl font-black text-slate-900">Free Starter Plan</h3>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Ideal for creators, freelancers, and small startups testing email newsletters.
                </p>
              </div>

              <div className="text-3xl font-black text-slate-900">
                ₹0 <span className="text-xs font-normal text-slate-500">/ forever</span>
              </div>

              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                  <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
                  <span>Up to 350 audience contacts</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                  <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
                  <span>1,000 email sends per month</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                  <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
                  <span>Standard email templates & web forms</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => handleSelect('free')}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs sm:text-sm rounded-full transition shadow-sm flex items-center justify-center gap-1.5"
            >
              <span>Get Started Free</span>
              <ArrowRight size={14} />
            </button>
          </div>

          {/* Essentials Starter Card */}
          <div className="bg-white p-7 rounded-3xl border border-indigo-200 shadow-md hover:shadow-lg transition flex flex-col justify-between space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-bl-full pointer-events-none" />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 bg-indigo-100 text-indigo-900 font-extrabold text-[10px] uppercase tracking-wider rounded-md flex items-center gap-1">
                  <Sparkles size={12} className="text-indigo-600" />
                  POPULAR STARTER
                </span>
                <span className="text-xs text-slate-400 font-semibold">14-Day Free Trial</span>
              </div>

              <div>
                <h3 className="text-2xl font-black text-slate-900">Essentials Growth</h3>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  For growing businesses needing automated welcome series and custom email designs.
                </p>
              </div>

              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-900">₹387.50</span>
                  <span className="text-xs text-slate-500">/mo for 12 mos</span>
                  <span className="text-xs text-slate-400 line-through">₹775</span>
                </div>
                <div className="text-[11px] text-amber-600 font-bold mt-0.5">Save 50% for 12 months • 14 Days Free</div>
              </div>

              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                  <CheckCircle2 size={16} className="text-indigo-600 flex-shrink-0" />
                  <span>Up to 500 contacts & 5,000 monthly sends</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                  <CheckCircle2 size={16} className="text-indigo-600 flex-shrink-0" />
                  <span>Automated customer journeys & welcome drips</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                  <CheckCircle2 size={16} className="text-indigo-600 flex-shrink-0" />
                  <span>24/7 Email & Live Chat Support</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => handleSelect('essentials')}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs sm:text-sm rounded-full transition shadow-md flex items-center justify-center gap-1.5"
            >
              <span>Try Essentials Free</span>
              <ArrowRight size={14} />
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};

export default SmallBusinessPlans;
