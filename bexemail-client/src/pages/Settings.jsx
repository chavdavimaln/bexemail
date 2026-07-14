import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Save, Settings2, Users, Send, Mail, Plus, Trash2, Edit2 } from 'lucide-react';

const Settings = () => {
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

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      // We pass a mock Super Admin role header to bypass our RBAC middleware for this demo
      const res = await axios.get('http://localhost:5000/api/settings', {
        headers: { 'x-user-role': 'Super Admin' }
      });
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

  useEffect(() => {
    if (activeTab === 'senders') {
      fetchSenders();
    }
  }, [activeTab]);

  const handleChange = (e) => {
    setSettings({ ...settings, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setLoading(true);
    setSaveStatus('');
    try {
      await axios.put('http://localhost:5000/api/settings', settings, {
        headers: { 'x-user-role': 'Super Admin' }
      });
      setSaveStatus('success');
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'general', name: 'General', icon: <Settings2 size={18} className="mr-2" /> },
    { id: 'smtp', name: 'SMTP Delivery', icon: <Send size={18} className="mr-2" /> },
    { id: 'senders', name: 'Sender Profiles', icon: <Mail size={18} className="mr-2" /> },
    { id: 'admins', name: 'Admin Users', icon: <Users size={18} className="mr-2" /> },
  ];

  const handleSaveSender = async () => {
    try {
      if (senderForm.id) {
        await axios.put(`http://localhost:5000/api/senders/${senderForm.id}`, senderForm, { headers: { 'x-user-role': 'Super Admin' } });
      } else {
        await axios.post('http://localhost:5000/api/senders', senderForm, { headers: { 'x-user-role': 'Super Admin' } });
      }
      setShowSenderModal(false);
      setSenderForm({ id: null, name: '', email: '', is_default: false });
      fetchSenders();
    } catch (error) {
      alert('Failed to save sender');
    }
  };

  const handleDeleteSender = async (id) => {
    if (!window.confirm('Are you sure you want to delete this sender?')) return;
    try {
      await axios.delete(`http://localhost:5000/api/senders/${id}`, { headers: { 'x-user-role': 'Super Admin' } });
      fetchSenders();
    } catch (error) {
      alert('Failed to delete sender');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">System Settings</h2>
          <p className="text-gray-500 mt-1">Manage global configurations and delivery settings.</p>
        </div>
        <div className="flex items-center space-x-4">
          {saveStatus === 'success' && <span className="text-sm text-green-600 font-medium">Saved successfully!</span>}
          {saveStatus === 'error' && <span className="text-sm text-red-600 font-medium">Failed to save</span>}
          <button 
            onClick={handleSave}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            <Save size={18} className="mr-2" />
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-200">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center px-6 py-4 text-sm font-medium transition-colors border-b-2
                ${activeTab === tab.id 
                  ? 'border-primary-600 text-primary-600 bg-primary-50/50' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
            >
              {tab.icon}
              {tab.name}
            </button>
          ))}
        </div>

        <div className="p-6 md:p-8">
          {activeTab === 'general' && (
            <div className="max-w-xl space-y-6 animate-in fade-in">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">General Settings</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                <input 
                  type="text" 
                  name="company_name"
                  value={settings.company_name || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                />
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
                  <input 
                    type="text" 
                    name="smtp_host"
                    value={settings.smtp_host || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
                    <input 
                      type="text" 
                      name="smtp_port"
                      value={settings.smtp_port || ''}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                  <input 
                    type="text" 
                    name="smtp_user"
                    value={settings.smtp_user || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input 
                    type="password" 
                    name="smtp_pass"
                    value={settings.smtp_pass || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'senders' && (
            <div className="max-w-3xl space-y-6 animate-in fade-in">
              <div className="flex justify-between items-center border-b pb-2">
                <h3 className="text-lg font-semibold text-gray-900">Sender Profiles</h3>
                <button 
                  onClick={() => {
                    setSenderForm({ id: null, name: '', email: '', is_default: false });
                    setShowSenderModal(true);
                  }}
                  className="px-3 py-1.5 bg-primary-100 text-primary-700 hover:bg-primary-200 rounded-lg text-sm font-medium transition-colors flex items-center"
                >
                  <Plus size={16} className="mr-1" /> Add Sender
                </button>
              </div>
              <p className="text-sm text-gray-500 mb-4">Manage the names and email addresses you send campaigns from.</p>
              
              <div className="space-y-3">
                {senders.map(s => (
                  <div key={s.id} className="flex justify-between items-center p-4 bg-gray-50 border border-gray-200 rounded-xl">
                    <div>
                      <div className="font-semibold text-gray-900 flex items-center">
                        {s.name}
                        {s.is_default ? <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded">Default</span> : null}
                      </div>
                      <div className="text-sm text-gray-500">{s.email}</div>
                    </div>
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => { setSenderForm(s); setShowSenderModal(true); }}
                        className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeleteSender(s.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
                {senders.length === 0 && <p className="text-sm text-gray-500 text-center py-4">No senders configured.</p>}
              </div>
            </div>
          )}

          {activeTab === 'admins' && (
            <div className="max-w-xl space-y-6 animate-in fade-in">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Admin Users & Roles</h3>
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg text-sm text-blue-800">
                <strong>RBAC Implementation Note:</strong>
                <p className="mt-1">Role-Based Access Control middleware has been added to the backend. Admin management UI would be implemented here to assign roles (Super Admin, Campaign Manager, Audience Manager) to users in the <code>admin_users</code> table.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Sender Modal */}
      {showSenderModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-6">
            <h3 className="text-xl font-bold text-gray-900">{senderForm.id ? 'Edit Sender Profile' : 'Add New Sender'}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Name</label>
                <input 
                  type="text" 
                  value={senderForm.name}
                  onChange={e => setSenderForm({...senderForm, name: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="e.g. Acme Marketing"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Email</label>
                <input 
                  type="email" 
                  value={senderForm.email}
                  onChange={e => setSenderForm({...senderForm, email: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="e.g. marketing@acme.com"
                />
              </div>
              <label className="flex items-center space-x-2 cursor-pointer mt-2">
                <input 
                  type="checkbox" 
                  checked={senderForm.is_default}
                  onChange={e => setSenderForm({...senderForm, is_default: e.target.checked})}
                  className="rounded text-primary-600 focus:ring-primary-500 h-4 w-4"
                />
                <span className="text-sm font-medium text-gray-700">Set as default sender</span>
              </label>
            </div>
            <div className="flex justify-end space-x-3">
              <button 
                onClick={() => setShowSenderModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveSender}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium transition-colors"
              >
                Save Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
