import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ShieldCheck, Plus, Trash2, Edit2, Send, Star, RefreshCw, AlertTriangle, CheckCircle2, XCircle, Power } from 'lucide-react';

export default function SmtpManager({ customAlert }) {
  const [senders, setSenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusInfo, setStatusInfo] = useState({
    planName: 'Free Plan',
    smtpCount: 0,
    smtpLimit: 1
  });

  const [showModal, setShowModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const [senderForm, setSenderForm] = useState({
    id: null,
    name: '',
    email: '',
    smtp_host: 'smtp.gmail.com',
    smtp_port: 587,
    smtp_user: '',
    smtp_pass: '',
    smtp_secure: 'tls',
    is_default: false
  });

  const [testPayload, setTestPayload] = useState({
    sender: null,
    test_email: 'vimal@bexcodeservices.com'
  });

  useEffect(() => {
    fetchSmtpData();
  }, []);

  const fetchSmtpData = async () => {
    setLoading(true);
    try {
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const headers = {
        'x-user-id': currentUser.id || currentUser.user_id || 1,
        'x-user-role': currentUser.role || 'Admin'
      };

      const [sendRes, statusRes] = await Promise.all([
        axios.get('/api/senders', { headers }).catch(() => axios.get('http://localhost:5000/api/senders', { headers })),
        axios.get('/api/auth/system-limits-status', { headers }).catch(() => axios.get('http://localhost:5000/api/auth/system-limits-status', { headers }))
      ]);

      const rawSenders = Array.isArray(sendRes.data) ? sendRes.data : (sendRes.data?.data || []);
      setSenders(rawSenders);

      if (statusRes.data && statusRes.data.success) {
        setStatusInfo(statusRes.data);
      }
    } catch (err) {
      console.error('Fetch SMTP senders error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    if (senders.length >= statusInfo.smtpLimit) {
      const alertFn = customAlert || alert;
      alertFn({
        title: 'SMTP Quota Limit Reached',
        message: `Your current ${statusInfo.planName} allows a maximum of ${statusInfo.smtpLimit} SMTP configuration(s). Currently active: ${senders.length}. Upgrade your subscription plan to add more SMTP servers.`,
        type: 'warning'
      });
      return;
    }
    setSenderForm({
      id: null,
      name: '',
      email: '',
      smtp_host: 'smtp.gmail.com',
      smtp_port: 587,
      smtp_user: '',
      smtp_pass: '',
      smtp_secure: 'tls',
      is_default: senders.length === 0
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (s) => {
    setSenderForm({
      id: s.id,
      name: s.name || '',
      email: s.email || '',
      smtp_host: s.smtp_host || 'smtp.gmail.com',
      smtp_port: s.smtp_port || 587,
      smtp_user: s.smtp_user || s.email || '',
      smtp_pass: '********',
      smtp_secure: s.smtp_secure || 'tls',
      is_default: s.is_default === 1 || s.is_default === true
    });
    setShowModal(true);
  };

  const handleSaveSender = async (e) => {
    e.preventDefault();
    if (!senderForm.name || !senderForm.email) {
      const alertFn = customAlert || alert;
      alertFn({ title: 'Validation Error', message: 'Name and Email address are required.', type: 'warning' });
      return;
    }

    setSaving(true);
    try {
      if (senderForm.id) {
        await axios.put(`/api/senders/${senderForm.id}`, senderForm)
          .catch(() => axios.put(`http://localhost:5000/api/senders/${senderForm.id}`, senderForm));
      } else {
        await axios.post('/api/senders', senderForm)
          .catch(() => axios.post('http://localhost:5000/api/senders', senderForm));
      }

      setShowModal(false);
      fetchSmtpData();
      const alertFn = customAlert || alert;
      alertFn({ title: 'Success', message: 'SMTP server configuration saved successfully.', type: 'success' });
    } catch (error) {
      const alertFn = customAlert || alert;
      const errMsg = error.response?.data?.error || 'Failed to save SMTP server configuration';
      alertFn({ title: 'SMTP Error', message: errMsg, type: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  const handleSetPrimary = async (sender) => {
    const targetSender = typeof sender === 'object' ? sender : senders.find(s => s.id === sender);
    const senderId = targetSender ? targetSender.id : sender;
    const senderEmail = targetSender ? (targetSender.email || targetSender.name) : 'selected sender';

    // Optimistic UI state update: Set target sender to primary and unset all others immediately
    setSenders(prev => prev.map(s => ({
      ...s,
      is_default: s.id === senderId ? 1 : 0
    })));

    try {
      await axios.put(`/api/senders/${senderId}/set-primary`)
        .catch(() => axios.put(`http://localhost:5000/api/senders/${senderId}/set-primary`));

      fetchSmtpData();
      const alertFn = customAlert || alert;
      alertFn({
        title: 'Primary SMTP Updated',
        message: `SMTP configuration for "${senderEmail}" has been set as Primary for mail dispatches.`,
        type: 'success'
      });
    } catch (err) {
      fetchSmtpData();
      const alertFn = customAlert || alert;
      alertFn({ title: 'Error', message: err.response?.data?.error || 'Failed to set Primary SMTP', type: 'danger' });
    }
  };

  const handleToggleStatus = async (id, currentIsActive) => {
    try {
      await axios.put(`/api/senders/${id}/toggle-status`)
        .catch(() => axios.put(`http://localhost:5000/api/senders/${id}/toggle-status`));
      fetchSmtpData();
    } catch (err) {
      const alertFn = customAlert || alert;
      const errMsg = err.response?.data?.error || 'Failed to toggle SMTP status';
      alertFn({ title: 'Status Toggle Error', message: errMsg, type: 'danger' });
    }
  };

  const handleDeleteSender = async (id, senderName) => {
    if (senders.length <= 1) {
      const alertFn = customAlert || alert;
      alertFn({ title: 'Action Prohibited', message: 'Cannot delete SMTP server. At least one SMTP configuration must remain in the system.', type: 'warning' });
      return;
    }

    const alertFn = customAlert || window.confirm;
    const confirmed = await alertFn({
      title: 'Delete SMTP Server Configuration',
      message: `Are you sure you want to delete SMTP configuration '${senderName}'?`,
      confirmText: 'Delete',
      type: 'danger'
    });

    if (confirmed || confirmed === undefined) {
      try {
        await axios.delete(`/api/senders/${id}`)
          .catch(() => axios.delete(`http://localhost:5000/api/senders/${id}`));
        fetchSmtpData();
      } catch (err) {
        const alertFn = customAlert || alert;
        alertFn({ title: 'Error', message: err.response?.data?.error || 'Failed to delete SMTP configuration', type: 'danger' });
      }
    }
  };

  const handleOpenTestModal = (s) => {
    setTestPayload({
      sender: s,
      test_email: 'vimal@bexcodeservices.com'
    });
    setShowTestModal(true);
  };

  const handleRunTest = async () => {
    if (!testPayload.test_email) return;
    setTesting(true);
    try {
      const senderId = testPayload.sender?.id || 'test';
      const res = await axios.post(`/api/senders/${senderId}/test`, {
        test_email: testPayload.test_email,
        smtp_host: testPayload.sender?.smtp_host,
        smtp_port: testPayload.sender?.smtp_port,
        smtp_user: testPayload.sender?.smtp_user || testPayload.sender?.email,
        smtp_pass: testPayload.sender?.smtp_pass,
        smtp_secure: testPayload.sender?.smtp_secure,
        email: testPayload.sender?.email,
        name: testPayload.sender?.name
      }).catch(() => axios.post(`http://localhost:5000/api/senders/${senderId}/test`, {
        test_email: testPayload.test_email,
        smtp_host: testPayload.sender?.smtp_host,
        smtp_port: testPayload.sender?.smtp_port,
        smtp_user: testPayload.sender?.smtp_user || testPayload.sender?.email,
        smtp_pass: testPayload.sender?.smtp_pass,
        smtp_secure: testPayload.sender?.smtp_secure,
        email: testPayload.sender?.email,
        name: testPayload.sender?.name
      }));

      setShowTestModal(false);
      const alertFn = customAlert || alert;
      alertFn({ title: 'Test Connection Success', message: res.data.message || 'Verification email dispatched successfully!', type: 'success' });
    } catch (err) {
      const alertFn = customAlert || alert;
      const errMsg = err.response?.data?.error || 'SMTP Test Connection Failed';
      alertFn({ title: 'SMTP Test Error', message: errMsg, type: 'danger' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden my-4">
      {/* Header */}
      <div className="p-6 border-b border-gray-100 flex flex-wrap justify-between items-center bg-white gap-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="text-primary-600" size={20} />
            <span>SMTP Server Configurations</span>
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Plan Quota: <strong className="text-primary-700 uppercase font-bold">{statusInfo.planName}</strong> &bull; Configured: <strong>{senders.length} / {statusInfo.smtpLimit} SMTP Servers</strong>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={fetchSmtpData} 
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50 transition"
            title="Refresh SMTP List"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={handleOpenAddModal}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm ${
              senders.length >= statusInfo.smtpLimit
                ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                : 'bg-primary-600 hover:bg-primary-700 text-white'
            }`}
          >
            <Plus size={15} /> Add SMTP Sender ({senders.length}/{statusInfo.smtpLimit})
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs text-gray-700 min-w-[750px]">
          <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200 uppercase tracking-wider text-[11px]">
            <tr>
              <th className="px-6 py-3.5">Sender Profile</th>
              <th className="px-6 py-3.5">SMTP Host & Port</th>
              <th className="px-6 py-3.5">SMTP Username</th>
              <th className="px-6 py-3.5">Security</th>
              <th className="px-6 py-3.5">Status</th>
              <th className="px-6 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-medium">
            {senders.map((s) => {
              const isPrimary = s.is_default === 1 || s.is_default === true;
              const isActive = s.is_active === 1 || s.is_active === undefined || s.status === 'active';

              return (
                <tr key={s.id} className={`hover:bg-gray-50/60 transition ${!isActive ? 'opacity-60 bg-gray-50/30' : ''}`}>
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-900 text-sm flex items-center gap-2">
                      <span>{s.name}</span>
                      {isPrimary && (
                        <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-2xs">
                          <Star size={10} className="fill-amber-600 text-amber-600" /> PRIMARY
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-gray-500 font-mono">{s.email}</div>
                  </td>
                  <td className="px-6 py-4 font-mono font-bold text-gray-700">
                    {s.smtp_host || 'smtp.gmail.com'}:{s.smtp_port || 587}
                  </td>
                  <td className="px-6 py-4 font-mono text-gray-600">
                    {s.smtp_user || s.email || '—'}
                  </td>
                  <td className="px-6 py-4 uppercase font-bold text-[10px]">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded font-mono">
                      {s.smtp_secure || 'tls'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleToggleStatus(s.id, isActive)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider transition border ${
                        isActive
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200'
                          : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'
                      }`}
                      title={isActive ? 'Click to Deactivate' : 'Click to Activate'}
                    >
                      <Power size={11} className={isActive ? 'text-emerald-700' : 'text-gray-500'} />
                      <span>{isActive ? 'Active' : 'Inactive'}</span>
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {!isPrimary ? (
                        <button
                          onClick={() => handleSetPrimary(s)}
                          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-[11px] font-bold transition"
                          title="Set as Primary Default SMTP Sender"
                        >
                          Make Primary
                        </button>
                      ) : null}

                      <button
                        onClick={() => handleOpenTestModal(s)}
                        className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-[11px] font-bold transition flex items-center gap-1"
                        title="Test Connection"
                      >
                        <Send size={11} /> Test Connection
                      </button>

                      <button
                        onClick={() => handleOpenEditModal(s)}
                        className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-gray-100 rounded-lg transition"
                        title="Edit SMTP Configuration"
                      >
                        <Edit2 size={14} />
                      </button>

                      <button
                        onClick={() => handleDeleteSender(s.id, s.name)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Delete Sender"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {senders.length === 0 && !loading && (
              <tr>
                <td colSpan="6" className="px-6 py-8 text-center text-gray-500 font-normal">
                  No SMTP configurations found. Click <strong>+ Add SMTP Sender</strong> to add custom server details.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit SMTP Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900">
              {senderForm.id ? 'Edit SMTP Configuration' : 'Add SMTP Sender Profile'}
            </h3>
            <p className="text-xs text-gray-500 mt-1">Configure outbound mail server for email blasts & transactional dispatches</p>

            <form onSubmit={handleSaveSender} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Sender Profile Name *</label>
                <input
                  type="text"
                  required
                  value={senderForm.name}
                  onChange={(e) => setSenderForm({ ...senderForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="e.g. Bexcode Marketing"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Sender From Email *</label>
                <input
                  type="email"
                  required
                  value={senderForm.email}
                  onChange={(e) => setSenderForm({ ...senderForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none font-mono"
                  placeholder="e.g. info@bexcodeservices.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">SMTP Host</label>
                  <input
                    type="text"
                    value={senderForm.smtp_host}
                    onChange={(e) => setSenderForm({ ...senderForm, smtp_host: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none font-mono"
                    placeholder="smtp.gmail.com"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Port</label>
                  <input
                    type="number"
                    value={senderForm.smtp_port}
                    onChange={(e) => setSenderForm({ ...senderForm, smtp_port: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none font-mono"
                    placeholder="587"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">SMTP Username</label>
                  <input
                    type="text"
                    value={senderForm.smtp_user}
                    onChange={(e) => setSenderForm({ ...senderForm, smtp_user: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none font-mono"
                    placeholder="user@example.com"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Security Mode</label>
                  <select
                    value={senderForm.smtp_secure}
                    onChange={(e) => setSenderForm({ ...senderForm, smtp_secure: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                  >
                    <option value="tls">TLS / STARTTLS (587)</option>
                    <option value="ssl">SSL / Direct (465)</option>
                    <option value="none">None (25)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">SMTP App Password</label>
                <input
                  type="password"
                  value={senderForm.smtp_pass}
                  onChange={(e) => setSenderForm({ ...senderForm, smtp_pass: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none font-mono"
                  placeholder="App password or leave unchanged"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="smtpIsDefault"
                  checked={senderForm.is_default}
                  onChange={(e) => setSenderForm({ ...senderForm, is_default: e.target.checked })}
                  className="rounded text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="smtpIsDefault" className="font-semibold text-gray-700">Set as Primary Default SMTP Sender</label>
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
                  {saving ? 'Saving...' : 'Save SMTP Config'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Test Connection Modal */}
      {showTestModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Test SMTP Connection</h3>
            <p className="text-xs text-gray-500">Send a test verification email via {testPayload.sender?.name}</p>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Target Recipient Email *</label>
              <input
                type="email"
                required
                value={testPayload.test_email}
                onChange={(e) => setTestPayload({ ...testPayload, test_email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-xs font-mono"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowTestModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-xl font-bold text-gray-600 hover:bg-gray-50 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRunTest}
                disabled={testing}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition shadow-sm"
              >
                {testing ? 'Testing Connection...' : 'Send Test Email'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
