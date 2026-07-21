import React from 'react';
import { Trash2 } from 'lucide-react';

export default function ConfigurationPanel({
  selectedNode,
  updateNodeData,
  onDeleteNode,
  automationId,
  automationInfo,
  setAutomationInfo,
  builderOptions,
}) {
  const apiOrigin = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : window.location.origin);
  const reentryPolicy = automationInfo?.reentry_policy || {};
  const updateAutomationInfo = (changes) => setAutomationInfo((current) => ({ ...current, ...changes }));
  const updateReentryPolicy = (changes) => setAutomationInfo((current) => ({
    ...current,
    reentry_policy: { ...(current.reentry_policy || {}), ...changes },
  }));

  if (!selectedNode) {
    return (
      <aside className="w-80 bg-white border-l border-gray-200 p-6 h-full overflow-y-auto">
        <h3 className="text-lg font-semibold text-gray-800 mb-6 border-b pb-2">Global Settings</h3>
        
        <div className="space-y-6">
          <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
            <h4 className="text-sm font-bold text-blue-900 mb-1">Re-entry Rules</h4>
            <p className="text-xs text-blue-700 mb-3">Control if and how often a subscriber can go through this automation again.</p>
            
            <label className="flex items-center gap-2 text-sm text-gray-800 mb-3 cursor-pointer">
              <input
                type="checkbox"
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                checked={reentryPolicy.allowReentry !== false}
                onChange={(event) => updateReentryPolicy({ allowReentry: event.target.checked })}
              />
              Allow subscribers to re-enter
            </label>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Cooldown period (days)</label>
              <input
                type="number"
                min="0"
                value={reentryPolicy.cooldownDays ?? 7}
                onChange={(event) => updateReentryPolicy({ cooldownDays: Number(event.target.value) || 0 })}
                className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Audience List</label>
            <select
              value={automationInfo?.audience_id || ''}
              onChange={(event) => updateAutomationInfo({ audience_id: event.target.value ? Number(event.target.value) : null })}
              className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All eligible subscribers</option>
              {builderOptions.lists.map((list) => <option key={list.id} value={list.id}>{list.name}</option>)}
            </select>
          </div>
          
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h4 className="text-sm font-bold text-gray-800 mb-1">Exit Conditions</h4>
            <p className="text-xs text-gray-500 mb-3">Remove a subscriber immediately if they meet these conditions.</p>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">If Tag is Added</label>
              <select 
                className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                value={reentryPolicy.exitTag || ''}
                onChange={(event) => updateReentryPolicy({ exitTag: event.target.value })}
              >
                <option value="">None</option>
                {builderOptions.tags.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
              </select>
            </div>
          </div>
        </div>
      </aside>
    );
  }

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    updateNodeData(selectedNode.id, { [e.target.name]: value });
  };

  return (
    <aside className="w-80 bg-white border-l border-gray-200 p-6 h-full overflow-y-auto flex flex-col">
      <div className="mb-6 flex items-center justify-between gap-3 border-b pb-3">
        <h3 className="text-lg font-semibold text-gray-800">
          {selectedNode.type.replace('Node', '')} Settings
        </h3>
        <button
          type="button"
          onClick={onDeleteNode}
          className="flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
          title="Delete this node and its connected lines"
        >
          <Trash2 size={14} /> Delete
        </button>
      </div>

      <div className="space-y-5">
        {/* ================= TRIGGER SETTINGS ================= */}
        {selectedNode.type === 'triggerNode' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Starting Point</label>
              <select
                name="label"
                value={selectedNode.data.label || ''}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="Subscriber joins list">Subscriber joins list</option>
                <option value="Tag added">Tag added</option>
                <option value="Webhook received">Webhook received</option>
                <optgroup label="Forms & Lead Gen">
                  <option value="Signup form submitted">Signup form submitted</option>
                  <option value="Contact form submitted">Contact form submitted</option>
                  <option value="Landing-page form submitted">Landing-page form submitted</option>
                  <option value="Survey submitted">Survey submitted</option>
                  <option value="Lead form submitted">Lead form submitted</option>
                  <option value="Event-registration form submitted">Event-registration form submitted</option>
                  <option value="Feedback form submitted">Feedback form submitted</option>
                  <option value="Specific form field selected">Specific form field selected</option>
                </optgroup>
                <optgroup label="E-Commerce (WooCommerce)">
                  <option value="Buys a specific product">Buys a specific product</option>
                  <option value="Abandoned cart">Abandoned cart</option>
                  <option value="Checkout started">Checkout started</option>
                  <option value="Order completed">Order completed</option>
                </optgroup>
              </select>
            </div>

            {/* If the admin selects Webhook as the starting point */}
            {selectedNode.data.label === 'Webhook received' && (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-md mt-4">
                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase">Your Webhook URL</label>
                <p className="text-xs text-gray-500 mb-2">
                  Send a POST request to this URL with a JSON payload containing `email`, `first_name`, and `last_name`.
                </p>
                <div className="flex">
                  <input
                    type="text"
                    readOnly
                    value={`${apiOrigin}/api/webhooks/automation/${automationId || 'new'}/${selectedNode.id}`}
                    className="w-full border-y border-l border-gray-300 rounded-l-md p-2 text-xs bg-white text-gray-600 focus:outline-none"
                  />
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(`${apiOrigin}/api/webhooks/automation/${automationId || 'new'}/${selectedNode.id}`);
                      alert('Webhook URL Copied!');
                    }}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-2 border border-gray-300 rounded-r-md text-xs font-bold transition"
                  >
                    Copy
                  </button>
                </div>
              </div>
            )}

            {/* Conditional Product Search if "Buys a specific product" is selected */}
            {selectedNode.data.label === 'Buys a specific product' && (
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-md mt-4">
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Select Product</label>
                <select
                  name="selectedProduct"
                  value={selectedNode.data.selectedProduct || ''}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Type a product name...</option>
                  {builderOptions.products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} - ${Number(p.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}</option>
                  ))}
                </select>
              </div>
            )}

            {/* If the admin selects "Specific form field selected" */}
            {selectedNode.data.label === 'Specific form field selected' && (
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-md mt-4 space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Field Name</label>
                  <input
                    type="text"
                    name="selectedField"
                    value={selectedNode.data.selectedField || ''}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="e.g. company_size"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Expected Value</label>
                  <input
                    type="text"
                    name="fieldValue"
                    value={selectedNode.data.fieldValue || ''}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="e.g. 50-100"
                  />
                </div>
              </div>
            )}
          </>
        )}

        {/* ================= ACTION SETTINGS (Tag/Untag) ================= */}
        {selectedNode.type === 'actionNode' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Action Type</label>
              <select
                name="actionType"
                value={selectedNode.data.actionType || 'addTag'}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="addTag">Add Tag</option>
                <option value="removeTag">Remove Tag</option>
                <option value="updateField">Update Field</option>
                <option value="webhook">Send Webhook</option>
                <option value="sendSms">Send SMS (Multichannel)</option>
                <optgroup label="Advanced Actions">
                  <option value="crmCreateLead">CRM: Create Lead</option>
                  <option value="crmUpdateDeal">CRM: Update Deal</option>
                  <option value="changeScore">Change Contact Score</option>
                  <option value="startWorkflow">Start Another Workflow</option>
                </optgroup>
              </select>
            </div>
            
            {(selectedNode.data.actionType === 'addTag' || selectedNode.data.actionType === 'removeTag' || !selectedNode.data.actionType) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Tag</label>
                <select
                  name="tag"
                  value={selectedNode.data.tag || ''}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a tag...</option>
                  {builderOptions.tags.map(tag => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>
              </div>
            )}

            {selectedNode.data.actionType === 'updateField' && (
              <div className="space-y-3 mt-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Field to Update</label>
                  <select name="updateField" value={selectedNode.data.updateField || ''} onChange={handleChange} className="w-full border border-gray-300 rounded-md p-2 text-sm">
                    <option value="status">Status</option>
                    <option value="country">Country</option>
                    <option value="custom_attribute">Custom Attribute</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">New Value</label>
                  <input type="text" name="updateValue" value={selectedNode.data.updateValue || ''} onChange={handleChange} className="w-full border border-gray-300 rounded-md p-2 text-sm" placeholder="e.g., USA" />
                </div>
              </div>
            )}

            {selectedNode.data.actionType === 'webhook' && (
              <div className="space-y-3 mt-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Webhook URL</label>
                  <input type="url" name="webhookUrl" value={selectedNode.data.webhookUrl || ''} onChange={handleChange} className="w-full border border-gray-300 rounded-md p-2 text-sm" placeholder="https://api.example.com/hook" />
                </div>
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-md text-xs text-blue-700">
                  A POST request will be sent to this URL with the subscriber's JSON data.
                </div>
              </div>
            )}

            {(selectedNode.data.actionType === 'crmCreateLead' || selectedNode.data.actionType === 'crmUpdateDeal') && (
              <div className="space-y-3 mt-3 p-3 bg-gray-50 border border-gray-200 rounded-md">
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">CRM Provider</label>
                <select name="crmProvider" value={selectedNode.data.crmProvider || 'salesforce'} onChange={handleChange} className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-blue-500">
                  <option value="salesforce">Salesforce</option>
                  <option value="hubspot">HubSpot</option>
                  <option value="pipedrive">Pipedrive</option>
                </select>
                <div className="text-xs text-gray-500 mt-2">
                  This action will securely authenticate with the selected CRM to {selectedNode.data.actionType === 'crmCreateLead' ? 'create a lead' : 'update a deal pipeline stage'}.
                </div>
              </div>
            )}

            {selectedNode.data.actionType === 'changeScore' && (
              <div className="space-y-3 mt-3">
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Modify Contact Score</label>
                <div className="flex items-center gap-2">
                  <select name="scoreOperator" value={selectedNode.data.scoreOperator || 'add'} onChange={handleChange} className="w-1/3 border border-gray-300 rounded-md p-2 text-sm">
                    <option value="add">Add (+)</option>
                    <option value="subtract">Subtract (-)</option>
                  </select>
                  <input type="number" name="scoreValue" value={selectedNode.data.scoreValue || 10} onChange={handleChange} min="1" className="w-2/3 border border-gray-300 rounded-md p-2 text-sm" placeholder="Points" />
                </div>
                <p className="text-xs text-gray-500">
                  Contact scoring helps identify highly engaged users.
                </p>
              </div>
            )}

            {selectedNode.data.actionType === 'sendSms' && (
              <div className="space-y-3 mt-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">SMS Message</label>
                  <textarea 
                    name="smsMessage" 
                    value={selectedNode.data.smsMessage || ''} 
                    onChange={handleChange} 
                    className="w-full border border-gray-300 rounded-md p-2 text-sm min-h-[80px]" 
                    placeholder="Type SMS content here..."
                  ></textarea>
                </div>
                <p className="text-xs text-gray-500">
                  Requires Twilio or AWS SNS integration configured in settings.
                </p>
              </div>
            )}

            {selectedNode.data.actionType === 'startWorkflow' && (
              <div className="space-y-3 mt-3">
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Select Automation to Start</label>
                <select name="targetWorkflow" value={selectedNode.data.targetWorkflow || ''} onChange={handleChange} className="w-full border border-gray-300 rounded-md p-2 text-sm">
                  <option value="">Select an automation...</option>
                  {builderOptions.automations
                    .filter((automation) => String(automation.id) !== String(automationId || ''))
                    .map((automation) => <option key={automation.id} value={automation.id}>{automation.name}</option>)}
                </select>
                <p className="text-xs text-gray-500">
                  The subscriber will be immediately added to the selected workflow.
                </p>
              </div>
            )}
          </>
        )}

        {/* ================= IF/ELSE SETTINGS ================= */}
        {selectedNode.type === 'ifElseNode' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Check Field</label>
              <select
                name="conditionField"
                value={selectedNode.data.conditionField || 'Tag'}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="Tag">Contact Tag</option>
                <option value="Country">Country</option>
                <option value="List">List Membership</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Operator</label>
              <select
                name="operator"
                value={selectedNode.data.operator || 'equals'}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="equals">Equals / Contains</option>
                <option value="not_equals">Does not equal</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
              <input
                type="text"
                name="label"
                value={selectedNode.data.label || ''}
                onChange={handleChange}
                placeholder="e.g., VIP Buyer"
                className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </>
        )}

        {/* ================= GOAL SETTINGS ================= */}
        {selectedNode.type === 'goalNode' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Goal Type</label>
              <select
                name="label"
                value={selectedNode.data.label || 'Made a purchase'}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="Made a purchase">Made a purchase</option>
                <option value="Submitted a form">Submitted a form</option>
                <option value="Clicked a link">Clicked a specific link</option>
              </select>
            </div>
            
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Conversion Value ($)</label>
              <input
                type="number"
                name="conversionValue"
                value={selectedNode.data.conversionValue || 0}
                onChange={handleChange}
                min="0"
                step="0.01"
                className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="0.00"
              />
              <p className="text-xs text-gray-500 mt-1">Leave as 0 if this goal has no direct monetary value.</p>
            </div>
            
            <div className="p-3 bg-green-50 text-green-800 text-xs rounded-md border border-green-200 mt-4">
              <strong>Note:</strong> When a subscriber reaches this step, they will be marked as a successful conversion and removed from the workflow.
            </div>
          </>
        )}

        {/* ================= DELAY SETTINGS ================= */}
        {selectedNode.type === 'delayNode' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Delay for</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  name="delayTime"
                  value={selectedNode.data.delayTime || 1}
                  onChange={handleChange}
                  min="1"
                  className="w-1/3 border border-gray-300 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                />
                <select
                  name="delayUnit"
                  value={selectedNode.data.delayUnit || 'days'}
                  onChange={handleChange}
                  className="w-2/3 border border-gray-300 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="minutes">Minutes</option>
                  <option value="hours">Hours</option>
                  <option value="days">Days</option>
                </select>
              </div>
            </div>
            
            <div className="flex flex-col gap-2 mt-4 mb-4">
              <label className="flex items-center text-sm text-gray-900 cursor-pointer">
                <input
                  type="checkbox"
                  name="skipWeekends"
                  checked={selectedNode.data.skipWeekends || false}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2"
                />
                Skip weekends
              </label>
              <label className="flex items-center text-sm text-gray-900 cursor-pointer">
                <input
                  type="checkbox"
                  name="smartTime"
                  checked={selectedNode.data.smartTime || false}
                  onChange={handleChange}
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded mr-2"
                />
                <span className="flex items-center gap-1">Send-Time Optimization <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-100 text-purple-700 font-bold uppercase">AI</span></span>
              </label>
              {selectedNode.data.smartTime && <p className="text-xs text-gray-500 ml-6">Delivers when the subscriber is historically most likely to open.</p>}
            </div>

            <div className="pt-4 border-t border-gray-200">
              <label className="block text-sm font-bold text-gray-700 mb-1">Wait Until Condition (Advanced)</label>
              <p className="text-xs text-gray-500 mb-2">Instead of a fixed time, wait until a specific event happens.</p>
              <select
                name="waitCondition"
                value={selectedNode.data.waitCondition || ''}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Do not use wait-until</option>
                <option value="opened_email">Opened an email</option>
                <option value="clicked_link">Clicked a link</option>
                <option value="purchased">Made a purchase</option>
              </select>
            </div>
          </>
        )}

        {/* ================= EMAIL SETTINGS ================= */}
        {(selectedNode.type === 'emailNode' || selectedNode.type === 'email') && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Subject</label>
              <input
                type="text"
                name="subject"
                value={selectedNode.data.subject || ''}
                onChange={handleChange}
                placeholder="e.g., Welcome to our newsletter!"
                className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Liquid tags like {'{{ first_name }}'} are supported here and in content.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Template</label>
              <select
                name="templateId"
                value={selectedNode.data.templateId || ''}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select a template...</option>
                {builderOptions.emailTemplates.map((template) => (
                  <option key={template.id} value={template.id}>{template.name}{template.category ? ` (${template.category})` : ''}</option>
                ))}
              </select>
            </div>
          </>
        )}

        {/* ================= SPLIT SETTINGS ================= */}
        {selectedNode.type === 'splitNode' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Percentage Split</label>
              <p className="text-xs text-gray-500 mb-3">Define how traffic should be split between Path A and Path B.</p>
              
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Path A (%)</label>
                  <input
                    type="number"
                    name="splitA"
                    value={selectedNode.data.splitA || 50}
                    onChange={(e) => {
                      const val = Math.min(100, Math.max(0, Number(e.target.value)));
                      updateNodeData(selectedNode.id, { splitA: val, splitB: 100 - val });
                    }}
                    className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Path B (%)</label>
                  <input
                    type="number"
                    name="splitB"
                    value={selectedNode.data.splitB || 50}
                    disabled
                    className="w-full border border-gray-300 rounded-md p-2 text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                  />
                </div>
              </div>
              
              <div className="mt-4 w-full h-2 rounded-full overflow-hidden flex">
                <div className="bg-blue-500 h-full transition-all" style={{ width: `${selectedNode.data.splitA || 50}%` }}></div>
                <div className="bg-purple-500 h-full transition-all" style={{ width: `${selectedNode.data.splitB || 50}%` }}></div>
              </div>
              <div className="flex justify-between mt-1 text-xs font-medium">
                <span className="text-blue-600">Path A</span>
                <span className="text-purple-600">Path B</span>
              </div>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
