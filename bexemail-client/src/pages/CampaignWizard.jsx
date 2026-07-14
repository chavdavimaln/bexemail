import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { CheckCircle2, ChevronRight, ChevronLeft, Send, ShieldAlert, SplitSquareHorizontal } from 'lucide-react';
import { useLocation, useNavigate, Link } from 'react-router-dom';

const CampaignWizard = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [senders, setSenders] = useState([]);
  const [showAddSender, setShowAddSender] = useState(false);
  const [newSender, setNewSender] = useState({ name: '', email: '' });
  
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const editId = queryParams.get('edit');
  
  const isEditing = !!editId;
  
  // Mock current user role for demonstration
  const [userRole, setUserRole] = useState('Campaign Manager'); // 'Campaign Manager' requires approval

  const [formData, setFormData] = useState({
    campaignName: '',
    campaignType: 'regular',
    senderId: '',
    listId: '',
    subject: '',
    htmlContent: '',
    isAbTest: false,
    variantBSubject: '',
    variantBHtml: '',
    isTimezoneDelivery: false,
    useMultiLanguage: false
  });

  const updateForm = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/templates');
        setTemplates(response.data);
      } catch (error) {
        console.error('Failed to load templates:', error);
      }
    };
    
    const fetchCampaignToEdit = async () => {
      if (!editId) return;
      try {
        const response = await axios.get(`http://localhost:5000/api/campaigns/${editId}`, {
          headers: { 'x-user-role': userRole }
        });
        const c = response.data;
        setFormData({
          campaignName: c.name || '',
          campaignType: 'regular',
          senderId: c.sender_id ? c.sender_id.toString() : '',
          listId: c.list_id ? c.list_id.toString() : '',
          subject: c.subject || '',
          htmlContent: c.html_content || '',
          isAbTest: Boolean(c.is_ab_test),
          variantBSubject: c.variant_b_subject || '',
          variantBHtml: c.variant_b_html || '',
          isTimezoneDelivery: false,
          useMultiLanguage: false
        });
      } catch (error) {
        console.error('Failed to load campaign for editing:', error);
        alert('Could not load the campaign data.');
      }
    };
    
    const fetchSenders = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/senders');
        setSenders(response.data);
        if (response.data.length > 0 && !formData.senderId && !editId) {
          const defaultSender = response.data.find(s => s.is_default) || response.data[0];
          setFormData(prev => ({ ...prev, senderId: defaultSender.id.toString() }));
        }
      } catch (error) {
        console.error('Failed to load senders:', error);
      }
    };
    
    fetchTemplates();
    fetchSenders();
    fetchCampaignToEdit();
  }, [editId]);

  const handleAddSender = async () => {
    if (!newSender.name || !newSender.email) return;
    try {
      const response = await axios.post('http://localhost:5000/api/senders', newSender, {
        headers: { 'x-user-role': 'Super Admin' }
      });
      const addedSender = response.data;
      setSenders([...senders, addedSender]);
      setFormData(prev => ({ ...prev, senderId: addedSender.id.toString() }));
      setShowAddSender(false);
      setNewSender({ name: '', email: '' });
    } catch (error) {
      alert('Failed to add sender');
    }
  };

  const handleNext = () => setStep(prev => Math.min(prev + 1, 5));
  const handleBack = () => setStep(prev => Math.max(prev - 1, 1));

  const handleSend = async () => {
    // Validations
    if (!formData.campaignName.trim()) {
      alert('Campaign Name is required. Please fill it out.');
      setStep(1);
      return;
    }
    if (!formData.senderId) {
      alert('Sender Details are required. Please select a sender.');
      setStep(2);
      return;
    }
    if (!formData.listId) {
      alert('Target Audience is required. Please select a list.');
      setStep(3);
      return;
    }
    if (!formData.subject.trim() || !formData.htmlContent.trim()) {
      alert('Subject and Content are required. Please fill them out.');
      setStep(4);
      return;
    }

    setLoading(true);
    try {
      const headers = { 'x-user-role': userRole };
      if (isEditing) {
        await axios.put(`http://localhost:5000/api/campaigns/${editId}`, formData, { headers });
        await axios.put(`http://localhost:5000/api/campaigns/${editId}/status`, { status: 'submitted_for_review' }, { headers });
        if (userRole === 'Super Admin') {
          await axios.put(`http://localhost:5000/api/campaigns/${editId}/approve`, {}, { headers });
        }
      } else {
        await axios.post('http://localhost:5000/api/campaigns/dispatch', formData, { headers });
      }
      setSuccess(true);
    } catch (error) {
      console.error('Error sending campaign:', error);
      alert(error.response?.data?.error || 'Failed to send campaign');
    } finally {
      setLoading(false);
    }
  };

  const steps = ['Info', 'Sender', 'Audience', 'Content', 'Review'];

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center h-96 bg-white rounded-xl shadow-sm border border-gray-200">
        <CheckCircle2 className="text-green-500 mb-4" size={64} />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {userRole === 'Super Admin' ? 'Campaign Dispatched!' : 'Submitted for Review!'}
        </h2>
        <p className="text-gray-500 mb-6">
          {userRole === 'Super Admin' 
            ? 'Your campaign has been successfully queued for sending.' 
            : 'Your campaign has been sent to Super Admins for final approval.'}
        </p>
        <button 
          onClick={() => { setStep(1); setSuccess(false); setFormData({
            campaignName: '', campaignType: 'regular', senderId: '', listId: '', subject: '', htmlContent: '', isAbTest: false, variantBSubject: '', variantBHtml: ''
          })}}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
        >
          Create Another Campaign
        </button>
        <Link 
          to="/campaigns"
          className="mt-4 text-sm text-primary-600 hover:text-primary-800 font-medium transition-colors"
        >
          View Campaigns &rarr;
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Dev role toggler */}
      <div className="mb-4 flex justify-end">
        <label className="text-sm text-gray-500 flex items-center">
          Mock User Role: 
          <select 
            value={userRole} 
            onChange={e => setUserRole(e.target.value)} 
            className="ml-2 border border-gray-300 rounded px-2 py-1 text-xs outline-none"
          >
            <option value="Campaign Manager">Campaign Manager (Requires Approval)</option>
            <option value="Super Admin">Super Admin (Can Send)</option>
          </select>
        </label>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">{isEditing ? 'Edit Campaign' : 'Create New Campaign'}</h2>
        <p className="text-gray-500 mt-1">Follow the steps to configure and send your email blast.</p>
      </div>

      {/* Progress Bar */}
      <div className="flex items-center justify-between mb-8">
        {steps.map((s, i) => {
          const isCompleted = step > i + 1;
          const isCurrent = step === i + 1;
          const canClick = isEditing || isCompleted;
          
          return (
          <div key={s} className="flex flex-col items-center flex-1">
            <div 
              onClick={() => canClick && setStep(i + 1)}
              className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm transition-colors ${canClick ? 'cursor-pointer' : 'cursor-default'}
              ${isCompleted ? 'bg-green-500 text-white' : 
                isCurrent ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`}>
              {isCompleted ? <CheckCircle2 size={16} /> : i + 1}
            </div>
            <span className={`text-xs mt-2 font-medium ${step >= i + 1 ? 'text-gray-900' : 'text-gray-400'}`}>{s}</span>
          </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8">
        {/* Step 1: Info */}
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Campaign Information</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name</label>
              <input 
                type="text" 
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                placeholder="e.g., Summer Sale Announcement"
                value={formData.campaignName}
                onChange={e => updateForm('campaignName', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Type</label>
              <select 
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                value={formData.campaignType}
                onChange={e => updateForm('campaignType', e.target.value)}
              >
                <option value="regular">Regular Campaign</option>
                <option value="automated">Automated Series</option>
              </select>
            </div>
            
            <div className="pt-4 border-t border-gray-100">
              <label className="flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={formData.isAbTest}
                  onChange={e => updateForm('isAbTest', e.target.checked)}
                  className="rounded text-primary-600 focus:ring-primary-500 h-4 w-4 mr-3"
                />
                <div>
                  <span className="block text-sm font-medium text-gray-900 flex items-center">
                    <SplitSquareHorizontal size={16} className="mr-1 text-primary-500"/> Enable A/B Testing
                  </span>
                  <span className="block text-xs text-gray-500 mt-1">Test two different subjects or contents to see what performs best.</span>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Step 2: Sender */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Sender Details</h3>
            
            {!showAddSender ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Sender Profile</label>
                  <select 
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                    value={formData.senderId}
                    onChange={e => updateForm('senderId', e.target.value)}
                  >
                    <option value="">-- Choose a Sender --</option>
                    {senders.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} &lt;{s.email}&gt; {s.is_default ? '(Default)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <button 
                    onClick={() => setShowAddSender(true)}
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                  >
                    + Add New Sender Profile
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-4">
                <h4 className="text-sm font-semibold text-gray-900">Add New Sender Profile</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">From Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. BexEmail Team"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                    value={newSender.name}
                    onChange={e => setNewSender({...newSender, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">From Email</label>
                  <input 
                    type="email" 
                    placeholder="e.g. hello@bexemail.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                    value={newSender.email}
                    onChange={e => setNewSender({...newSender, email: e.target.value})}
                  />
                </div>
                <div className="flex space-x-3 pt-2">
                  <button 
                    onClick={handleAddSender}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium text-sm transition-colors"
                  >
                    Save & Use Sender
                  </button>
                  <button 
                    onClick={() => setShowAddSender(false)}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium text-sm transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Audience */}
        {step === 3 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Audience Selection</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Target List</label>
              <select 
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                value={formData.listId}
                onChange={e => updateForm('listId', e.target.value)}
              >
                <option value="">-- Choose a list --</option>
                <option value="1">All Subscribers (Mock)</option>
                <option value="2">VIP Customers (Mock)</option>
              </select>
            </div>
            {formData.isAbTest && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm text-blue-800">
                A/B Test configured: The system will send Variant A to 10% of this list, and Variant B to another 10%. The winner will be determined based on opens/clicks manually later.
              </div>
            )}
          </div>
        )}

        {/* Step 4: Content */}
        {step === 4 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Email Content</h3>
            
            <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-1">Use a Saved Template</label>
              <select 
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                onChange={(e) => {
                  const selectedId = e.target.value;
                  if (!selectedId) return;
                  const selectedTemplate = templates.find(t => t.id === parseInt(selectedId));
                  if (selectedTemplate) {
                    if (formData.isAbTest && e.target.dataset.variant === 'B') {
                       updateForm('variantBHtml', selectedTemplate.html_content);
                    } else {
                       updateForm('htmlContent', selectedTemplate.html_content);
                    }
                  }
                }}
              >
                <option value="">-- Start from scratch --</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.template_name} ({t.category})</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-2">Selecting a template will overwrite the HTML body below.</p>
            </div>

            <div className={formData.isAbTest ? "grid grid-cols-2 gap-6" : ""}>
              {/* Variant A (or default) */}
              <div className="space-y-4">
                {formData.isAbTest && <h4 className="font-semibold text-primary-600 bg-primary-50 px-3 py-1 rounded inline-block text-sm">Variant A</h4>}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject Line</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                    value={formData.subject}
                    onChange={e => updateForm('subject', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">HTML Body</label>
                  <textarea 
                    rows="8"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none font-mono text-sm"
                    value={formData.htmlContent}
                    onChange={e => updateForm('htmlContent', e.target.value)}
                  ></textarea>
                </div>
              </div>

              {formData.isAbTest && (
                <div className="space-y-4 border-l border-gray-200 pl-6">
                  <h4 className="font-semibold text-purple-600 bg-purple-50 px-3 py-1 rounded inline-block text-sm">Variant B</h4>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Use a Saved Template for Variant B</label>
                    <select 
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm"
                      data-variant="B"
                      onChange={(e) => {
                        const selectedId = e.target.value;
                        if (!selectedId) return;
                        const selectedTemplate = templates.find(t => t.id === parseInt(selectedId));
                        if (selectedTemplate) {
                          updateForm('variantBHtml', selectedTemplate.html_content);
                        }
                      }}
                    >
                      <option value="">-- Start from scratch --</option>
                      {templates.map(t => (
                        <option key={t.id} value={t.id}>{t.template_name} ({t.category})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject Line</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                      value={formData.variantBSubject}
                      onChange={e => updateForm('variantBSubject', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">HTML Body</label>
                    <textarea 
                      rows="8"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none font-mono text-sm"
                      value={formData.variantBHtml}
                      onChange={e => updateForm('variantBHtml', e.target.value)}
                    ></textarea>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 5: Review */}
        {step === 5 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Review & Send</h3>
            <div className="bg-gray-50 rounded-lg p-5 space-y-3">
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span className="text-gray-500">Campaign Name:</span>
                <span className="font-medium text-gray-900">{formData.campaignName || '(Missing)'}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span className="text-gray-500">Target List:</span>
                <span className="font-medium text-gray-900">List #{formData.listId || '(None)'}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span className="text-gray-500">A/B Testing:</span>
                <span className="font-medium text-gray-900">{formData.isAbTest ? 'Enabled (10% / 10% Split)' : 'Disabled'}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span className="text-gray-500">Delivery Method:</span>
                <span className="font-medium text-gray-900">
                  {formData.isTimezoneDelivery ? 'Subscriber Timezone (Global)' : 'Immediate (Server Time)'}
                </span>
              </div>
              <div className="flex justify-between pb-2">
                <span className="text-gray-500">Role Verification:</span>
                <span className="font-medium text-primary-600">{userRole}</span>
              </div>
            </div>

            <div className="space-y-4">
              <label className="flex items-center cursor-pointer p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                <input 
                  type="checkbox" 
                  checked={formData.isTimezoneDelivery}
                  onChange={e => updateForm('isTimezoneDelivery', e.target.checked)}
                  className="rounded text-primary-600 focus:ring-primary-500 h-4 w-4 mr-3"
                />
                <div>
                  <span className="block text-sm font-medium text-gray-900">Timezone-based Delivery</span>
                  <span className="block text-xs text-gray-500 mt-1">Send this campaign when it reaches the scheduled time in the subscriber's local timezone.</span>
                </div>
              </label>
              
              <label className="flex items-center cursor-pointer p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                <input 
                  type="checkbox" 
                  checked={formData.useMultiLanguage}
                  onChange={e => updateForm('useMultiLanguage', e.target.checked)}
                  className="rounded text-primary-600 focus:ring-primary-500 h-4 w-4 mr-3"
                />
                <div>
                  <span className="block text-sm font-medium text-gray-900">Multi-language Content</span>
                  <span className="block text-xs text-gray-500 mt-1">Dynamically swap content blocks based on the subscriber's language preference.</span>
                </div>
              </label>
            </div>

            {userRole === 'Campaign Manager' && (
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg flex items-center text-yellow-800 text-sm">
                <ShieldAlert size={20} className="mr-3 shrink-0" />
                As a Campaign Manager, you can only submit this campaign for review. A Super Admin must approve it before it sends.
              </div>
            )}
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="mt-8 flex justify-between items-center pt-6 border-t border-gray-100">
          <button 
            onClick={handleBack}
            disabled={step === 1 || loading}
            className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors
              ${step === 1 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100'}`}
          >
            <ChevronLeft size={16} className="mr-1" /> Back
          </button>

          {step < 5 ? (
            <button 
              onClick={handleNext}
              className="flex items-center px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
            >
              Next Step <ChevronRight size={16} className="ml-1" />
            </button>
          ) : (
            <button 
              onClick={handleSend}
              disabled={loading}
              className={`flex items-center px-6 py-2 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 
                ${userRole === 'Super Admin' ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-500 hover:bg-orange-600'}`}
            >
              {loading ? 'Processing...' : (userRole === 'Super Admin' ? 'Send Campaign' : 'Submit for Review')}
              {userRole === 'Super Admin' ? <Send size={16} className="ml-2" /> : <ShieldAlert size={16} className="ml-2" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CampaignWizard;
