import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
  Users, UserPlus, Key, Mail, Phone, Shield, ShieldCheck, 
  Trash2, Edit, Plus, CheckSquare, Square, Download, Eye, EyeOff, X, RefreshCw
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
  { id: 'settings', name: 'System Settings' }
];

const Profiles = () => {
  const { confirm, alert: customAlert } = useModal();
  const navigate = useNavigate();
  
  // Logged in user info
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const currentUserRole = currentUser.role;

  // States
  const [users, setUsers] = useState([]);
  const [senders, setSenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals
  const [showUserModal, setShowUserModal] = useState(false);
  const [showSmtpModal, setShowSmtpModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);

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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch Users
      const usersRes = await axios.get('http://localhost:5000/api/admins');
      setUsers(usersRes.data);

      // 2. Fetch Senders / SMTP setups (only for Super Admin and Admin)
      if (currentUserRole === 'Super Admin' || currentUserRole === 'Admin' || currentUserRole === 'Sub Admin') {
        const sendersRes = await axios.get('http://localhost:5000/api/senders');
        setSenders(sendersRes.data);
      }
    } catch (err) {
      console.error('Failed to load Profile data:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load profiles');
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

  const handleTogglePermission = (moduleId) => {
    setUserForm(prev => {
      const nextPerms = { ...prev.permissions };
      nextPerms[moduleId] = !nextPerms[moduleId];
      return { ...prev, permissions: nextPerms };
    });
  };

  if (loading) return <div className="p-8">Loading Profile Management...</div>;

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
          
          {(currentUserRole === 'Super Admin' || currentUserRole === 'Admin' || currentUserRole === 'Sub Admin') && (
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
          {(currentUserRole === 'Super Admin' || currentUserRole === 'Admin' || currentUserRole === 'Sub Admin') && (
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
              {users.map(u => {
                const perms = u.permissions ? (typeof u.permissions === 'string' ? JSON.parse(u.permissions) : u.permissions) : {};
                const activePermsCount = Object.values(perms).filter(Boolean).length;
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
                        u.role === 'Super Admin' ? 'bg-purple-100 text-purple-700' :
                        u.role === 'Admin' || u.role === 'Sub Admin' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {u.role === 'Super Admin' ? 'Admin' : u.role === 'Admin' ? 'Subscriber' : u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {u.role === 'Super Admin' ? (
                        <span className="text-xs text-purple-600 font-medium">All Access</span>
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

      {/* Section 2: SMTP Configuration Scoped */}
      {(currentUserRole === 'Super Admin' || currentUserRole === 'Admin' || currentUserRole === 'Sub Admin') && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <ShieldCheck className="text-primary-500" size={20} />
              <span>SMTP Server Configurations</span>
            </h3>
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
                {senders.map(s => {
                  const owner = users.find(u => Number(u.id) === Number(s.admin_id));
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
                        {s.admin_id ? (owner ? `${owner.name} (${owner.role === 'Super Admin' ? 'Admin' : owner.role === 'Admin' ? 'Subscriber' : owner.role})` : `User #${s.admin_id}`) : 'Global Default'}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
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

      {/* MODAL 1: Add/Edit User Profile */}
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
                  value={userForm.role} 
                  disabled={userForm.id === currentUser.id && currentUserRole !== 'Super Admin'} // Prevent lockouts
                  onChange={e => setUserForm({...userForm, role: e.target.value})} 
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-blue-50/20"
                >
                  {currentUserRole === 'Super Admin' && <option value="Super Admin">Admin</option>}
                  <option value="Admin">Subscriber</option>
                  <option value="User">User</option>
                </select>
              </div>

              {/* Module Checkbox Permissions */}
              {userForm.role !== 'Super Admin' && (
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
                    {users.filter(u => u.role !== 'User').map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.role === 'Super Admin' ? 'Admin' : u.role === 'Admin' ? 'Subscriber' : u.role})</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t pt-4">
              <button onClick={() => setShowSmtpModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl text-xs font-semibold border transition">Cancel</button>
              <button onClick={handleSaveSmtp} className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition shadow-sm">Save SMTP Config</button>
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

    </div>
  );
};

export default Profiles;
