import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Mail, Globe, ArrowRight, X } from 'lucide-react';
import axios from 'axios';

const RedlineAlertBanner = () => {
  const [status, setStatus] = useState({
    hasSmtp: true,
    hasDomain: true,
    smtpCount: 1,
    smtpLimit: 5,
    domainCount: 1,
    domainLimit: 5,
    planName: ''
  });
  const [loading, setLoading] = useState(true);
  const [dismissedSmtp, setDismissedSmtp] = useState(false);
  const [dismissedDomain, setDismissedDomain] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const headers = {
        'x-user-id': currentUser.id,
        'x-user-role': currentUser.role
      };

      const [statusRes, sendersRes, domainsRes] = await Promise.all([
        axios.get('/api/auth/system-limits-status', { headers }).catch(() => axios.get('http://localhost:5000/api/auth/system-limits-status', { headers })).catch(() => ({ data: null })),
        axios.get('/api/senders', { headers }).catch(() => axios.get('http://localhost:5000/api/senders', { headers })).catch(() => ({ data: [] })),
        axios.get('/api/domains', { headers }).catch(() => axios.get('http://localhost:5000/api/domains', { headers })).catch(() => ({ data: [] }))
      ]);

      const senders = Array.isArray(sendersRes.data) ? sendersRes.data : (sendersRes.data?.data || []);
      const domains = Array.isArray(domainsRes.data) ? domainsRes.data : (domainsRes.data?.data || []);

      const apiStatus = statusRes.data || {};
      const hasSmtp = senders.length > 0 || Boolean(apiStatus.hasSmtp);
      const hasDomain = domains.length > 0 || Boolean(apiStatus.hasDomain);

      setStatus({
        success: true,
        planCode: apiStatus.planCode || 'free',
        planName: apiStatus.planName || 'Free Plan',
        hasSmtp,
        smtpCount: senders.length || apiStatus.smtpCount || 0,
        smtpLimit: apiStatus.smtpLimit || 1,
        hasDomain,
        domainCount: domains.length || apiStatus.domainCount || 0,
        domainLimit: apiStatus.domainLimit || 1,
        adminCount: apiStatus.adminCount || 1,
        adminLimit: apiStatus.adminLimit || 1
      });
    } catch (err) {
      console.error('Error fetching limit status in RedlineAlertBanner:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();

    const handleUpdate = () => {
      fetchStatus();
    };

    window.addEventListener('smtpUpdated', handleUpdate);
    window.addEventListener('domainUpdated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('smtpUpdated', handleUpdate);
      window.removeEventListener('domainUpdated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [fetchStatus]);

  if (loading) return null;

  const showSmtpBanner = !status.hasSmtp && !dismissedSmtp;
  const showDomainBanner = !status.hasDomain && !dismissedDomain;

  if (!showSmtpBanner && !showDomainBanner) return null;

  return (
    <div className="space-y-3 mb-6 animate-in fade-in duration-300">
      
      {/* 1. SMTP Missing Redline Banner */}
      {showSmtpBanner && (
        <div className="relative overflow-hidden bg-rose-50 border-l-4 border-rose-600 rounded-xl p-4 shadow-sm border border-rose-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-rose-100 text-rose-700 rounded-lg flex-shrink-0 mt-0.5 sm:mt-0">
              <Mail size={20} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white rounded-md">
                  Action Required
                </span>
                <h4 className="text-xs sm:text-sm font-extrabold text-rose-950">
                  SMTP Configuration Missing
                </h4>
              </div>
              <p className="text-xs text-rose-700 font-bold mt-1">
                register or add the smtp for sending email campaign
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
            <Link
              to="/settings/system"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl shadow-xs transition transform active:scale-95"
            >
              <span>+ Add SMTP Sender</span>
              <ArrowRight size={14} />
            </Link>
            <button
              onClick={() => setDismissedSmtp(true)}
              className="p-1.5 text-rose-400 hover:text-rose-700 hover:bg-rose-100 rounded-lg transition"
              title="Dismiss warning"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* 2. Domain Missing Redline Banner */}
      {showDomainBanner && (
        <div className="relative overflow-hidden bg-red-50 border-l-4 border-red-600 rounded-xl p-4 shadow-sm border border-red-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-red-100 text-red-700 rounded-lg flex-shrink-0 mt-0.5 sm:mt-0">
              <Globe size={20} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-red-600 text-white rounded-md">
                  Action Required
                </span>
                <h4 className="text-xs sm:text-sm font-extrabold text-red-950">
                  Domain Registration Required
                </h4>
              </div>
              <p className="text-xs text-red-700 font-bold mt-1">
                register the domain
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
            <Link
              to="/settings/system"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-black rounded-xl shadow-xs transition transform active:scale-95"
            >
              <span>+ Register Domain</span>
              <ArrowRight size={14} />
            </Link>
            <button
              onClick={() => setDismissedDomain(true)}
              className="p-1.5 text-red-400 hover:text-red-700 hover:bg-red-100 rounded-lg transition"
              title="Dismiss warning"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default RedlineAlertBanner;
