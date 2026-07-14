import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { MailX, CheckCircle2, AlertCircle } from 'lucide-react';

const PreferenceCenter = () => {
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [reason, setReason] = useState('No longer interested');

  // In a real app, we'd fetch the user's current lists here and allow toggling.
  // For V1, we implement the master unsubscribe as requested.

  const handleUnsubscribe = async () => {
    setLoading(true);
    try {
      await axios.post(`http://localhost:5000/api/subscribers/unsubscribe/${id}`, { reason });
      setSuccess(true);
    } catch (error) {
      console.error('Error unsubscribing:', error);
      alert('Failed to update preferences. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm text-center border border-gray-200">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Unsubscribed Successfully</h2>
          <p className="text-gray-500 mb-6">You will no longer receive marketing emails from us.</p>
          <p className="text-sm text-gray-400">You can close this window now.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-500">
            <MailX size={32} />
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">Update Preferences</h2>
        <p className="text-gray-500 text-center mb-8">We're sorry to see you go. Please let us know why you are unsubscribing.</p>

        <div className="space-y-4 mb-8">
          <label className="flex items-center p-4 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
            <input 
              type="radio" 
              name="reason" 
              value="Emails are too frequent" 
              checked={reason === 'Emails are too frequent'}
              onChange={(e) => setReason(e.target.value)}
              className="text-primary-600 focus:ring-primary-500 h-4 w-4"
            />
            <span className="ml-3 text-gray-700">Emails are too frequent</span>
          </label>
          <label className="flex items-center p-4 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
            <input 
              type="radio" 
              name="reason" 
              value="Content is not relevant"
              checked={reason === 'Content is not relevant'}
              onChange={(e) => setReason(e.target.value)}
              className="text-primary-600 focus:ring-primary-500 h-4 w-4"
            />
            <span className="ml-3 text-gray-700">Content is not relevant</span>
          </label>
          <label className="flex items-center p-4 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
            <input 
              type="radio" 
              name="reason" 
              value="No longer interested"
              checked={reason === 'No longer interested'}
              onChange={(e) => setReason(e.target.value)}
              className="text-primary-600 focus:ring-primary-500 h-4 w-4"
            />
            <span className="ml-3 text-gray-700">No longer interested</span>
          </label>
        </div>

        <button 
          onClick={handleUnsubscribe}
          disabled={loading}
          className="w-full py-3 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center"
        >
          {loading ? 'Processing...' : 'Unsubscribe from all'}
        </button>
      </div>
    </div>
  );
};

export default PreferenceCenter;
