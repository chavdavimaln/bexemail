import React from 'react';
import { Shield, Award, Users, TrendingUp, Zap, CheckCircle2 } from 'lucide-react';

const TrustedIndustryLeader = () => {
  return (
    <div className="py-16 bg-slate-900 text-white border-t border-b border-slate-800 px-4 sm:px-6 lg:px-12">
      <div className="max-w-6xl mx-auto space-y-12">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <span className="px-3.5 py-1 bg-amber-400/20 text-amber-300 border border-amber-400/30 font-extrabold text-xs uppercase tracking-wider rounded-full inline-block">
            Trusted By 50,000+ Brands Worldwide
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Work with a trusted industry leader
          </h2>
          <p className="text-sm text-slate-300 font-medium">
            Join thousands of fast-growing e-commerce brands, agencies, and businesses leveraging BexEmail's high-speed SMTP infrastructure and AI automation workflows.
          </p>
        </div>

        {/* 4 Feature Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          <div className="bg-slate-800/80 p-6 rounded-2xl border border-slate-700 space-y-2 text-center">
            <div className="w-12 h-12 rounded-xl bg-amber-400/10 text-amber-400 flex items-center justify-center mx-auto mb-3">
              <TrendingUp size={26} />
            </div>
            <div className="text-3xl font-black text-white">24x ROI</div>
            <div className="text-xs text-slate-400 font-medium">Average return on investment reported by Standard users</div>
          </div>

          <div className="bg-slate-800/80 p-6 rounded-2xl border border-slate-700 space-y-2 text-center">
            <div className="w-12 h-12 rounded-xl bg-amber-400/10 text-amber-400 flex items-center justify-center mx-auto mb-3">
              <Shield size={26} />
            </div>
            <div className="text-3xl font-black text-white">99.9%</div>
            <div className="text-xs text-slate-400 font-medium">Guaranteed inbox deliverability & high uptime server SLA</div>
          </div>

          <div className="bg-slate-800/80 p-6 rounded-2xl border border-slate-700 space-y-2 text-center">
            <div className="w-12 h-12 rounded-xl bg-amber-400/10 text-amber-400 flex items-center justify-center mx-auto mb-3">
              <Zap size={26} />
            </div>
            <div className="text-3xl font-black text-white">100M+</div>
            <div className="text-xs text-slate-400 font-medium">High-speed marketing emails processed monthly</div>
          </div>

          <div className="bg-slate-800/80 p-6 rounded-2xl border border-slate-700 space-y-2 text-center">
            <div className="w-12 h-12 rounded-xl bg-amber-400/10 text-amber-400 flex items-center justify-center mx-auto mb-3">
              <Award size={26} />
            </div>
            <div className="text-3xl font-black text-white">24/7 Support</div>
            <div className="text-xs text-slate-400 font-medium">Dedicated support team & email experts available round the clock</div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default TrustedIndustryLeader;
