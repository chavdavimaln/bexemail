import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Key, Plus, Trash2, CheckCircle2, AlertTriangle, BookOpen } from 'lucide-react';

const DeveloperAPI = () => {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newKey, setNewKey] = useState(null);
  const [keyName, setKeyName] = useState('');

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/api-keys', {
        headers: { 'x-user-role': 'Super Admin' }
      });
      setKeys(res.data);
    } catch (error) {
      console.error('Error fetching API keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateKey = async () => {
    if (!keyName) return alert('Please provide a name for the key');
    try {
      const res = await axios.post('http://localhost:5000/api/api-keys', { name: keyName }, {
        headers: { 'x-user-role': 'Super Admin' }
      });
      setNewKey(res.data.api_key);
      setKeyName('');
      fetchKeys();
    } catch (error) {
      console.error('Error generating key:', error);
    }
  };

  const revokeKey = async (id) => {
    if (!window.confirm('Are you sure you want to revoke this API key? Apps using it will immediately lose access.')) return;
    try {
      await axios.put(`http://localhost:5000/api/api-keys/${id}/revoke`, {}, {
        headers: { 'x-user-role': 'Super Admin' }
      });
      fetchKeys();
    } catch (error) {
      console.error('Error revoking key:', error);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Developer API Access</h2>
        <p className="text-gray-500 mt-1">Manage API keys and authenticate external applications.</p>
      </div>

      {newKey && (
        <div className="bg-green-50 border border-green-200 p-6 rounded-xl animate-in fade-in">
          <div className="flex items-start">
            <CheckCircle2 className="text-green-500 mr-3 shrink-0 mt-1" size={24} />
            <div>
              <h3 className="text-lg font-bold text-green-800 mb-2">New API Key Generated</h3>
              <p className="text-green-700 mb-4 font-medium">Please copy this key now. For security reasons, it will never be shown again.</p>
              <div className="bg-white p-4 rounded border border-green-200 font-mono text-gray-800 break-all select-all">
                {newKey}
              </div>
              <button 
                onClick={() => setNewKey(null)}
                className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm font-medium"
              >
                I have copied the key
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2 mb-4">Generate New Key</h3>
            <div className="flex space-x-4">
              <input 
                type="text" 
                value={keyName}
                onChange={e => setKeyName(e.target.value)}
                placeholder="e.g., Zapier Integration"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              />
              <button 
                onClick={generateKey}
                className="flex items-center px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700"
              >
                <Plus size={18} className="mr-2" /> Generate
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-4 font-medium text-gray-600 text-sm">Key Name</th>
                  <th className="px-6 py-4 font-medium text-gray-600 text-sm">Status</th>
                  <th className="px-6 py-4 font-medium text-gray-600 text-sm">Last Used</th>
                  <th className="px-6 py-4 font-medium text-gray-600 text-sm text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {keys.map(key => (
                  <tr key={key.id}>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <Key className="text-gray-400 mr-3" size={18} />
                        <span className="font-medium text-gray-900">{key.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {key.is_active ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Active</span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Revoked</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {key.last_used_at ? new Date(key.last_used_at).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {key.is_active && (
                        <button 
                          onClick={() => revokeKey(key.id)}
                          className="text-red-500 hover:text-red-700 transition-colors flex items-center justify-end w-full"
                          title="Revoke Key"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {keys.length === 0 && !loading && (
                  <tr>
                    <td colSpan="4" className="px-6 py-8 text-center text-gray-500">No API keys found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 shadow-sm text-gray-300">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center border-b border-gray-700 pb-2">
              <BookOpen size={20} className="mr-2 text-primary-400" /> API Documentation
            </h3>
            <p className="text-sm mb-4 text-gray-400">Authenticate requests by passing your key in the header:</p>
            <div className="bg-gray-800 p-3 rounded text-sm font-mono mb-6 text-green-400 overflow-x-auto">
              x-api-key: bex_your_secret_key
            </div>

            <h4 className="font-semibold text-white mb-2 text-sm">Add Subscriber</h4>
            <div className="bg-gray-800 p-3 rounded text-sm font-mono mb-4 text-blue-400">
              POST /api/webhooks/subscribe
            </div>
            
            <h4 className="font-semibold text-white mb-2 text-sm">Dispatch Campaign</h4>
            <div className="bg-gray-800 p-3 rounded text-sm font-mono mb-4 text-blue-400">
              POST /api/campaigns/dispatch
            </div>

            <div className="mt-6 flex items-start text-xs text-yellow-500 bg-yellow-500/10 p-3 rounded">
              <AlertTriangle size={16} className="mr-2 shrink-0" />
              <span>Keep your API keys secret. Do not expose them in client-side code (like frontend React apps).</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeveloperAPI;
