import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Mail, CheckCircle } from 'lucide-react';

export default function PreferenceCenter() {
  const { subscriberId } = useParams();
  const navigate = useNavigate();
  
  const [subscriber, setSubscriber] = useState(null);
  const [preferences, setPreferences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [globalUnsubscribe, setGlobalUnsubscribe] = useState(false);

  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const res = await axios.get(`/api/preferences/${subscriberId}`);
        setSubscriber(res.data.subscriber);
        setPreferences(res.data.preferences);
        setGlobalUnsubscribe(res.data.subscriber.status === 'unsubscribed');
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (subscriberId) {
      fetchPreferences();
    }
  }, [subscriberId]);

  const handleToggle = (listId) => {
    if (globalUnsubscribe) setGlobalUnsubscribe(false);
    setPreferences(prev => 
      prev.map(p => p.id === listId ? { ...p, isSubscribed: !p.isSubscribed } : p)
    );
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const activeListIds = preferences.filter(p => p.isSubscribed).map(p => p.id);
      await axios.post(`/api/preferences/${subscriberId}`, {
        listIds: activeListIds,
        globalUnsubscribe
      });
      setSuccess(true);
    } catch (err) {
      console.error('Failed to save preferences');
      alert('Failed to save preferences.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><p>Loading preferences...</p></div>;
  }

  if (!subscriber) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><p>Subscriber not found.</p></div>;
  }

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
        <div className="bg-white p-10 rounded-2xl shadow-xl max-w-md w-full text-center border border-gray-100">
          <div className="mx-auto bg-green-100 text-green-600 w-16 h-16 rounded-full flex items-center justify-center mb-6">
            <CheckCircle size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Preferences Updated</h2>
          <p className="text-gray-600">Your email preferences have been saved successfully. You can close this window.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <div className="mx-auto w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-blue-200">
            <Mail size={24} />
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900">Email Preferences</h2>
          <p className="mt-2 text-sm text-gray-600">
            Manage your subscription settings for <span className="font-semibold">{subscriber.email}</span>
          </p>
        </div>

        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl border border-gray-100 sm:px-10">
          <form onSubmit={handleSave} className="space-y-6">
            
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Newsletters & Updates</h3>
              <p className="text-sm text-gray-500 mb-4">Choose what you want to hear about:</p>
              
              {preferences.map((list) => (
                <label 
                  key={list.id} 
                  className={`flex items-start p-4 rounded-xl border-2 transition-all cursor-pointer ${
                    list.isSubscribed && !globalUnsubscribe ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center h-5">
                    <input
                      type="checkbox"
                      checked={list.isSubscribed && !globalUnsubscribe}
                      onChange={() => handleToggle(list.id)}
                      disabled={globalUnsubscribe}
                      className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </div>
                  <div className="ml-3 text-sm flex-1">
                    <span className={`font-semibold ${list.isSubscribed && !globalUnsubscribe ? 'text-blue-900' : 'text-gray-900'}`}>
                      {list.name}
                    </span>
                    {list.description && (
                      <p className={`mt-1 ${list.isSubscribed && !globalUnsubscribe ? 'text-blue-700' : 'text-gray-500'}`}>
                        {list.description}
                      </p>
                    )}
                  </div>
                </label>
              ))}
            </div>

            <div className="pt-6 border-t border-gray-200">
              <label className="flex items-start cursor-pointer group">
                <div className="flex items-center h-5">
                  <input
                    type="checkbox"
                    checked={globalUnsubscribe}
                    onChange={(e) => {
                      setGlobalUnsubscribe(e.target.checked);
                      if (e.target.checked) {
                        // Unsubscribe from everything visually
                        setPreferences(prev => prev.map(p => ({ ...p, isSubscribed: false })));
                      }
                    }}
                    className="h-5 w-5 text-red-600 border-gray-300 rounded focus:ring-red-500"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <span className="font-semibold text-gray-900 group-hover:text-red-600 transition">Unsubscribe from all emails</span>
                  <p className="text-gray-500 mt-1">You will no longer receive any marketing emails from us.</p>
                </div>
              </label>
            </div>

            <div className="pt-6">
              <button
                type="submit"
                disabled={saving}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Update Preferences'}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}
