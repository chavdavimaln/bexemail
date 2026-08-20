import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Globe, Plus, Trash2, Edit2, ShieldCheck, CheckCircle2, XCircle, Star, RefreshCw, Power } from 'lucide-react';

export default function DomainManager({ customAlert }) {
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusInfo, setStatusInfo] = useState({
    planName: 'Free Plan',
    domainCount: 0,
    domainLimit: 1
  });

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [domainForm, setDomainForm] = useState({
    id: null,
    company_name: '',
    domain_name: '',
    support_email: '',
    is_primary: false
  });

  useEffect(() => {
    fetchDomainData();
  }, []);

  const fetchDomainData = async () => {
    setLoading(true);
    try {
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const headers = {
        'x-user-id': currentUser.id || currentUser.user_id || 1,
        'x-user-role': currentUser.role || 'Admin'
      };

      const [domRes, statusRes] = await Promise.all([
        axios.get('/api/domains', { headers }).catch(() => axios.get('http://localhost:5000/api/domains', { headers })).catch(() => ({ data: [] })),
        axios.get('/api/auth/system-limits-status', { headers }).catch(() => axios.get('http://localhost:5000/api/auth/system-limits-status', { headers })).catch(() => ({ data: null }))
      ]);

      const rawDomains = Array.isArray(domRes.data) ? domRes.data : (domRes.data?.data || []);
      setDomains(rawDomains);

      if (statusRes.data && statusRes.data.success) {
        setStatusInfo(statusRes.data);
      }
    } catch (err) {
      console.error('Fetch domains error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    if (domains.length >= statusInfo.domainLimit) {
      const alertFn = customAlert || alert;
      alertFn({
        title: 'Domain Quota Limit Reached',
        message: `Your current ${statusInfo.planName} allows a maximum of ${statusInfo.domainLimit} domain registration(s). Currently active: ${domains.length}. Upgrade your subscription plan to register additional multi-tenant domains.`,
        type: 'warning'
      });
      return;
    }
    setDomainForm({
      id: null,
      company_name: '',
      domain_name: '',
      support_email: '',
      is_primary: domains.length === 0
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (d) => {
    setDomainForm({
      id: d.id,
      company_name: d.company_name || '',
      domain_name: d.domain_name || '',
      support_email: d.support_email || '',
      is_primary: d.is_primary === 1 || d.is_primary === true
    });
    setShowModal(true);
  };

  const handleSaveDomain = async (e) => {
    e.preventDefault();
    if (!domainForm.company_name || !domainForm.domain_name) {
      const alertFn = customAlert || alert;
      alertFn({ title: 'Validation Error', message: 'Company Name and Domain Name are required.', type: 'warning' });
      return;
    }

    setSaving(true);
    try {
      if (domainForm.id) {
        await axios.put(`/api/domains/${domainForm.id}`, domainForm)
          .catch(() => axios.put(`http://localhost:5000/api/domains/${domainForm.id}`, domainForm));
      } else {
        await axios.post('/api/domains', domainForm)
          .catch(() => axios.post('http://localhost:5000/api/domains', domainForm));
      }

      setShowModal(false);
      fetchDomainData();
      const alertFn = customAlert || alert;
      alertFn({ title: 'Success', message: 'Domain registered successfully.', type: 'success' });
    } catch (error) {
      const alertFn = customAlert || alert;
      const errMsg = error.response?.data?.error || 'Failed to save domain registration';
      alertFn({ title: 'Domain Error', message: errMsg, type: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  const handleSetPrimary = async (domain) => {
    const targetDomain = typeof domain === 'object' ? domain : domains.find(d => d.id === domain);
    const domainId = targetDomain ? targetDomain.id : domain;
    const domainName = targetDomain ? (targetDomain.domain_name || targetDomain.company_name) : 'selected domain';

    // Optimistic UI state update: Set target domain to primary and unset all others immediately
    setDomains(prev => prev.map(d => ({
      ...d,
      is_primary: d.id === domainId ? 1 : 0
    })));

    try {
      await axios.put(`/api/domains/${domainId}/set-primary`)
        .catch(() => axios.put(`http://localhost:5000/api/domains/${domainId}/set-primary`));

      fetchDomainData();
      const alertFn = customAlert || alert;
      alertFn({
        title: 'Primary Domain Updated',
        message: `Domain configuration for "${domainName}" has been set as Primary for site/project routing.`,
        type: 'success'
      });
    } catch (err) {
      fetchDomainData();
      const alertFn = customAlert || alert;
      alertFn({ title: 'Error', message: err.response?.data?.error || 'Failed to set Primary Domain', type: 'danger' });
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      await axios.put(`/api/domains/${id}/toggle-status`)
        .catch(() => axios.put(`http://localhost:5000/api/domains/${id}/toggle-status`));
      fetchDomainData();
    } catch (err) {
      const alertFn = customAlert || alert;
      const errMsg = err.response?.data?.error || 'Failed to toggle domain status';
      alertFn({ title: 'Status Toggle Error', message: errMsg, type: 'danger' });
    }
  };

  const handleDeleteDomain = async (id, domainName) => {
    if (domains.length <= 1) {
      const alertFn = customAlert || alert;
      alertFn({ title: 'Action Prohibited', message: 'Cannot delete domain. At least one domain must remain registered in the system.', type: 'warning' });
      return;
    }

    const alertFn = customAlert || window.confirm;
    const confirmed = await alertFn({
      title: 'Delete Domain Registration',
      message: `Are you sure you want to remove domain '${domainName}' from your multi-tenant routing?`,
      confirmText: 'Delete Domain',
      type: 'danger'
    });

    if (confirmed || confirmed === undefined) {
      try {
        await axios.delete(`/api/domains/${id}`)
          .catch(() => axios.delete(`http://localhost:5000/api/domains/${id}`));
        fetchDomainData();
      } catch (err) {
        const alertFn = customAlert || alert;
        alertFn({ title: 'Error', message: err.response?.data?.error || 'Failed to delete domain', type: 'danger' });
      }
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden my-4">
      {/* Header */}
      <div className="p-6 border-b border-gray-100 flex flex-wrap justify-between items-center bg-white gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Globe className="text-primary-600" size={20} />
              <span>Multi-Tenant Domain Management</span>
            </h3>
            <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-primary-100 text-primary-700 rounded-md">
              LOCALHOST & LIVE SUPPORTED
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Current Plan: <strong className="text-primary-700 uppercase font-bold">{statusInfo.planName}</strong> &bull; Quota Limit: <strong>{domains.length} / {statusInfo.domainLimit} Registered Domains</strong>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={fetchDomainData} 
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50 transition"
            title="Refresh Domain List"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={handleOpenAddModal}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm ${
              domains.length >= statusInfo.domainLimit
                ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                : 'bg-primary-600 hover:bg-primary-700 text-white'
            }`}
          >
            <Plus size={15} /> Add Domain ({domains.length}/{statusInfo.domainLimit})
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs text-gray-700 min-w-[750px]">
          <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200 uppercase tracking-wider text-[11px]">
            <tr>
              <th className="px-6 py-3.5">Company & Domain</th>
              <th className="px-6 py-3.5">Support Email</th>
              <th className="px-6 py-3.5">Verification</th>
              <th className="px-6 py-3.5">Security Records</th>
              <th className="px-6 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-medium">
            {domains.map((d) => {
              const isPrimary = d.is_primary === 1 || d.is_primary === true;
              const isActive = d.status === 'active' || d.status === undefined;

              return (
                <tr key={d.id} className={`hover:bg-gray-50/60 transition ${!isActive ? 'opacity-60 bg-gray-50/30' : ''}`}>
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-900 text-sm flex items-center gap-2">
                      <span>{d.domain_name}</span>
                      {isPrimary && (
                        <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-2xs">
                          <Star size={10} className="fill-amber-600 text-amber-600" /> PRIMARY
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-gray-500">{d.company_name}</div>
                  </td>
                  <td className="px-6 py-4 font-mono text-gray-600">
                    {d.support_email || 'info@bexcodeservices.com'}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleToggleStatus(d.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition border ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'
                      }`}
                      title={isActive ? 'Click to Deactivate Domain' : 'Click to Activate Domain'}
                    >
                      <Power size={12} className={isActive ? 'text-emerald-600' : 'text-gray-500'} />
                      <span>{isActive ? 'Active / Verified' : 'Inactive'}</span>
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold">
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded">DKIM</span>
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded">SPF</span>
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded">DMARC</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {!isPrimary ? (
                        <button
                          onClick={() => handleSetPrimary(d)}
                          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-[11px] font-bold transition"
                          title="Set as Primary Project Domain"
                        >
                          Make Primary
                        </button>
                      ) : null}

                      <button
                        onClick={() => handleOpenEditModal(d)}
                        className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-gray-100 rounded-lg transition"
                        title="Edit Domain Registration"
                      >
                        <Edit2 size={14} />
                      </button>

                      <button
                        onClick={() => handleDeleteDomain(d.id, d.domain_name)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Delete Domain"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {domains.length === 0 && !loading && (
              <tr>
                <td colSpan="5" className="px-6 py-8 text-center text-gray-500 font-normal">
                  No domains registered. Click <strong>+ Add Domain</strong> to register a domain for your multi-tenant workspace.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Domain Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900">
              {domainForm.id ? 'Edit Domain Registration' : 'Register New Domain'}
            </h3>
            <p className="text-xs text-gray-500 mt-1">Configure multi-tenant custom domain routing</p>

            <form onSubmit={handleSaveDomain} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Company / Organization Name *</label>
                <input
                  type="text"
                  required
                  value={domainForm.company_name}
                  onChange={(e) => setDomainForm({ ...domainForm, company_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="e.g. Bexcode Services"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Domain Name (Hostname) *</label>
                <input
                  type="text"
                  required
                  value={domainForm.domain_name}
                  onChange={(e) => setDomainForm({ ...domainForm, domain_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none font-mono"
                  placeholder="e.g. bexcodeservices.com or localhost"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Support / Admin Email</label>
                <input
                  type="email"
                  value={domainForm.support_email}
                  onChange={(e) => setDomainForm({ ...domainForm, support_email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none font-mono"
                  placeholder="e.g. info@bexcodeservices.com"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="domainIsPrimary"
                  checked={domainForm.is_primary}
                  onChange={(e) => setDomainForm({ ...domainForm, is_primary: e.target.checked })}
                  className="rounded text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="domainIsPrimary" className="font-semibold text-gray-700">Set as Primary Project Domain</label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-xl font-bold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold transition shadow-sm"
                >
                  {saving ? 'Saving...' : 'Save Domain'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
