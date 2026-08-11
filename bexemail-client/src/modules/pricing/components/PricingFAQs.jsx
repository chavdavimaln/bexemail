import React, { useState } from 'react';
import { ChevronDown, HelpCircle, ShieldCheck } from 'lucide-react';

const PricingFAQs = () => {
  const [openIdx, setOpenIdx] = useState(0);

  const faqs = [
    {
      q: 'How does the 14-day free trial work?',
      a: 'When you sign up for a 14-day free trial on our Standard or Essentials plans, you get full access to all features—including Generative AI, automations, and premium templates. No credit card is required to begin. You can test-drive campaigns risk-free for 14 full days.'
    },
    {
      q: 'What happens when my 14-day free trial ends?',
      a: 'At the end of your 14-day trial, you can choose to subscribe to a paid plan to keep enjoying premium features, or automatically downgrade to our Free plan (up to 350 contacts) with zero penalty or loss of contact data.'
    },
    {
      q: 'Can I change or cancel my plan at any time?',
      a: 'Yes, absolutely! You can upgrade, downgrade, or cancel your subscription at any time directly from your Profile & Settings menu inside the dashboard. Changes take effect immediately.'
    },
    {
      q: 'What is included in the 50% discount offer?',
      a: 'Our "Save 50%" promotion applies a full 50% discount off the standard monthly price for your first 12 consecutive months of subscription. It applies to Standard, Essentials, and Premium tier upgrades.'
    },
    {
      q: 'Are there any hidden setup fees or overage charges?',
      a: 'No hidden setup fees! If your audience grows beyond your plan’s contact tier or monthly email send limit, we will notify you before applying any small pro-rated overage rate or giving you the option to upgrade to the next tier.'
    }
  ];

  return (
    <div id="faqs" className="py-16 bg-white px-4 sm:px-6 lg:px-12 border-t border-slate-200">
      <div className="max-w-4xl mx-auto space-y-10">
        
        {/* Header */}
        <div className="text-center space-y-3">
          <span className="px-3.5 py-1 bg-slate-100 text-slate-700 font-extrabold text-xs uppercase tracking-wider rounded-full inline-block">
            Clear & Transparent
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-sm text-slate-600 font-medium max-w-xl mx-auto">
            Got questions about our pricing plans, trial periods, or feature limits? Here are answers to common questions.
          </p>
        </div>

        {/* Accordion List */}
        <div className="space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div
                key={idx}
                className={`rounded-2xl border transition-all overflow-hidden ${
                  isOpen ? 'border-amber-400 bg-amber-50/20 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <button
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-slate-900 text-sm sm:text-base cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <HelpCircle size={20} className={isOpen ? 'text-amber-500' : 'text-slate-400'} />
                    <span>{faq.q}</span>
                  </div>
                  <ChevronDown
                    size={18}
                    className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-amber-500' : ''}`}
                  />
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-600 font-medium leading-relaxed border-t border-slate-100/60 ml-9">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
};

export default PricingFAQs;
