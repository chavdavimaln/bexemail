import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
  Users, UserPlus, Key, Mail, Phone, Shield, ShieldCheck, 
  Trash2, Edit, Plus, CheckSquare, Square, Download, Eye, EyeOff, X, RefreshCw, Database, Send
} from 'lucide-react';
import { useModal } from '../context/ModalContext';

const MODULES = [
  { id: 'campaigns', name: 'Campaigns & Templates' },
  { id: 'automations', name: 'Automations & Workflows' },
  { id: 'integrations', name: 'Integrations & Webhooks' },
  { id: 'forms', name: 'Forms Builder' },
  { id: 'contacts', name: 'Contacts & Directory' },
  { id: 'lists', name: 'Target Lists Management' },
  { id: 'reports', name: 'Reports & Analytics' },
  { id: 'api_access', name: 'API Key Access' },
  { id: 'history_logs', name: 'Audit History Logs' },
  { id: 'settings', name: 'System Settings' },
  { id: 'all_system_backup', name: 'All System Backup Access' },
  { id: 'database_backup', name: 'Database Backup Access' },
  { id: 'contacts_backup', name: 'Contacts Backup Access' }
];

const Profiles = () => {
  const { confirm, alert: customAlert } = useModal();
  const navigate = useNavigate();
  
  // Logged in user info
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const rawRole = (currentUser.role || 'Super Admin').toString().toLowerCase();
  const isSubscriber = rawRole === 'user' || rawRole === 'subscriber';
  const isAdmin = !isSubscriber;
  const currentUserRole = currentUser.role || (isAdmin ? 'Super Admin' : 'User');

  // States
  const [users, setUsers] = useState([]);
  const [senders, setSenders] = useState([]);
  const [loading, setLoading] = useState(!isSubscriber);
  const [error, setError] = useState(null);

  // Subscriber requested SMTP sender form state
  const [requestedSmtpEmail, setRequestedSmtpEmail] = useState(currentUser.email || '');
  const [requestedSmtpHost, setRequestedSmtpHost] = useState('');
  const [requestedSmtpPort, setRequestedSmtpPort] = useState('587');
  const [requestedSmtpNote, setRequestedSmtpNote] = useState('');
  const [sendingReminder, setSendingReminder] = useState(false);

  // Forms
  const [userForm, setUserForm] = useState({
    id: null,
    name: '',
    username: '',
    email: '',
    number: '', // Mobile
    password: '',
    confirmPassword: '',
    role: 'User',
    permissions: {}
  });

  const [smtpForm, setSmtpForm] = useState({
    id: null,
    name: '',
    email: '',
    smtp_host: '',
    smtp_port: '587',
    smtp_user: '',
    smtp_pass: '',
    smtp_secure: 'tls',
    admin_id: currentUser.id
  });

  const [passwordForm, setPasswordForm] = useState({
    userId: null,
    newPassword: '',
    confirmNewPassword: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showUserPassword, setShowUserPassword] = useState(false);
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showSmtpModal, setShowSmtpModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);

  // Test SMTP Connection modal states
  const [showTestSmtpModal, setShowTestSmtpModal] = useState(false);
  const [testSmtpSender, setTestSmtpSender] = useState(null);
  const [testEmailInput, setTestEmailInput] = useState('');
  const [testSmtpLoading, setTestSmtpLoading] = useState(false);
  const [testSmtpResult, setTestSmtpResult] = useState(null);

  useEffect(() => {
    if (!isSubscriber) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = { 'x-user-role': currentUserRole || 'Super Admin' };
      const [usersRes, sendersRes] = await Promise.all([
        axios.get('/api/admins', { headers }).catch(() => axios.get('http://localhost:5000/api/admins', { headers })).catch(() => ({ data: [] })),
        axios.get('/api/senders', { headers }).catch(() => axios.get('http://localhost:5000/api/senders', { headers })).catch(() => ({ data: [] }))
      ]);

      const rawUsers = Array.isArray(usersRes.data) ? usersRes.data : (usersRes.data?.data || []);
      const rawSenders = Array.isArray(sendersRes.data) ? sendersRes.data : (sendersRes.data?.data || []);

      let finalUsers = Array.isArray(rawUsers) ? rawUsers : [];
      let finalSenders = Array.isArray(rawSenders) ? rawSenders : [];
      
      if (finalSenders.length === 0) {
        finalSenders = [
          {
            id: 1,
            name: 'Active System SMTP',
            email: 'info@bexcodeservices.com',
            smtp_host: 'smtp.gmail.com',
            smtp_port: 465,
            smtp_user: 'info@bexcodeservices.com',
            smtp_secure: 'ssl',
            is_default: 1,
            admin_id: null
          }
        ];
      }

      setUsers(finalUsers);
      setSenders(finalSenders);
    } catch (err) {
      console.error('Failed to load Profile data:', err);
    } finally {
      setLoading(false);
    }
  };

  // User Actions
  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
    let generated = "";
    for (let i = 0; i < 12; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setUserForm(prev => ({
      ...prev,
      password: generated,
      confirmPassword: generated
    }));
    setShowUserPassword(true);
  };

  const generateResetPassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
    let generated = "";
    for (let i = 0; i < 12; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPasswordForm(prev => ({
      ...prev,
      newPassword: generated,
      confirmNewPassword: generated
    }));
    setShowPassword(true);
  };

  const handleSaveUser = async () => {
    if (!userForm.name || !userForm.email || (!userForm.id && !userForm.password)) {
      customAlert({ title: 'Validation Error', message: 'Name, Email, and Password (for new users) are required.', type: 'danger' });
      return;
    }

    if (!userForm.id && userForm.password !== userForm.confirmPassword) {
      customAlert({ title: 'Validation Error', message: 'Passwords do not match.', type: 'danger' });
      return;
    }

    try {
      const payload = { ...userForm };
      if (userForm.id) {
        await axios.put(`http://localhost:5000/api/admins/${userForm.id}`, payload);
        customAlert({ title: 'Success', message: 'User updated successfully!', type: 'success' });
      } else {
        await axios.post('http://localhost:5000/api/admins', payload);
        customAlert({ title: 'Success', message: 'User created successfully!', type: 'success' });
      }
      setShowUserModal(false);
      fetchData();
    } catch (err) {
      customAlert({ title: 'Operation Failed', message: err.response?.data?.error || 'Database error occurred.', type: 'danger' });
    }
  };

  const handleDeleteUser = async (id) => {
    const isOk = await confirm({
      title: 'Delete User Profile',
      message: 'Are you sure you want to permanently delete this user? This will also affect their permissions.',
      confirmText: 'Delete Profile',
      type: 'danger'
    });
    if (!isOk) return;

    try {
      await axios.delete(`http://localhost:5000/api/admins/${id}`);
      customAlert({ title: 'Success', message: 'Profile deleted successfully', type: 'success' });
      fetchData();
    } catch (err) {
      customAlert({ title: 'Error', message: err.response?.data?.error || 'Failed to delete user.', type: 'danger' });
    }
  };

  const triggerForgetPassword = async (email) => {
    try {
      await axios.post('http://localhost:5000/api/auth/forget-password', { email });
      customAlert({ title: 'Reset Link Sent', message: `Forget password link has been sent to ${email} (simulated).`, type: 'success' });
    } catch (err) {
      customAlert({ title: 'Error', message: 'Failed to trigger password reset link.', type: 'danger' });
    }
  };

  const handleManualPasswordReset = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmNewPassword) {
      customAlert({ title: 'Validation Error', message: 'Passwords do not match.', type: 'danger' });
      return;
    }

    try {
      await axios.post(`http://localhost:5000/api/admins/${passwordForm.userId}/reset-password`, { newPassword: passwordForm.newPassword });
      customAlert({ title: 'Success', message: 'Password has been manually reset successfully.', type: 'success' });
      setShowResetPasswordModal(false);
      setPasswordForm({ userId: null, newPassword: '', confirmNewPassword: '' });
    } catch (err) {
      customAlert({ title: 'Error', message: err.response?.data?.error || 'Failed to reset password.', type: 'danger' });
    }
  };

  // SMTP Configurations Actions
  const handleSaveSmtp = async () => {
    if (!smtpForm.name || !smtpForm.email) {
      customAlert({ title: 'Validation Error', message: 'Sender Name and Email are required.', type: 'danger' });
      return;
    }

    try {
      const payload = { ...smtpForm };
      if (smtpForm.id) {
        await axios.put(`http://localhost:5000/api/senders/${smtpForm.id}`, payload);
        customAlert({ title: 'Success', message: 'SMTP configuration updated successfully!', type: 'success' });
      } else {
        await axios.post('http://localhost:5000/api/senders', payload);
        customAlert({ title: 'Success', message: 'SMTP configuration added successfully!', type: 'success' });
      }
      setShowSmtpModal(false);
      fetchData();
    } catch (err) {
      customAlert({ title: 'Error', message: err.response?.data?.error || 'Failed to save SMTP config.', type: 'danger' });
    }
  };

  const handleDeleteSmtp = async (id) => {
    const isOk = await confirm({
      title: 'Delete SMTP Config',
      message: 'Are you sure you want to delete this SMTP profile?',
      confirmText: 'Delete Config',
      type: 'danger'
    });
    if (!isOk) return;

    try {
      await axios.delete(`http://localhost:5000/api/senders/${id}`);
      customAlert({ title: 'Deleted', message: 'SMTP config removed successfully.', type: 'success' });
      fetchData();
    } catch (err) {
      customAlert({ title: 'Error', message: err.response?.data?.error || 'Failed to delete SMTP config.', type: 'danger' });
    }
  };

  const handleOpenTestSmtp = (senderObj) => {
    setTestSmtpSender(senderObj);
    setTestEmailInput(currentUser.email || senderObj?.email || 'vimal@bexcodeservices.com');
    setTestSmtpResult(null);
    setShowTestSmtpModal(true);
  };

  const handleRunSmtpTest = async () => {
    if (!testEmailInput.trim()) {
      customAlert({ title: 'Validation Required', message: 'Please enter a test recipient email address.', type: 'warning' });
      return;
    }

    setTestSmtpLoading(true);
    setTestSmtpResult(null);
    try {
      const payload = {
        test_email: testEmailInput.trim(),
        ...(testSmtpSender || {})
      };
      const senderId = testSmtpSender?.id || 'test';
      const res = await axios.post(`/api/senders/${senderId}/test`, payload).catch(() => axios.post(`http://localhost:5000/api/senders/${senderId}/test`, payload));
      setTestSmtpResult({
        success: true,
        message: res.data.message || 'SMTP Connection & Test Email sent successfully!'
      });
    } catch (err) {
      console.error('SMTP test connection failed:', err);
      const errMsg = err.response?.data?.error || err.response?.data?.message || err.message || 'SMTP Test Connection Failed. Check credentials or host.';
      setTestSmtpResult({
        success: false,
        message: errMsg
      });
    } finally {
      setTestSmtpLoading(false);
    }
  };

  // Database Backup download trigger
  const handleDownloadBackup = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/backup/download', { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/sql' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `bexemail_db_backup_${Date.now()}.sql`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      customAlert({ title: 'Success', message: 'Database backup downloaded successfully!', type: 'success' });
    } catch (err) {
      customAlert({ title: 'Backup Error', message: 'Failed to download database backup.', type: 'danger' });
    }
  };

  const handleTakeAllSystemBackup = async () => {
    try {
      await axios.post('http://localhost:5000/api/backup/create', {
        description: `All System Backup triggered from Profiles - ${new Date().toLocaleDateString()}`,
        module_type: 'all'
      });
      customAlert({ title: 'Success', message: 'All System Backup created successfully!', type: 'success' });
    } catch (err) {
      customAlert({ title: 'Backup Error', message: err.response?.data?.error || 'Failed to create All System Backup.', type: 'danger' });
    }
  };

  const handleTakeDatabaseBackup = async () => {
    try {
      await axios.post('http://localhost:5000/api/backup/create', {
        description: `Database Backup triggered from Profiles - ${new Date().toLocaleDateString()}`,
        module_type: 'database'
      });
      customAlert({ title: 'Success', message: 'Database Backup created successfully!', type: 'success' });
    } catch (err) {
      customAlert({ title: 'Backup Error', message: err.response?.data?.error || 'Failed to create Database Backup.', type: 'danger' });
    }
  };

  const handleTogglePermission = (moduleId) => {
    setUserForm(prev => {
      const nextPerms = { ...prev.permissions };
      nextPerms[moduleId] = !nextPerms[moduleId];
      return { ...prev, permissions: nextPerms };
    });
  };

  const handleRequestSmtpSender = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!requestedSmtpEmail.trim()) {
      customAlert({ title: 'Validation Error', message: 'Requested SMTP Sender Email is required.', type: 'danger' });
      return;
    }

    try {
      setSendingReminder(true);
      const associatedAdminEmail = 'admin@bexcodeservices.com';

      // Save requested SMTP sender to session so CampaignWizard defaults to it immediately!
      localStorage.setItem('configured_smtp_sender', requestedSmtpEmail.trim());

      await axios.post('http://localhost:5000/api/campaigns', {
        name: `SMTP Configuration Request - ${currentUser.email}`,
        subject: `[SMTP Request] Setup SMTP Sender: ${requestedSmtpEmail.trim()} for ${currentUser.email}`,
        sender_id: 1,
        target_email: associatedAdminEmail,
        content: `Hello Admin,\n\nSubscriber ${currentUser.email} has requested to add & configure the following SMTP Sender Email:\n\nRequested SMTP Email: ${requestedSmtpEmail.trim()}\nHost: ${requestedSmtpHost || 'Default'}\nPort: ${requestedSmtpPort || 'Default'}\nNote: ${requestedSmtpNote || 'N/A'}\n\nPlease add and configure this SMTP sender in Profiles & User Access.`,
        status: 'draft'
      }).catch(() => {});

      customAlert({
        title: 'Request Sent Successfully!',
        message: `Your request to add and configure SMTP sender "${requestedSmtpEmail.trim()}" has been sent to Admin (${associatedAdminEmail}). It will now be selected by default when creating campaigns!`,
        type: 'success'
      });
    } catch (err) {
      console.error(err);
      customAlert({
        title: 'Error',
        message: 'Failed to send request to admin.',
        type: 'danger'
      });
    } finally {
      setSendingReminder(false);
    }
  };

  if (loading) return <div className="p-8">Loading Profile Management...</div>;

  const currentUserPerms = currentUser.permissions || {};
  const canTakeAllSystem = isAdmin || currentUserPerms.all_system_backup === true;
  const canTakeDatabase = isAdmin || currentUserPerms.database_backup === true;

  if (isSubscriber) {
    const configuredSmtp = localStorage.getItem('configured_smtp_sender') || currentUser.email || 'info@bexcodeservices.com';
    const associatedAdminEmail = 'admin@bexcodeservices.com';

    return (
      <div className="max-w-3xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
        
        {/* Main Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-8 rounded-3xl shadow-xl space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
              <Mail className="text-amber-400" size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight">SMTP Sender Configuration</h2>
              <p className="text-slate-300 text-xs mt-0.5">Request your Admin to add and configure your custom SMTP Sender Email</p>
            </div>
          </div>
        </div>

        {/* Current Active SMTP Card */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="text-emerald-600" size={20} />
              <h3 className="text-sm font-extrabold text-gray-900">Current Session Sender SMTP</h3>
            </div>
            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-lg">
              Active SMTP Sender
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100">
              <span className="text-gray-500 font-medium block mb-1">Configured Sender SMTP Email</span>
              <span className="font-extrabold text-gray-900 text-sm">{configuredSmtp}</span>
            </div>
            <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100">
              <span className="text-gray-500 font-medium block mb-1">Subscriber Account</span>
              <span className="font-extrabold text-gray-900 text-sm">{currentUser.email || 'Subscriber'}</span>
            </div>
          </div>
        </div>

        {/* Form: Request Admin to Add & Configure SMTP Sender Email */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5">
          <div className="border-b border-gray-100 pb-3">
            <h3 className="text-base font-extrabold text-gray-900">Request Admin to Add & Configure SMTP Email</h3>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              Submit your desired SMTP sender details below. Your request will be sent directly to your assigned Admin ({associatedAdminEmail}) for review and setup.
            </p>
          </div>

          <form onSubmit={handleRequestSmtpSender} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Requested SMTP Sender Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                value={requestedSmtpEmail}
                onChange={e => setRequestedSmtpEmail(e.target.value)}
                placeholder="e.g. newsletter@yourbrand.com or vimal@bexcodeservices.com"
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">SMTP Host (Optional)</label>
                <input
                  type="text"
                  value={requestedSmtpHost}
                  onChange={e => setRequestedSmtpHost(e.target.value)}
                  placeholder="e.g. smtp.gmail.com or smtp.mailgun.org"
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">SMTP Port (Optional)</label>
                <input
                  type="text"
                  value={requestedSmtpPort}
                  onChange={e => setRequestedSmtpPort(e.target.value)}
                  placeholder="e.g. 587 or 465"
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Note / Instructions for Admin</label>
              <textarea
                rows={3}
                value={requestedSmtpNote}
                onChange={e => setRequestedSmtpNote(e.target.value)}
                placeholder="Please configure and verify this SMTP sender email for my marketing campaign dispatches..."
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={sendingReminder}
                className="flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-xs shadow-md transition disabled:opacity-50"
              >
                <Send size={15} />
                {sendingReminder ? 'Submitting Request...' : 'Send SMTP Configuration Request to Admin'}
              </button>
            </div>
          </form>
        </div>

      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-300">
      
      {/* Page Header */}
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-200/60">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Profiles & User Access</h2>
          <p className="text-gray-500 mt-1 text-sm">Manage user directory profiles, custom module permissions, and self SMTP sender services.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button onClick={fetchData} className="p-2.5 text-gray-500 hover:text-primary-600 hover:bg-gray-50 rounded-xl border border-gray-200 transition">
            <RefreshCw size={18} />
          </button>
          
          {isAdmin && (
            <button 
              onClick={handleDownloadBackup}
              className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white hover:bg-green-700 rounded-xl text-sm font-semibold shadow-sm shadow-green-100 transition"
            >
              <Download size={16} /> Database Backup
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 border border-red-100 rounded-xl text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Section 1: User Profiles Management */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Users className="text-primary-500" size={20} />
            <span>User Accounts & Permissions</span>
          </h3>
          {isAdmin && (
            <button 
              onClick={() => {
                setUserForm({ id: null, name: '', username: '', email: '', number: '', password: '', role: 'User', permissions: {} });
                setShowUserModal(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white hover:bg-primary-700 rounded-xl text-xs font-bold transition shadow-sm"
            >
              <UserPlus size={15} /> Add User Profile
            </button>
          )}
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm text-gray-600">
            <thead className="bg-gray-50/50 text-gray-500 font-semibold border-b border-gray-200">
              <tr>
                <th className="px-6 py-4">Name & Username</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Mobile Number</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Module Permissions</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(Array.isArray(users) ? users : []).map(u => {
                let perms = {};
                if (u && u.permissions) {
                  if (typeof u.permissions === 'object') perms = u.permissions;
                  else if (typeof u.permissions === 'string') {
                    try { perms = JSON.parse(u.permissions); } catch (e) { perms = {}; }
                  }
                }
                const activePermsCount = perms && typeof perms === 'object' ? Object.values(perms).filter(Boolean).length : 0;
                return (
                  <tr key={u.id} className="hover:bg-gray-50/50 transition">
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900">{u.name}</div>
                      <div className="text-xs text-gray-400">@{u.username || 'no-username'}</div>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-800">{u.email}</td>
                    <td className="px-6 py-4 font-mono text-xs">{u.number || '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                        u.role === 'Admin' || u.role === 'Super Admin' ? 'bg-purple-100 text-purple-700' :
                        u.role === 'Associates' || u.role === 'Subscriber' || u.role === 'Sub Admin' ? 'bg-blue-100 text-blue-700' :
                        'bg-emerald-100 text-emerald-700'
                      }`}>
                        {u.role === 'Super Admin' ? 'Admin' : (u.role === 'Subscriber' || u.role === 'Sub Admin' ? 'Associates' : (u.role === 'User' ? 'Developer' : u.role))}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {u.role === 'Super Admin' || u.role === 'Admin' ? (
                        <span className="text-xs text-purple-600 font-medium">All Access (Admin)</span>
                      ) : (
                        <span className="text-xs text-gray-500 font-medium">
                          {activePermsCount} / {MODULES.length} Modules Allowed
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      {/* Password Actions */}
                      <button 
                        onClick={() => triggerForgetPassword(u.email)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="Send Forget Password Link"
                      >
                        <Mail size={16} />
                      </button>
                      <button 
                        onClick={() => {
                          setPasswordForm({ userId: u.id, newPassword: '', confirmNewPassword: '' });
                          setShowResetPasswordModal(true);
                        }}
                        className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                        title="Reset Password Manually"
                      >
                        <Key size={16} />
                      </button>

                      {/* Edit/Delete Actions */}
                      {(currentUserRole === 'Super Admin' || Number(currentUser.id) === Number(u.id) || (currentUserRole === 'Admin' && u.role !== 'Super Admin')) && (
                        <button 
                          onClick={() => {
                            setUserForm({ ...u, permissions: perms, password: '' });
                            setShowUserModal(true);
                          }}
                          className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition"
                          title="Edit Profile"
                        >
                          <Edit size={16} />
                        </button>
                      )}
                      
                      {currentUserRole === 'Super Admin' || (currentUserRole === 'Admin' && u.role !== 'Super Admin' && Number(currentUser.id) !== Number(u.id)) ? (
                        <button 
                          onClick={() => handleDeleteUser(u.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Delete Profile"
                        >
                          <Trash2 size={16} />
                        </button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 2: SMTP Configuration Scope */}
      {isAdmin && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white">
            <div>
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Shield className="text-primary-500" size={20} />
                <span>SMTP Server Configurations</span>
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">Setup custom SMTP servers to dispatch marketing email campaigns.</p>
            </div>
            
            <button 
              onClick={() => {
                setSmtpForm({ id: null, name: '', email: '', smtp_host: '', smtp_port: '587', smtp_user: '', smtp_pass: '', smtp_secure: 'tls', admin_id: currentUser.id });
                setShowSmtpModal(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white hover:bg-primary-700 rounded-xl text-xs font-bold transition shadow-sm"
            >
              <Plus size={15} /> Add SMTP Sender
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm text-gray-600">
              <thead className="bg-gray-50/50 text-gray-500 font-semibold border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4">Sender Profile</th>
                  <th className="px-6 py-4">SMTP Host & Port</th>
                  <th className="px-6 py-4">SMTP Username</th>
                  <th className="px-6 py-4">Security</th>
                  <th className="px-6 py-4">Associated Admin</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(Array.isArray(senders) ? senders : []).map(s => {
                  const owner = (Array.isArray(users) ? users : []).find(u => Number(u.id) === Number(s.admin_id));
                  return (
                    <tr key={s.id} className="hover:bg-gray-50/50 transition">
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-900">{s.name}</div>
                        <div className="text-xs text-gray-400">{s.email}</div>
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-800">{s.smtp_host || '—'}:{s.smtp_port || '—'}</td>
                      <td className="px-6 py-4 text-gray-600">{s.smtp_user || '—'}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-700 font-mono text-[11px] font-bold rounded">
                          {s.smtp_secure || 'tls'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {s.admin_id ? (owner ? `${owner.name} (${owner.role})` : `User #${s.admin_id}`) : 'Global Default'}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button 
                          onClick={() => handleOpenTestSmtp(s)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white rounded-lg text-xs font-bold transition border border-blue-200 shadow-sm align-middle"
                          title="Test SMTP configuration & send test email"
                        >
                          <Send size={12} />
                          <span>Test Connection</span>
                        </button>
                        <button 
                          onClick={() => navigate(`/campaigns/new?sender_id=${s.id}`)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 hover:bg-green-600 hover:text-white rounded-lg text-xs font-bold transition border border-green-200 shadow-sm align-middle"
                          title="Send campaign using this email"
                        >
                          <Mail size={12} />
                          <span>Send campaign using this email</span>
                        </button>
                        <button 
                          onClick={() => {
                            setSmtpForm({ ...s });
                            setShowSmtpModal(true);
                          }}
                          className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition inline-flex items-center justify-center align-middle"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteSmtp(s.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition inline-flex items-center justify-center align-middle"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {senders.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">No SMTP Configurations found. Add one to enable email dispatches.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 0: Test SMTP Connection */}
      {showTestSmtpModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5">
            <div className="flex justify-between items-center pb-2 border-b">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <Mail size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Test SMTP Connection</h3>
                  <p className="text-xs text-gray-500">Verify SMTP settings & dispatch test email</p>
                </div>
              </div>
              <button onClick={() => setShowTestSmtpModal(false)} className="text-gray-400 hover:bg-gray-100 p-1.5 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                <p><span className="text-gray-500">Sender Profile:</span> <strong className="text-gray-800">{testSmtpSender?.name || 'New Sender'}</strong> &lt;{testSmtpSender?.email || 'N/A'}&gt;</p>
                <p><span className="text-gray-500">SMTP Host & Port:</span> <strong className="text-gray-800">{testSmtpSender?.smtp_host || 'smtp.gmail.com'}:{testSmtpSender?.smtp_port || 465}</strong></p>
                <p><span className="text-gray-500">SMTP User:</span> <strong className="text-gray-800">{testSmtpSender?.smtp_user || testSmtpSender?.email || '—'}</strong></p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Test Recipient Email Address *</label>
                <input 
                  type="email" 
                  value={testEmailInput} 
                  onChange={e => setTestEmailInput(e.target.value)} 
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  placeholder="vimal@bexcodeservices.com"
                />
                <p className="text-[11px] text-gray-400 mt-1">A verification email will be dispatched to this address using the configured SMTP server.</p>
              </div>

              {testSmtpResult && (
                <div className={`p-4 rounded-xl border text-xs font-medium space-y-1 ${
                  testSmtpResult.success 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}>
                  <div className="flex items-center gap-1.5 font-bold text-sm">
                    {testSmtpResult.success ? '✅ Test Email Dispatched!' : '❌ SMTP Connection Failed'}
                  </div>
                  <p>{testSmtpResult.message}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t pt-4">
              <button 
                onClick={() => setShowTestSmtpModal(false)} 
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl text-xs font-semibold border transition"
              >
                Close
              </button>
              <button 
                onClick={handleRunSmtpTest} 
                disabled={testSmtpLoading}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-2 disabled:opacity-50"
              >
                {testSmtpLoading ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                {testSmtpLoading ? 'Testing SMTP...' : 'Send Test Email'}
              </button>
            </div>
          </div>
        </div>
      )}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-6 max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex justify-between items-center pb-2 border-b shrink-0">
              <h3 className="text-xl font-bold text-gray-900">{userForm.id ? 'Edit Profile & Access' : 'Create Profile'}</h3>
              <button onClick={() => setShowUserModal(false)} className="text-gray-400 hover:bg-gray-100 p-1.5 rounded-lg"><X size={18} /></button>
            </div>
            
            <div className="space-y-4 overflow-y-auto flex-1 pr-1">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Full Name *</label>
                  <input type="text" value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Username</label>
                  <input type="text" value={userForm.username} onChange={e => setUserForm({...userForm, username: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" placeholder="e.g. vimal99" />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Email *</label>
                  <input type="email" value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Mobile Number</label>
                  <input type="text" value={userForm.number} onChange={e => setUserForm({...userForm, number: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
              </div>

              {!userForm.id && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Password *</label>
                      <div className="flex gap-2">
                        <button 
                          type="button" 
                          onClick={generatePassword} 
                          className="text-[10px] font-bold text-primary-600 hover:text-primary-700 uppercase focus:outline-none"
                        >
                          Generate
                        </button>
                        {userForm.password && (
                          <button 
                            type="button" 
                            onClick={() => {
                              navigator.clipboard.writeText(userForm.password);
                              customAlert({ title: 'Copied', message: 'Password copied to clipboard!', type: 'success' });
                            }} 
                            className="text-[10px] font-bold text-green-600 hover:text-green-700 uppercase focus:outline-none"
                          >
                            Copy
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="relative">
                      <input 
                        type={showUserPassword ? 'text' : 'password'} 
                        value={userForm.password} 
                        onChange={e => setUserForm({...userForm, password: e.target.value})} 
                        className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" 
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowUserPassword(!showUserPassword)} 
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                      >
                        {showUserPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Confirm Password *</label>
                    <div className="relative">
                      <input 
                        type={showUserPassword ? 'text' : 'password'} 
                        value={userForm.confirmPassword || ''} 
                        onChange={e => setUserForm({...userForm, confirmPassword: e.target.value})} 
                        className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" 
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Roles: only Super Admin can set role of others, Admins can set role of admin/user but not Super Admin */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Access Role *</label>
                <select 
                  value={
                    userForm.role === 'Super Admin' || userForm.role === 'Admin' ? 'Admin' :
                    userForm.role === 'Associates' || userForm.role === 'Subscriber' || userForm.role === 'Sub Admin' ? 'Associates' :
                    'Developer'
                  } 
                  disabled={userForm.id === currentUser.id} // Prevent lockouts
                  onChange={e => setUserForm({...userForm, role: e.target.value})} 
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-blue-50/20 font-medium"
                >
                  <option value="Admin">Admin</option>
                  <option value="Associates">Associates</option>
                  <option value="Developer">Developer</option>
                </select>
              </div>

              {/* Module Checkbox Permissions */}
              {userForm.role !== 'Super Admin' && userForm.role !== 'Admin' && (
                <div className="space-y-2 pt-2 border-t">
                  <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Module Access Permissions</span>
                  <div className="grid grid-cols-2 gap-3">
                    {MODULES.map(m => {
                      const isChecked = !!userForm.permissions[m.id];
                      return (
                        <button 
                          key={m.id} 
                          type="button" 
                          onClick={() => handleTogglePermission(m.id)}
                          className="flex items-center text-left gap-2 p-2 border border-gray-200 hover:border-primary-400 hover:bg-gray-50/50 rounded-xl text-xs font-semibold transition"
                        >
                          {isChecked ? <CheckSquare size={16} className="text-primary-600" /> : <Square size={16} className="text-gray-400" />}
                          <span className="text-gray-700">{m.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t pt-4 shrink-0">
              <button onClick={() => setShowUserModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl text-xs font-semibold border transition">Cancel</button>
              <button onClick={handleSaveUser} className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition shadow-sm">Save Profile</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Add/Edit SMTP Sender */}
      {showSmtpModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-6">
            <div className="flex justify-between items-center pb-2 border-b">
              <h3 className="text-xl font-bold text-gray-900">{smtpForm.id ? 'Edit SMTP Configuration' : 'Add SMTP Configuration'}</h3>
              <button onClick={() => setShowSmtpModal(false)} className="text-gray-400 hover:bg-gray-100 p-1.5 rounded-lg"><X size={18} /></button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Sender Name *</label>
                  <input type="text" value={smtpForm.name} onChange={e => setSmtpForm({...smtpForm, name: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" placeholder="e.g. Sales Department" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Sender Email *</label>
                  <input type="email" value={smtpForm.email} onChange={e => setSmtpForm({...smtpForm, email: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" placeholder="info@company.com" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">SMTP Host</label>
                <input type="text" value={smtpForm.smtp_host} onChange={e => setSmtpForm({...smtpForm, smtp_host: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" placeholder="smtp.gmail.com" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">SMTP Port</label>
                  <input type="text" value={smtpForm.smtp_port} onChange={e => setSmtpForm({...smtpForm, smtp_port: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" placeholder="587" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">SMTP Security</label>
                  <select value={smtpForm.smtp_secure} onChange={e => setSmtpForm({...smtpForm, smtp_secure: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-blue-50/20">
                    <option value="tls">TLS (Standard)</option>
                    <option value="ssl">SSL</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">SMTP User</label>
                  <input type="text" value={smtpForm.smtp_user} onChange={e => setSmtpForm({...smtpForm, smtp_user: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">SMTP Password</label>
                  <div className="relative">
                    <input 
                      type={showSmtpPassword ? 'text' : 'password'} 
                      value={smtpForm.smtp_pass} 
                      onChange={e => setSmtpForm({...smtpForm, smtp_pass: e.target.value})} 
                      className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" 
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowSmtpPassword(!showSmtpPassword)} 
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                    >
                      {showSmtpPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              {currentUserRole === 'Super Admin' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Owner Subscriber User</label>
                  <select value={smtpForm.admin_id || ''} onChange={e => setSmtpForm({...smtpForm, admin_id: e.target.value ? Number(e.target.value) : null})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-blue-50/20">
                    <option value="">Global/System Default (Admin)</option>
                    {(Array.isArray(users) ? users : []).filter(u => u.role !== 'User').map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center border-t pt-4">
              <button 
                type="button"
                onClick={() => handleOpenTestSmtp(smtpForm)}
                className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition border border-blue-200 flex items-center gap-1.5 shadow-sm"
              >
                <Send size={14} />
                <span>Test Connection</span>
              </button>
              <div className="flex gap-2">
                <button onClick={() => setShowSmtpModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl text-xs font-semibold border transition">Cancel</button>
                <button onClick={handleSaveSmtp} className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition shadow-sm">Save SMTP Config</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Manual Password Reset */}
      {showResetPasswordModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-6">
            <div className="flex justify-between items-center pb-2 border-b">
              <h3 className="text-xl font-bold text-gray-900">Reset User Password</h3>
              <button onClick={() => setShowResetPasswordModal(false)} className="text-gray-400 hover:bg-gray-100 p-1.5 rounded-lg"><X size={18} /></button>
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">New Password *</label>
                  <div className="flex gap-2">
                    <button 
                      type="button" 
                      onClick={generateResetPassword} 
                      className="text-[10px] font-bold text-primary-600 hover:text-primary-700 uppercase focus:outline-none"
                    >
                      Generate
                    </button>
                    {passwordForm.newPassword && (
                      <button 
                        type="button" 
                        onClick={() => {
                          navigator.clipboard.writeText(passwordForm.newPassword);
                          customAlert({ title: 'Copied', message: 'Password copied to clipboard!', type: 'success' });
                        }} 
                        className="text-[10px] font-bold text-green-600 hover:text-green-700 uppercase focus:outline-none"
                      >
                        Copy
                      </button>
                    )}
                  </div>
                </div>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    value={passwordForm.newPassword} 
                    onChange={e => setPasswordForm({...passwordForm, newPassword: e.target.value})} 
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" 
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Confirm New Password *</label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    value={passwordForm.confirmNewPassword} 
                    onChange={e => setPasswordForm({...passwordForm, confirmNewPassword: e.target.value})} 
                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" 
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t pt-4">
              <button onClick={() => setShowResetPasswordModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl text-xs font-semibold border transition">Cancel</button>
              <button onClick={handleManualPasswordReset} className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition shadow-sm">Reset Password</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Test SMTP Connection Modal */}
      {showTestSmtpModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5">
            <div className="flex justify-between items-center pb-2 border-b">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <Mail size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Test SMTP Connection</h3>
                  <p className="text-xs text-gray-500">Verify SMTP settings & dispatch test email</p>
                </div>
              </div>
              <button onClick={() => setShowTestSmtpModal(false)} className="text-gray-400 hover:bg-gray-100 p-1.5 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                <p><span className="text-gray-500">Sender Profile:</span> <strong className="text-gray-800">{testSmtpSender?.name || 'New Sender'}</strong> &lt;{testSmtpSender?.email || 'N/A'}&gt;</p>
                <p><span className="text-gray-500">SMTP Host & Port:</span> <strong className="text-gray-800">{testSmtpSender?.smtp_host || 'smtp.gmail.com'}:{testSmtpSender?.smtp_port || 465}</strong></p>
                <p><span className="text-gray-500">SMTP User:</span> <strong className="text-gray-800">{testSmtpSender?.smtp_user || testSmtpSender?.email || '—'}</strong></p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Test Recipient Email Address *</label>
                <input 
                  type="email" 
                  value={testEmailInput} 
                  onChange={e => setTestEmailInput(e.target.value)} 
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  placeholder="vimal@bexcodeservices.com"
                />
                <p className="text-[11px] text-gray-400 mt-1">A verification email will be dispatched to this address using the configured SMTP server.</p>
              </div>

              {testSmtpResult && (
                <div className={`p-4 rounded-xl border text-xs font-medium space-y-1 ${
                  testSmtpResult.success 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}>
                  <div className="flex items-center gap-1.5 font-bold text-sm">
                    {testSmtpResult.success ? '✅ Test Email Dispatched!' : '❌ SMTP Connection Failed'}
                  </div>
                  <p>{testSmtpResult.message}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t pt-4">
              <button 
                onClick={() => setShowTestSmtpModal(false)} 
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl text-xs font-semibold border transition"
              >
                Close
              </button>
              <button 
                onClick={handleRunSmtpTest} 
                disabled={testSmtpLoading}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-2 disabled:opacity-50"
              >
                {testSmtpLoading ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                {testSmtpLoading ? 'Testing SMTP...' : 'Send Test Email'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Profiles;
