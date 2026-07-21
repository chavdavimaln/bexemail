import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { X, Play, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function TestAutomationModal({ automationId, onClose }) {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [subscriberId, setSubscriberId] = useState('');
  const [contactsLoading, setContactsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let active = true;
    axios.get('/api/subscribers?limit=100&status=subscribed')
      .then(({ data }) => {
        const databaseContacts = Array.isArray(data?.data) ? data.data : [];
        if (active) {
          setContacts(databaseContacts);
          setSubscriberId(databaseContacts[0]?.id ? String(databaseContacts[0].id) : '');
        }
      })
      .catch((error) => {
        console.error('Failed to load contacts for automation test', error);
        if (active) setErrorMessage('Database contacts could not be loaded.');
      })
      .finally(() => {
        if (active) setContactsLoading(false);
      });
    return () => { active = false; };
  }, []);

  const handleTest = async () => {
    setLoading(true);
    setResults(null);
    setErrorMessage('');
    try {
      const res = await axios.post(`/api/automations/${automationId}/test`, {
        subscriberId: Number(subscriberId),
      }, { timeout: 10000 });
      setResults(Array.isArray(res.data?.simulatedLogs) ? res.data.simulatedLogs : []);
    } catch (err) {
      setErrorMessage(
        err.response?.data?.error
        || (err.code === 'ECONNABORTED' ? 'The test took too long. Please try again.' : 'The workflow test could not be completed.')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-xl font-bold text-gray-900">Test Automation</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-grow">
          <p className="text-sm text-gray-600 mb-6">
            Run a dry-run using a subscribed contact stored in MySQL. No actual emails will be sent.
          </p>

          <div className="mb-6">
            <label htmlFor="automation-test-contact" className="block text-sm font-medium text-gray-700 mb-1">Database Contact</label>
            <select
              id="automation-test-contact"
              value={subscriberId}
              onChange={(event) => setSubscriberId(event.target.value)}
              disabled={contactsLoading}
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">{contactsLoading ? 'Loading database contacts…' : 'Select a contact…'}</option>
              {contacts.map((contact) => (
                <option key={contact.id} value={contact.id}>{contact.email}{contact.first_name ? ` — ${contact.first_name}` : ''}</option>
              ))}
            </select>
          </div>

          <button 
            type="button"
            onClick={handleTest}
            disabled={loading || contactsLoading || !subscriberId}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-medium py-2.5 rounded-lg hover:bg-blue-700 transition disabled:opacity-70"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} fill="currentColor" />}
            {loading ? 'Running Test...' : 'Start Dry Run'}
          </button>

          {errorMessage && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
              <AlertCircle className="mt-0.5 shrink-0" size={17} />
              <span>{errorMessage}</span>
            </div>
          )}

          {results && (
            <div className="mt-8">
              <h3 className="text-sm font-bold text-gray-800 mb-4 uppercase tracking-wider">Simulation Results</h3>
              <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                {results.map((log, idx) => (
                  <div key={idx} className="flex gap-4 p-4 border-b border-gray-100 last:border-0 bg-white">
                    <div className="flex flex-col items-center">
                      <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                        {idx + 1}
                      </div>
                      {idx !== results.length - 1 && <div className="w-px h-full bg-blue-100 my-1"></div>}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{log.action}</p>
                      <p className="text-xs text-gray-500 mt-1">Node ID: {log.node_id}</p>
                    </div>
                  </div>
                ))}
                {results.length > 0 && (
                  <div className="bg-green-50 p-3 text-center text-green-700 text-sm font-medium border-t border-green-100 flex items-center justify-center gap-2">
                    <CheckCircle2 size={16} /> Test completed successfully
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
