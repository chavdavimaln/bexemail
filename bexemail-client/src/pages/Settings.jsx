import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Save, Settings2, Users, Send, Mail, Plus, Trash2, Edit2, Link, RefreshCw, Database, Globe, UserCheck, Shield, Eye, EyeOff } from 'lucide-react';
import { useModal } from '../context/ModalContext';

const Settings = () => {
  const { confirm, alert: customAlert } = useModal();
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState({
    company_name: '',
    smtp_host: '',
    smtp_port: '',
    smtp_user: '',
    smtp_pass: '',
  });
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  
  // Senders state
  const [senders, setSenders] = useState([]);
  const [senderForm, setSenderForm] = useState({ id: null, name: '', email: '', is_default: false });
  const [showSenderModal, setShowSenderModal] = useState(false);

  // External Integrations state
  const [integrations, setIntegrations] = useState([]);
  const [lists, setLists] = useState([]);
  const [showIntegrationModal, setShowIntegrationModal] = useState(false);
  const [integrationForm, setIntegrationForm] = useState({
    id: null, name: '', type: 'api', url: '', method: 'GET', api_key: '', db_host: '', db_user: '', db_password: '', db_name: '', db_query: 'SELECT email, first_name FROM users', target_list_id: ''
  });
  const [syncingId, setSyncingId] = useState(null);

  // Admin Users state
  const [admins, setAdmins] = useState([]);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminForm, setAdminForm] = useState({ id: null, name: '', email: '', number: '', password: '', confirmPassword: '', role: 'User' });
  const [currentUserRole, setCurrentUserRole] = useState('Super Admin'); // In real app, derived from Context/JWT
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/settings', { headers: { 'x-user-role': currentUserRole } });
      setSettings(res.data);
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const fetchSenders = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/senders');
      setSenders(res.data);
    } catch (error) {
      console.error('Error fetching senders:', error);
    }
  };

  const fetchIntegrations = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/integrations', { headers: { 'x-user-role': currentUserRole } });
      setIntegrations(res.data);
    } catch (error) {
      console.error('Error fetching integrations:', error);
    }
  };

  const fetchLists = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/lists', { headers: { 'x-user-role': currentUserRole } });
      setLists(res.data);
    } catch (error) {
      console.error('Error fetching lists:', error);
    }
  };

  const fetchAdmins = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/admins', { headers: { 'x-user-role': currentUserRole } });
      setAdmins(res.data);
    } catch (error) {
      console.error('Error fetching admins:', error);
    }
  };

  useEffect(() => {
    if (activeTab === 'senders') fetchSenders();
    if (activeTab === 'integrations') {
      fetchIntegrations();
      fetchLists();
    }
    if (activeTab === 'admins') fetchAdmins();
  }, [activeTab]);

  const handleChange = (e) => setSettings({ ...settings, [e.target.name]: e.target.value });

  const handleSave = async () => {
    setLoading(true); setSaveStatus('');
    try {
      await axios.put('http://localhost:5000/api/settings', settings, { headers: { 'x-user-role': currentUserRole } });
      setSaveStatus('success');
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSender = async () => {
    try {
      if (senderForm.id) {
        await axios.put(`http://localhost:5000/api/senders/${senderForm.id}`, senderForm, { headers: { 'x-user-role': currentUserRole } });
      } else {
        await axios.post('http://localhost:5000/api/senders', senderForm, { headers: { 'x-user-role': currentUserRole } });
      }
      setShowSenderModal(false);
      setSenderForm({ id: null, name: '', email: '', is_default: false });
      fetchSenders();
    } catch (error) {
      alert('Failed to save sender: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleDeleteSender = async (id) => {
    const isOk = await confirm({
      title: 'Delete Sender Profile',
      message: 'Are you sure you want to delete this sender profile?',
      confirmText: 'Delete',
      type: 'danger'
    });
    if (!isOk) return;
    try {
      await axios.delete(`http://localhost:5000/api/senders/${id}`, { headers: { 'x-user-role': currentUserRole } });
      fetchSenders();
    } catch (error) {
      customAlert({ title: 'Error', message: 'Failed to delete sender', type: 'danger' });
    }
  };

  const handleSaveIntegration = async () => {
    if (!integrationForm.target_list_id) return customAlert({ title: 'Validation Error', message: 'Please select a target list.', type: 'warning' });
    try {
      if (integrationForm.id) {
        await axios.put(`http://localhost:5000/api/integrations/${integrationForm.id}`, integrationForm, { headers: { 'x-user-role': currentUserRole } });
      } else {
        await axios.post('http://localhost:5000/api/integrations', integrationForm, { headers: { 'x-user-role': currentUserRole } });
      }
      setShowIntegrationModal(false);
      fetchIntegrations();
    } catch (error) {
      customAlert({ title: 'Error', message: 'Failed to save integration: ' + (error.response?.data?.error || error.message), type: 'danger' });
    }
  };

  const handleDeleteIntegration = async (id) => {
    const isOk = await confirm({
      title: 'Delete Integration',
      message: 'Are you sure you want to delete this integration?',
      confirmText: 'Delete',
      type: 'danger'
    });
    if (!isOk) return;
    try {
      await axios.delete(`http://localhost:5000/api/integrations/${id}`, { headers: { 'x-user-role': currentUserRole } });
      fetchIntegrations();
    } catch (error) {
      customAlert({ title: 'Error', message: 'Failed to delete integration', type: 'danger' });
    }
  };

  const handleSync = async (id) => {
    setSyncingId(id);
    try {
      const res = await axios.post(`http://localhost:5000/api/integrations/${id}/sync`, {}, { headers: { 'x-user-role': currentUserRole } });
      customAlert({ title: 'Success', message: res.data.message, type: 'success' });
      fetchIntegrations(); 
    } catch (error) {
      customAlert({ title: 'Error', message: 'Sync Failed: ' + (error.response?.data?.error || error.message), type: 'danger' });
    } finally {
      setSyncingId(null);
    }
  };

  const handleSaveAdmin = async () => {
    if (!adminForm.name || !adminForm.email) return customAlert({ title: 'Validation Error', message: 'Name and email are required', type: 'warning' });
    if (!adminForm.password) return customAlert({ title: 'Validation Error', message: 'Password is required', type: 'warning' });
    if (adminForm.password !== adminForm.confirmPassword) return customAlert({ title: 'Validation Error', message: 'Passwords do not match', type: 'warning' });

    try {
      const payload = { ...adminForm };
      delete payload.confirmPassword;
      
      if (adminForm.id) {
        await axios.put(`http://localhost:5000/api/admins/${adminForm.id}`, payload, { headers: { 'x-user-role': currentUserRole } });
      } else {
        await axios.post('http://localhost:5000/api/admins', payload, { headers: { 'x-user-role': currentUserRole } });
      }
      setShowAdminModal(false);
      fetchAdmins();
    } catch (error) {
      customAlert({ title: 'Error', message: 'Failed to save user: ' + (error.response?.data?.error || error.message), type: 'danger' });
    }
  };

  const handleDeleteAdmin = async (id) => {
    const isOk = await confirm({
      title: 'Delete Admin User',
      message: 'Are you sure you want to delete this user?',
      confirmText: 'Delete User',
      type: 'danger'
    });
    if (!isOk) return;
    try {
      await axios.delete(`http://localhost:5000/api/admins/${id}`, { headers: { 'x-user-role': currentUserRole } });
      fetchAdmins();
    } catch (error) {
      customAlert({ title: 'Error', message: 'Failed to delete user', type: 'danger' });
    }
  };

  const tabs = [
    { id: 'general', name: 'General', icon: <Settings2 size={18} className="mr-2" /> },
    { id: 'smtp', name: 'SMTP Delivery', icon: <Send size={18} className="mr-2" /> },
    { id: 'senders', name: 'Sender Profiles', icon: <Mail size={18} className="mr-2" /> },
    { id: 'integrations', name: 'External Integrations', icon: <Link size={18} className="mr-2" /> },
    { id: 'admins', name: 'Admin Users', icon: <Users size={18} className="mr-2" /> },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">System Settings</h2>
          <p className="text-gray-500 mt-1">Manage global configurations and integrations.</p>
        </div>
        <div className="flex items-center space-x-4">
          {saveStatus === 'success' && <span className="text-sm text-green-600 font-medium">Saved successfully!</span>}
          {saveStatus === 'error' && <span className="text-sm text-red-600 font-medium">Failed to save</span>}
          <button onClick={handleSave} disabled={loading} className="flex items-center px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50">
            <Save size={18} className="mr-2" />
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-200 overflow-x-auto">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center px-6 py-4 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === tab.id ? 'border-primary-600 text-primary-600 bg-primary-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
              {tab.icon}{tab.name}
            </button>
          ))}
        </div>

        <div className="p-6 md:p-8">
          {activeTab === 'general' && (
            <div className="max-w-xl space-y-6 animate-in fade-in">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">General Settings</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                <input type="text" name="company_name" value={settings.company_name || ''} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
              </div>
            </div>
          )}

          {activeTab === 'smtp' && (
            <div className="max-w-xl space-y-6 animate-in fade-in">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">SMTP Configuration</h3>
              <p className="text-sm text-gray-500 mb-4">Configure the outbound mail server used by the queue worker.</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Host</label>
                  <input type="text" name="smtp_host" value={settings.smtp_host || ''} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
                  <input type="text" name="smtp_port" value={settings.smtp_port || ''} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                  <input type="text" name="smtp_user" value={settings.smtp_user || ''} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input type="password" name="smtp_pass" value={settings.smtp_pass || ''} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none font-mono" />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'senders' && (
            <div className="max-w-3xl space-y-6 animate-in fade-in">
              <div className="flex justify-between items-center border-b pb-2">
                <h3 className="text-lg font-semibold text-gray-900">Sender Profiles</h3>
                <button onClick={() => { setSenderForm({ id: null, name: '', email: '', is_default: false }); setShowSenderModal(true); }} className="px-3 py-1.5 bg-primary-100 text-primary-700 hover:bg-primary-200 rounded-lg text-sm font-medium transition-colors flex items-center">
                  <Plus size={16} className="mr-1" /> Add Sender
                </button>
              </div>
              <p className="text-sm text-gray-500 mb-4">Manage the names and email addresses you send campaigns from.</p>
              <div className="space-y-3">
                {senders.map(s => (
                  <div key={s.id} className="flex justify-between items-center p-4 bg-gray-50 border border-gray-200 rounded-xl">
                    <div>
                      <div className="font-semibold text-gray-900 flex items-center">{s.name}{s.is_default && <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded">Default</span>}</div>
                      <div className="text-sm text-gray-500">{s.email}</div>
                    </div>
                    <div className="flex space-x-2">
                      <button onClick={() => { setSenderForm(s); setShowSenderModal(true); }} className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"><Edit2 size={16} /></button>
                      <button onClick={() => handleDeleteSender(s.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'integrations' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex justify-between items-center border-b pb-2">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">External Data Integrations</h3>
                  <p className="text-sm text-gray-500 mt-1">Connect to external APIs or remote Live Databases to dynamically pull in subscribers.</p>
                </div>
                <button onClick={() => { 
                  setIntegrationForm({ id: null, name: '', type: 'api', url: '', method: 'GET', api_key: '', db_host: '', db_user: '', db_password: '', db_name: '', db_query: 'SELECT email, first_name FROM users', target_list_id: '' });
                  setShowIntegrationModal(true); 
                }} className="px-4 py-2 bg-primary-600 text-white hover:bg-primary-700 rounded-lg text-sm font-medium transition-colors flex items-center">
                  <Plus size={16} className="mr-2" /> Add Data Source
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {integrations.map(int => (
                  <div key={int.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-primary-300 transition-colors">
                    <div className="mb-4 sm:mb-0">
                      <div className="flex items-center space-x-2">
                        {int.type === 'api' ? <Globe className="text-blue-500" size={20} /> : <Database className="text-purple-500" size={20} />}
                        <h4 className="font-semibold text-gray-900 text-lg">{int.name}</h4>
                        <span className="px-2.5 py-0.5 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full uppercase tracking-wider">{int.type}</span>
                      </div>
                      <div className="text-sm text-gray-500 mt-2 flex flex-col space-y-1">
                        <span><strong>Target List:</strong> {int.list_name || 'None'}</span>
                        <span><strong>Last Synced:</strong> {int.last_sync_at ? new Date(int.last_sync_at).toLocaleString() : 'Never'}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button 
                        onClick={() => handleSync(int.id)}
                        disabled={syncingId === int.id}
                        className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors text-sm ${syncingId === int.id ? 'bg-indigo-100 text-indigo-400 cursor-not-allowed' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'}`}
                      >
                        <RefreshCw size={16} className={`mr-2 ${syncingId === int.id ? 'animate-spin' : ''}`} />
                        {syncingId === int.id ? 'Syncing...' : 'Sync Now'}
                      </button>
                      <button onClick={() => { setIntegrationForm(int); setShowIntegrationModal(true); }} className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors border border-transparent hover:border-primary-100"><Edit2 size={18} /></button>
                      <button onClick={() => handleDeleteIntegration(int.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"><Trash2 size={18} /></button>
                    </div>
                  </div>
                ))}
                {integrations.length === 0 && (
                  <div className="text-center py-12 bg-gray-50 border border-dashed border-gray-300 rounded-xl">
                    <Database className="mx-auto text-gray-400 mb-3" size={32} />
                    <h3 className="text-lg font-medium text-gray-900 mb-1">No Integrations Configured</h3>
                    <p className="text-gray-500 text-sm">Add a Live API or Remote Database to start importing contacts dynamically.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'admins' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex justify-between items-center border-b pb-2">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Admin Users & Roles</h3>
                  <p className="text-sm text-gray-500 mt-1">Manage user access and Role-Based Access Control (RBAC).</p>
                </div>
                <button 
                  onClick={() => { setAdminForm({ id: null, name: '', email: '', number: '', password: '', confirmPassword: '', role: 'User' }); setShowAdminModal(true); }} 
                  className="px-4 py-2 bg-primary-600 text-white hover:bg-primary-700 rounded-lg text-sm font-medium transition-colors flex items-center"
                >
                  <Plus size={16} className="mr-2" /> Add User
                </button>
              </div>

              {currentUserRole !== 'Super Admin' && (
                <div className="bg-red-50 border border-red-200 p-4 rounded-lg text-sm text-red-800 flex items-start">
                  <Shield className="mr-2 mt-0.5 flex-shrink-0" size={18} />
                  <div>
                    <strong>Access Denied:</strong> Only Super Admins have permission to view or manage users.
                  </div>
                </div>
              )}

              {currentUserRole === 'Super Admin' && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-500">
                        <th className="px-6 py-3 font-medium">Name</th>
                        <th className="px-6 py-3 font-medium">Email</th>
                        <th className="px-6 py-3 font-medium">Number</th>
                        <th className="px-6 py-3 font-medium">Role</th>
                        <th className="px-6 py-3 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {admins.map(admin => (
                        <tr key={admin.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center text-gray-900 font-medium">
                              <UserCheck size={16} className="mr-2 text-gray-400" />
                              {admin.name || '-'}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-gray-600 text-sm">{admin.email}</td>
                          <td className="px-6 py-4 text-gray-600 text-sm">{admin.number || '-'}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                              admin.role === 'Super Admin' ? 'bg-purple-100 text-purple-700' :
                              admin.role === 'Sub Admin' ? 'bg-blue-100 text-blue-700' :
                              admin.role === 'Subscriber' ? 'bg-orange-100 text-orange-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {admin.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right space-x-2">
                            <button onClick={() => { setAdminForm({ ...admin, confirmPassword: admin.password }); setShowPassword(false); setShowConfirmPassword(false); setShowAdminModal(true); }} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"><Edit2 size={16} /></button>
                            <button onClick={() => handleDeleteAdmin(admin.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 size={16} /></button>
                          </td>
                        </tr>
                      ))}
                      {admins.length === 0 && (
                        <tr>
                          <td colSpan="5" className="px-6 py-8 text-center text-gray-500">No users found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Sender Modal */}
      {/* ... (Sender and Integration Modals remain exactly the same) ... */}
      {showSenderModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-6">
            <h3 className="text-xl font-bold text-gray-900">{senderForm.id ? 'Edit Sender Profile' : 'Add New Sender'}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Name</label>
                <input type="text" value={senderForm.name} onChange={e => setSenderForm({...senderForm, name: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Email</label>
                <input type="email" value={senderForm.email} onChange={e => setSenderForm({...senderForm, email: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
              </div>
              <label className="flex items-center space-x-2 cursor-pointer mt-2">
                <input type="checkbox" checked={senderForm.is_default} onChange={e => setSenderForm({...senderForm, is_default: e.target.checked})} className="rounded text-primary-600 focus:ring-primary-500 h-4 w-4" />
                <span className="text-sm font-medium text-gray-700">Set as default sender</span>
              </label>
            </div>
            <div className="flex justify-end space-x-3">
              <button onClick={() => setShowSenderModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors">Cancel</button>
              <button onClick={handleSaveSender} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium transition-colors">Save Profile</button>
            </div>
          </div>
        </div>
      )}

      {showIntegrationModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-6 my-8">
            <h3 className="text-xl font-bold text-gray-900">{integrationForm.id ? 'Edit Data Integration' : 'Add External Data Integration'}</h3>
            
            <div className="grid grid-cols-2 gap-4 border-b pb-4">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Integration Name</label>
                <input type="text" value={integrationForm.name} onChange={e => setIntegrationForm({...integrationForm, name: e.target.value})} placeholder="e.g. My CRM API" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Source Type</label>
                <select value={integrationForm.type} onChange={e => setIntegrationForm({...integrationForm, type: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none">
                  <option value="api">Live API / Webhook GET</option>
                  <option value="database">Live Remote Database (MySQL)</option>
                </select>
              </div>
            </div>

            {integrationForm.type === 'api' && (
              <div className="space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                <h4 className="font-medium text-gray-900 text-sm">API Configuration</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Endpoint URL</label>
                  <input type="url" value={integrationForm.url} onChange={e => setIntegrationForm({...integrationForm, url: e.target.value})} placeholder="https://api.yourservice.com/v1/contacts" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
                  <p className="text-xs text-gray-500 mt-1">The system will automatically scan the JSON response for "email" fields.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">API Key / Bearer Token (Optional)</label>
                  <input type="password" value={integrationForm.api_key} onChange={e => setIntegrationForm({...integrationForm, api_key: e.target.value})} placeholder={integrationForm.id && integrationForm.api_key === '********' ? '********' : 'Paste your secret token here'} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none font-mono" />
                </div>
              </div>
            )}

            {integrationForm.type === 'database' && (
              <div className="space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                <h4 className="font-medium text-gray-900 text-sm">Database Credentials</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Host/IP</label>
                    <input type="text" value={integrationForm.db_host} onChange={e => setIntegrationForm({...integrationForm, db_host: e.target.value})} placeholder="e.g. 192.168.1.100" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Database Name</label>
                    <input type="text" value={integrationForm.db_name} onChange={e => setIntegrationForm({...integrationForm, db_name: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                    <input type="text" value={integrationForm.db_user} onChange={e => setIntegrationForm({...integrationForm, db_user: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                    <input type="password" value={integrationForm.db_password} onChange={e => setIntegrationForm({...integrationForm, db_password: e.target.value})} placeholder={integrationForm.id && integrationForm.db_password === '********' ? '********' : ''} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">SQL Query</label>
                    <textarea value={integrationForm.db_query} onChange={e => setIntegrationForm({...integrationForm, db_query: e.target.value})} rows={2} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none font-mono text-sm" />
                    <p className="text-xs text-gray-500 mt-1">Must return a column named `email`.</p>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-2">
              <label className="block text-sm font-bold text-gray-900 mb-1">Save Fetched Contacts To (Target List)</label>
              <select 
                value={integrationForm.target_list_id} 
                onChange={e => setIntegrationForm({...integrationForm, target_list_id: e.target.value})} 
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-blue-50/50"
              >
                <option value="">-- Select a Target List --</option>
                {lists.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">All contacts fetched during a Sync will be automatically appended to this list.</p>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button onClick={() => setShowIntegrationModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors">Cancel</button>
              <button onClick={handleSaveIntegration} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium transition-colors">Save Integration</button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Admin User Modal */}
      {showAdminModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-6">
            <h3 className="text-xl font-bold text-gray-900">{adminForm.id ? 'Edit User' : 'Add New User'}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input type="text" value={adminForm.name} onChange={e => setAdminForm({...adminForm, name: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input type="email" value={adminForm.email} onChange={e => setAdminForm({...adminForm, email: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Number *</label>
                <input type="text" value={adminForm.number} onChange={e => setAdminForm({...adminForm, number: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                  <div className="relative">
                    <input type={showPassword ? "text" : "password"} value={adminForm.password} onChange={e => setAdminForm({...adminForm, password: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none pr-10" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600">
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password *</label>
                  <div className="relative">
                    <input type={showConfirmPassword ? "text" : "password"} value={adminForm.confirmPassword} onChange={e => setAdminForm({...adminForm, confirmPassword: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none pr-10" />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600">
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Admin Access Role *</label>
                <select value={adminForm.role} onChange={e => setAdminForm({...adminForm, role: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-blue-50/30">
                  <option value="Super Admin">Super Admin</option>
                  <option value="Sub Admin">Sub Admin</option>
                  <option value="User">User</option>
                  <option value="Subscriber">Subscriber</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">Only Super Admins have full access to global settings and integrations.</p>
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <button onClick={() => setShowAdminModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors">Cancel</button>
              <button onClick={handleSaveAdmin} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium transition-colors">Save User</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Settings;
