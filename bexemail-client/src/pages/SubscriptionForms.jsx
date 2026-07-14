import React, { useState } from 'react';
import { Code, Copy, Layout, CheckCircle2 } from 'lucide-react';

const SubscriptionForms = () => {
  const [listId, setListId] = useState('1');
  const [copied, setCopied] = useState(false);

  const embedCode = `<form action="http://localhost:5000/api/webhooks/subscribe" method="POST" target="_blank" style="max-w-md mx-auto p-4 border rounded shadow-sm font-sans">
  <h3 style="margin-top:0;">Subscribe to our Newsletter</h3>
  <input type="hidden" name="list_id" value="${listId}" />
  
  <div style="margin-bottom: 15px;">
    <label style="display:block; margin-bottom:5px;">First Name</label>
    <input type="text" name="first_name" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px;" />
  </div>
  
  <div style="margin-bottom: 15px;">
    <label style="display:block; margin-bottom:5px;">Email Address *</label>
    <input type="email" name="email" required style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px;" />
  </div>
  
  <button type="submit" style="background:#0ea5e9; color:white; padding:10px 15px; border:none; border-radius:4px; cursor:pointer; width:100%;">
    Subscribe
  </button>
</form>`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Subscription Forms & Integrations</h2>
        <p className="text-gray-500 mt-1">Generate HTML forms to embed on external websites and collect subscribers directly into BexEmail.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Layout size={20} className="mr-2 text-primary-500" /> Form Configuration
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target List for Subscribers</label>
                <select 
                  value={listId}
                  onChange={(e) => setListId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                >
                  <option value="1">All Subscribers (Default)</option>
                  <option value="2">VIP Customers</option>
                  <option value="3">Newsletter</option>
                </select>
              </div>
              <p className="text-sm text-gray-500">
                When a user submits the form, they will automatically be added to this list in your database.
              </p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 p-6 rounded-xl text-blue-900">
            <h4 className="font-semibold mb-2 flex items-center">
              <Code size={18} className="mr-2 text-blue-600" /> Webhook Integration
            </h4>
            <p className="text-sm mb-3 text-blue-800">
              You can also use our webhook endpoint to integrate with Zapier, WooCommerce, or custom scripts:
            </p>
            <code className="block bg-white/50 p-3 rounded border border-blue-200 text-sm font-mono break-all">
              POST http://localhost:5000/api/webhooks/subscribe
            </code>
            <p className="text-sm mt-3 text-blue-800 font-medium">Payload required: <span className="font-mono">{"{ email: 'user@example.com' }"}</span></p>
          </div>
        </div>

        <div className="bg-gray-900 rounded-xl shadow-lg border border-gray-800 overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center bg-gray-800/50">
            <h3 className="text-gray-200 font-medium flex items-center">
              <Code size={18} className="mr-2 text-gray-400" /> HTML Embed Code
            </h3>
            <button 
              onClick={copyToClipboard}
              className="flex items-center px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors"
            >
              {copied ? <CheckCircle2 size={16} className="mr-1.5 text-green-400" /> : <Copy size={16} className="mr-1.5 text-gray-400" />}
              {copied ? 'Copied!' : 'Copy Code'}
            </button>
          </div>
          <div className="p-6 flex-1 bg-[#1e1e1e] overflow-auto">
            <pre className="text-sm font-mono text-gray-300">
              <code>{embedCode}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionForms;
