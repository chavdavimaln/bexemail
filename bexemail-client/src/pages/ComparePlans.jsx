import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X, ArrowLeft, Sparkles, HelpCircle, ShieldCheck } from 'lucide-react';

const ComparePlans = () => {
  const navigate = useNavigate();

  const matrixCategories = [
    {
      title: 'Core Plan Specifications (PDF Specs)',
      features: [
        { name: 'Monthly Price', free: '0/month', essentials: '300/mo for 12 mos\n(Then ₹550/mo)', standard: '525/mo for 12 mos\n(Then ₹800/mo)', premium: '10,000/mo for 12 mos\n(Then ₹15,000/mo)' },
        { name: 'Role-based Access', free: '1 Seat - admin only', essentials: '3 Seats (admin/associates)', standard: '5 Seats (admin/associates)', premium: '10 role (admin/associates)' },
        { name: 'Maximum Contact Count', free: 'Up to 250 contacts', essentials: 'Up to 50,000 contacts ($300/mo tier)', standard: 'Up to 100,000 contacts ($800/mo tier)', premium: 'Contact us for a custom plan' },
        { name: 'Monthly Email Sending Limit', free: '1,000 / mo', essentials: '5,000 / mo', standard: '6,000 / mo', premium: '150,000 / mo' }
      ]
    },
    {
      title: 'AI & Automation Tools',
      features: [
        { name: 'Generative AI Content Copywriter', free: false, essentials: 'Basic', standard: 'Advanced (Generative)', premium: 'Custom Enterprise AI' },
        { name: 'Customer Journey Automation Builder', free: '1 Step', essentials: 'Multi-step', standard: 'Enhanced (Multivariate)', premium: 'Unlimited Workflows' },
        { name: 'Send Time Optimization', free: false, essentials: false, standard: true, premium: true },
        { name: 'Audience Growth & Conversion Analytics', free: 'Standard', essentials: 'Standard', standard: 'Actionable Insights', premium: 'Custom Dashboards' }
      ]
    },
    {
      title: 'Templates & Branding',
      features: [
        { name: 'Pre-built Email Templates', free: true, essentials: true, standard: true, premium: true },
        { name: 'Custom-Coded HTML/CSS Templates', free: false, essentials: false, standard: true, premium: true },
        { name: 'Customizable Popup Capture Forms', free: 'Basic', essentials: 'Basic', standard: 'Customizable', premium: 'Unlimited Custom' },
        { name: 'Remove BexEmail Footer Branding', free: false, essentials: true, standard: true, premium: true }
      ]
    },
    {
      title: 'Deliverability & Support',
      features: [
        { name: 'Dedicated IP Address Option', free: false, essentials: false, standard: false, premium: true },
        { name: 'Custom DKIM & Domain Verification', free: false, essentials: true, standard: true, premium: true },
        { name: '24/7 Email Support', free: true, essentials: true, standard: true, premium: true },
        { name: '24/7 Live Chat Support', free: false, essentials: true, standard: true, premium: true },
        { name: 'Priority Phone Support', free: false, essentials: false, standard: false, premium: true }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20">
      
      {/* Top Header */}
      <div className="bg-slate-900 text-white py-4 px-6 sm:px-12 flex items-center justify-between border-b border-slate-800">
        <button
          onClick={() => navigate('/pricing')}
          className="flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-white transition"
        >
          <ArrowLeft size={16} />
          <span>Back to Pricing Plans</span>
        </button>

        <div className="text-xs font-black text-amber-400">
          Compare All Marketing Plans
        </div>

        <button
          onClick={() => navigate('/register?plan=standard')}
          className="px-4 py-1.5 bg-amber-400 hover:bg-amber-500 text-slate-900 font-black text-xs rounded-full transition"
        >
          Register CRM Account
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 pt-12 space-y-10">
        
        {/* Title */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <span className="px-3 py-1 bg-amber-100 text-amber-900 font-extrabold text-xs uppercase tracking-wider rounded-full inline-block">
            Full Plan Matrix
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">
            Compare BexEmail Marketing Plans
          </h1>
          <p className="text-sm text-slate-600 font-medium">
            Explore detailed feature breakdowns across our Premium, Standard, Essentials, and Free tiers.
          </p>
        </div>

        {/* Sticky Header Table */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              
              {/* Table Column Headers */}
              <thead>
                <tr className="bg-slate-900 text-white border-b border-slate-800">
                  <th className="p-4 sm:p-6 w-1/3 text-sm font-black">Plan Specifications</th>
                  <th className="p-4 sm:p-6 text-center">
                    <div className="font-extrabold text-xs text-slate-300">Free</div>
                    <div className="text-base font-black text-white">0/month</div>
                    <div className="text-[10px] text-slate-400 mt-1">1 Seat (admin only)</div>
                  </th>
                  <th className="p-4 sm:p-6 text-center">
                    <div className="font-extrabold text-xs text-indigo-300">Essentials</div>
                    <div className="text-base font-black text-white">300/mo</div>
                    <div className="text-[10px] text-slate-400 mt-1">3 Seats (admin/assoc)</div>
                  </th>
                  <th className="p-4 sm:p-6 text-center bg-slate-800 border-x border-slate-700">
                    <span className="px-2 py-0.5 bg-amber-400 text-slate-900 font-black text-[9px] uppercase tracking-wider rounded">RECOMMENDED</span>
                    <div className="text-base font-black text-white mt-1">Standard</div>
                    <div className="text-[10px] text-amber-300">525/mo (5 Seats)</div>
                  </th>
                  <th className="p-4 sm:p-6 text-center">
                    <div className="font-extrabold text-xs text-amber-400">Premium</div>
                    <div className="text-base font-black text-white">10,000/mo</div>
                    <div className="text-[10px] text-slate-400 mt-1">10 role (admin/assoc)</div>
                  </th>
                </tr>
              </thead>

              {/* Table Body Categories */}
              <tbody>
                {matrixCategories.map((cat, catIdx) => (
                  <React.Fragment key={catIdx}>
                    <tr className="bg-slate-100/90 font-black text-slate-900 border-y border-slate-200">
                      <td colSpan={5} className="px-6 py-3 text-xs uppercase tracking-wider text-slate-700 bg-slate-200/60">
                        {cat.title}
                      </td>
                    </tr>

                    {cat.features.map((feat, featIdx) => (
                      <tr key={featIdx} className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors">
                        <td className="px-6 py-4 font-extrabold text-slate-800 flex items-center gap-2">
                          <span>{feat.name}</span>
                        </td>

                        <td className="px-4 py-4 text-center font-medium text-slate-700">
                          {typeof feat.free === 'boolean' ? (
                            feat.free ? <Check size={18} className="text-emerald-600 mx-auto" /> : <X size={16} className="text-slate-300 mx-auto" />
                          ) : feat.free}
                        </td>

                        <td className="px-4 py-4 text-center font-medium text-slate-700">
                          {typeof feat.essentials === 'boolean' ? (
                            feat.essentials ? <Check size={18} className="text-emerald-600 mx-auto" /> : <X size={16} className="text-slate-300 mx-auto" />
                          ) : feat.essentials}
                        </td>

                        <td className="px-4 py-4 text-center font-bold text-slate-900 bg-amber-50/30 border-x border-slate-200">
                          {typeof feat.standard === 'boolean' ? (
                            feat.standard ? <Check size={18} className="text-emerald-600 mx-auto stroke-[3]" /> : <X size={16} className="text-slate-300 mx-auto" />
                          ) : feat.standard}
                        </td>

                        <td className="px-4 py-4 text-center font-medium text-slate-700">
                          {typeof feat.premium === 'boolean' ? (
                            feat.premium ? <Check size={18} className="text-emerald-600 mx-auto" /> : <X size={16} className="text-slate-300 mx-auto" />
                          ) : feat.premium}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>

            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ComparePlans;
