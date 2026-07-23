import React, { useState, useEffect, useRef } from 'react';
import EmailEditor from 'react-email-editor';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { Check, ChevronRight, ChevronLeft, Send, Calendar, Monitor, Users, FileText, Settings, User, GitBranch, Sparkles, X, RefreshCw, Mail } from 'lucide-react';

export default function CampaignWizard() {
  const emailEditorRef = useRef(null);
  const [editorMode, setEditorMode] = useState('visual'); // 'visual' or 'html'
  const [step, setStep] = useState(1);
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const editId = queryParams.get('edit');
  const isEditing = Boolean(editId);

  const [loading, setLoading] = useState(false);
  const [dispatchedSuccess, setDispatchedSuccess] = useState(false);
  const [senders, setSenders] = useState([]);
  const [lists, setLists] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [subscribers, setSubscribers] = useState([]);

  // AI Subject Line Generator state
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiTone, setAiTone] = useState('professional');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);

  // Add Sender state & Registered SMTP info
  const [showAddSender, setShowAddSender] = useState(false);
  const [systemSmtp, setSystemSmtp] = useState({});
  const [newSender, setNewSender] = useState({ 
    name: '', 
    email: '', 
    is_default: false
  });

  const [formData, setFormData] = useState({
    name: '', 
    subject: '', 
    sender_id: '',
    target_type: 'list', // 'list', 'individual_subscriber', or 'custom_email'
    list_id: '', 
    target_email: '',
    is_ab_test: false,
    variant_b_subject: '',
    variant_b_html: '',
    template_id: '',
    html_content: '',
    scheduled_at: ''
  });

  useEffect(() => {
    fetchData();
    if (editId) {
      fetchCampaignToEdit();
    }
  }, [editId]);

  const fetchCampaignToEdit = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/campaigns/${editId}`, {
        headers: { 'x-user-role': 'Super Admin' }
      });
      const c = res.data;
      setFormData(prev => ({
        ...prev,
        name: c.name || '',
        subject: c.subject || '',
        sender_id: c.sender_id ? c.sender_id.toString() : prev.sender_id,
        target_type: c.target_email ? 'custom_email' : 'list',
        list_id: c.list_id ? c.list_id.toString() : '',
        target_email: c.target_email || '',
        is_ab_test: Boolean(c.is_ab_test),
        variant_b_subject: c.variant_b_subject || '',
        variant_b_html: c.variant_b_html || '',
        template_id: c.template_id || '',
        html_content: c.html_content || '',
        scheduled_at: c.scheduled_at ? new Date(c.scheduled_at).toISOString().slice(0, 16) : ''
      }));
    } catch (error) {
      console.error('Failed to load campaign for editing:', error);
    }
  };

  const fetchData = async () => {
    try {
      const [sendersRes, listsRes, templatesRes, subscribersRes, settingsRes] = await Promise.all([
        axios.get('http://localhost:5000/api/senders').catch(() => ({ data: [] })),
        axios.get('http://localhost:5000/api/lists').catch(() => ({ data: [] })),
        axios.get('http://localhost:5000/api/templates').catch(() => ({ data: [] })),
        axios.get('http://localhost:5000/api/subscribers?limit=500').catch(() => ({ data: { data: [] } })),
        axios.get('http://localhost:5000/api/settings', { headers: { 'x-user-role': 'Super Admin' } }).catch(() => ({ data: {} }))
      ]);
      setSenders(sendersRes.data || []);
      setLists(listsRes.data || []);
      setTemplates(templatesRes.data || []);
      setSystemSmtp(settingsRes.data || {});
      
      const subData = subscribersRes.data?.data || (Array.isArray(subscribersRes.data) ? subscribersRes.data : []);
      setSubscribers(subData);

      if (sendersRes.data && sendersRes.data.length > 0 && !formData.sender_id) {
        const defaultSender = sendersRes.data.find(s => s.is_default) || sendersRes.data[0];
        setFormData(prev => ({ ...prev, sender_id: defaultSender.id.toString() }));
      }
    } catch (error) {
      console.error("Failed to fetch wizard data:", error);
    }
  };

  const handleAddSender = async () => {
    if (!newSender.name.trim() || !newSender.email.trim()) {
      alert('Sender Name and Email are required.');
      return;
    }

    try {
      const payload = {
        name: newSender.name,
        email: newSender.email,
        is_default: newSender.is_default
      };

      const res = await axios.post('http://localhost:5000/api/senders', payload, {
        headers: { 'x-user-role': 'Super Admin' }
      });

      const addedSender = res.data;
      setSenders(prev => [...prev, addedSender]);
      setFormData(prev => ({ ...prev, sender_id: addedSender.id.toString() }));
      setShowAddSender(false);
      setNewSender({ name: '', email: '', is_default: false });
      alert('Sender profile added successfully!');
    } catch (error) {
      console.error('Failed to add sender:', error);
      alert(error.response?.data?.error || 'Failed to add sender.');
    }
  };



  const handleGenerateSubjects = async () => {
    if (!aiTopic.trim()) return;
    setAiLoading(true);
    setAiSuggestions([]);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('http://localhost:5000/api/ai/generate-subject', 
        { topic: aiTopic, tone: aiTone },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      setAiSuggestions(res.data.subjects || []);
    } catch (err) {
      console.error('AI generation failed:', err);
    } finally {
      setAiLoading(false);
    }
  };

  const handleSelectSubject = (subject) => {
    setFormData(prev => ({ ...prev, subject }));
    setShowAiModal(false);
    setAiSuggestions([]);
    setAiTopic('');
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleNext = () => {
    if (step === 6 && editorMode === 'visual' && emailEditorRef.current?.editor) {
      emailEditorRef.current.editor.exportHtml((data) => {
        const { html } = data;
        if (html) {
          setFormData(prev => ({ ...prev, html_content: html }));
        }
        setStep(prev => Math.min(prev + 1, 8));
      });
      return;
    }
    setStep(prev => Math.min(prev + 1, 8));
  };

  const handlePrev = () => {
    setStep(prev => Math.max(prev - 1, 1));
  };

  const handleTemplateSelect = (template) => {
    setFormData(prev => ({
      ...prev,
      template_id: template.id || '',
      html_content: template.html_content || ''
    }));
    handleNext();
  };

  const handleDispatch = async () => {
    if (step === 6 && editorMode === 'visual' && emailEditorRef.current?.editor) {
      await new Promise((resolve) => {
        emailEditorRef.current.editor.exportHtml((data) => {
          if (data?.html) {
            setFormData(prev => ({ ...prev, html_content: data.html }));
          }
          resolve();
        });
      });
    }

    if (!formData.name.trim()) {
      alert('Campaign Name is required. Please fill it out in Step 1.');
      setStep(1);
      return;
    }
    if (!formData.subject.trim()) {
      alert('Subject Line is required. Please fill it out in Step 1.');
      setStep(1);
      return;
    }
    if (!formData.sender_id) {
      alert('Sender is required. Please select a sender in Step 2.');
      setStep(2);
      return;
    }
    if (formData.target_type === 'list' && !formData.list_id) {
      alert('Audience list is required. Please select a list in Step 3.');
      setStep(3);
      return;
    }
    if ((formData.target_type === 'individual_subscriber' || formData.target_type === 'custom_email') && !formData.target_email.trim()) {
      alert('Target Email Address is required. Please select or enter an email in Step 3.');
      setStep(3);
      return;
    }

    setLoading(true);
    try {
      const isSingleEmail = formData.target_type === 'individual_subscriber' || formData.target_type === 'custom_email';
      const payload = {
        name: formData.name,
        campaignName: formData.name,
        subject: formData.subject,
        sender_id: formData.sender_id,
        senderId: formData.sender_id,
        list_id: isSingleEmail ? null : formData.list_id,
        listId: isSingleEmail ? null : formData.list_id,
        target_email: isSingleEmail ? formData.target_email.trim() : null,
        targetEmail: isSingleEmail ? formData.target_email.trim() : null,
        is_ab_test: formData.is_ab_test,
        isAbTest: formData.is_ab_test,
        variant_b_subject: formData.variant_b_subject,
        variantBSubject: formData.variant_b_subject,
        variant_b_html: formData.variant_b_html,
        variantBHtml: formData.variant_b_html,
        template_id: formData.template_id,
        html_content: formData.html_content,
        htmlContent: formData.html_content,
        scheduled_at: formData.scheduled_at || null,
        status: formData.scheduled_at ? 'scheduled' : 'sending'
      };

      if (isEditing) {
        await axios.put(`http://localhost:5000/api/campaigns/${editId}`, payload, {
          headers: { 'x-user-role': 'Super Admin' }
        }).catch(() => {});
      }

      await axios.post('http://localhost:5000/api/campaigns_wizard/dispatch', payload);
      setDispatchedSuccess(true);
    } catch (error) {
      console.error('Dispatch error:', error);
      alert(error.response?.data?.error || 'Failed to dispatch campaign.');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { id: 1, title: 'Setup', icon: <Settings size={18} /> },
    { id: 2, title: 'Sender', icon: <User size={18} /> },
    { id: 3, title: 'Audience', icon: <Users size={18} /> },
    { id: 4, title: 'A/B Test', icon: <GitBranch size={18} /> },
    { id: 5, title: 'Template', icon: <FileText size={18} /> },
    { id: 6, title: 'Editor', icon: <Monitor size={18} /> },
    { id: 7, title: 'Schedule', icon: <Calendar size={18} /> },
    { id: 8, title: 'Review', icon: <Check size={18} /> },
  ];

  if (dispatchedSuccess) {
    return (
      <div className="max-w-2xl mx-auto my-12 bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
        <div className="w-16 h-16 rounded-full bg-green-100 border border-green-200 flex items-center justify-center mx-auto text-green-600 shadow-sm">
          <Check size={36} />
        </div>

        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1.5">
            {formData.scheduled_at ? 'Campaign Scheduled Successfully!' : 'Campaign Dispatched Successfully!'}
          </h2>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            Your campaign <strong className="text-gray-800">{formData.name}</strong> has been saved and queued for sending in the database.
          </p>
        </div>

        {/* Action Options */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button 
            type="button"
            onClick={() => {
              setDispatchedSuccess(false);
              setStep(1);
              setFormData({
                name: '', 
                subject: '', 
                sender_id: senders[0]?.id?.toString() || '',
                target_type: 'list',
                list_id: '', 
                target_email: '',
                is_ab_test: false,
                variant_b_subject: '',
                variant_b_html: '',
                template_id: '',
                html_content: '',
                scheduled_at: ''
              });
            }}
            className="w-full sm:w-auto px-5 py-2.5 bg-primary-600 text-white rounded-xl text-xs font-bold hover:bg-primary-700 transition-all shadow-sm flex items-center justify-center gap-2"
          >
            + Create Another Campaign
          </button>

          <button 
            type="button"
            onClick={() => {
              setDispatchedSuccess(false);
              setStep(8);
            }}
            className="w-full sm:w-auto px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition-all border border-gray-300 flex items-center justify-center gap-2"
          >
            🔍 Go to Review Campaign
          </button>

          <button 
            type="button"
            onClick={() => navigate('/campaigns')}
            className="w-full sm:w-auto px-5 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
          >
            📋 View Campaigns List &rarr;
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{isEditing ? 'Edit Campaign' : 'Create Campaign'}</h1>
        
        {/* Top Right Select Dropdown */}
        <div className="flex items-center gap-2">
          <select
            defaultValue="review"
            onChange={(e) => {
              const val = e.target.value;
              if (val === 'review') setStep(8);
              if (val === 'direct_send') handleDispatch();
            }}
            className="px-4 py-2.5 bg-white border border-gray-300 hover:border-gray-400 text-gray-800 text-xs font-bold rounded-xl transition-all shadow-sm focus:ring-2 focus:ring-primary-500 outline-none cursor-pointer"
          >
            <option value="review">✓ Review Campaign</option>
            <option value="direct_send">🚀 Direct Send Campaign</option>
          </select>
        </div>
      </div>

      {/* Progress Bar - Responsive & Clickable */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="overflow-x-auto no-scrollbar py-1">
          <div className="flex items-center justify-between min-w-[760px] px-2">
            {steps.map((s, index) => (
              <div 
                key={s.id} 
                onClick={() => setStep(s.id)}
                className="flex items-center cursor-pointer group hover:opacity-90 transition-opacity"
              >
                <div className={`flex items-center justify-center w-9 h-9 rounded-full border-2 transition-all ${
                  step > s.id 
                    ? 'bg-primary-600 border-primary-600 text-white' 
                    : step === s.id 
                      ? 'border-primary-600 text-primary-600 bg-primary-50 ring-4 ring-primary-100' 
                      : 'border-gray-200 text-gray-400 group-hover:border-gray-300'
                }`}>
                  {step > s.id ? <Check size={18} /> : s.icon}
                </div>
                <div className="ml-2.5">
                  <p className={`text-[10px] uppercase tracking-wider font-bold ${step === s.id ? 'text-primary-700' : 'text-gray-400'}`}>Step {s.id}</p>
                  <p className={`text-xs font-semibold whitespace-nowrap ${step === s.id ? 'text-primary-700' : 'text-gray-700'}`}>{s.title}</p>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-4 md:w-8 h-0.5 mx-2 md:mx-3 rounded ${step > s.id ? 'bg-primary-600' : 'bg-gray-200'}`}></div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 min-h-[400px]">
        
        {step === 1 && (
          <div className="space-y-6 max-w-2xl mx-auto animate-in fade-in zoom-in-95 duration-300">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Basic Setup</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Internal Campaign Name <span className="text-red-500">*</span></label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full border border-gray-300 rounded-lg p-3 focus:ring-primary-500 focus:border-primary-500" placeholder="e.g. Summer Sale 2026" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email Subject Line <span className="text-red-500">*</span></label>
              <div className="flex gap-2">
                <input type="text" name="subject" value={formData.subject} onChange={handleChange} className="flex-1 border border-gray-300 rounded-lg p-3 focus:ring-primary-500 focus:border-primary-500" placeholder="Check out our latest deals!" />
                <button
                  type="button"
                  onClick={() => setShowAiModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold rounded-lg hover:from-violet-700 hover:to-indigo-700 transition-all shadow-md shadow-indigo-500/30 whitespace-nowrap"
                >
                  <Sparkles size={16} />
                  AI Generate
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Click "AI Generate" to get AI-powered subject line suggestions.</p>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 max-w-2xl mx-auto animate-in fade-in zoom-in-95 duration-300">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2 border-b border-gray-100 pb-3">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Sender Details</h2>
                <p className="text-xs text-gray-500 mt-0.5">Select a sender profile for your campaign.</p>
              </div>
              {!showAddSender && (
                <button
                  type="button"
                  onClick={() => {
                    setNewSender({ name: '', email: '', is_default: false });
                    setShowAddSender(true);
                  }}
                  className="text-xs font-semibold text-primary-600 hover:text-primary-800 bg-primary-50 px-3 py-1.5 rounded-lg border border-primary-200 transition-all flex items-center gap-1 shadow-sm shrink-0"
                >
                  + Add New Sender
                </button>
              )}
            </div>

            {!showAddSender ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Who is sending this email? <span className="text-red-500">*</span></label>
                  <select name="sender_id" value={formData.sender_id} onChange={handleChange} className="w-full border border-gray-300 rounded-lg p-3 focus:ring-primary-500 focus:border-primary-500 text-sm bg-white font-medium">
                    <option value="">Select a sender...</option>
                    {senders.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} &lt;{s.email}&gt; {s.is_default ? '(Default)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Read-Only Registered SMTP Banner */}
                <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-100 border border-blue-200 flex items-center justify-center shrink-0">
                      <Mail size={18} className="text-blue-600" />
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-gray-900">
                        Registered SMTP Email: <span className="text-blue-700">{systemSmtp.smtp_user || 'info@bexcodeservices.com'}</span>
                      </span>
                      <span className="block text-[11px] text-gray-500 mt-0.5">
                        All campaign emails are dispatched securely using this registered SMTP configuration.
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 bg-gray-50 border border-gray-200 rounded-xl space-y-4">
                <div className="flex justify-between items-center border-b border-gray-200 pb-3">
                  <h3 className="text-base font-bold text-gray-900">Add New Sender Profile</h3>
                  <button 
                    type="button" 
                    onClick={() => setShowAddSender(false)}
                    className="text-xs text-gray-500 hover:text-gray-700 font-medium"
                  >
                    Cancel
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">From Name <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      placeholder="e.g. Vimal"
                      className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-primary-500 outline-none bg-white"
                      value={newSender.name}
                      onChange={e => setNewSender({ ...newSender, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">From Email <span className="text-red-500">*</span></label>
                    <input 
                      type="email" 
                      placeholder="e.g. vimal@bexcodeservices.com"
                      className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-primary-500 outline-none bg-white"
                      value={newSender.email}
                      onChange={e => setNewSender({ ...newSender, email: e.target.value })}
                    />
                  </div>
                </div>

                <div className="pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700">
                    <input 
                      type="checkbox"
                      checked={newSender.is_default}
                      onChange={e => setNewSender({ ...newSender, is_default: e.target.checked })}
                      className="rounded text-primary-600 focus:ring-primary-500"
                    />
                    Set as default sender profile
                  </label>
                </div>

                {/* Read-Only Registered SMTP Info */}
                <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-lg text-xs text-gray-700">
                  Registered SMTP Email: <strong className="text-blue-700">{systemSmtp.smtp_user || 'info@bexcodeservices.com'}</strong>
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    type="button"
                    onClick={handleAddSender}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-semibold text-xs transition-colors shadow-sm"
                  >
                    Save & Use Sender
                  </button>
                  <button 
                    type="button"
                    onClick={() => setShowAddSender(false)}
                    className="px-4 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 rounded-lg font-semibold text-xs transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 max-w-2xl mx-auto animate-in fade-in zoom-in-95 duration-300">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Target Audience</h2>
              <p className="text-xs text-gray-500">Choose how you want to select recipients for this campaign.</p>
            </div>

            {/* Target Type Selection Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-2.5 ${
                formData.target_type === 'list' 
                  ? 'border-primary-600 bg-primary-50/50 shadow-sm' 
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}>
                <input 
                  type="radio" 
                  name="target_type" 
                  value="list" 
                  checked={formData.target_type === 'list'} 
                  onChange={handleChange}
                  className="mt-0.5 text-primary-600 focus:ring-primary-500"
                />
                <div>
                  <span className="block text-xs font-bold text-gray-900">Subscriber List</span>
                  <span className="block text-[11px] text-gray-500 mt-0.5 leading-tight">Send to a saved contact list.</span>
                </div>
              </label>

              <label className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-2.5 ${
                formData.target_type === 'individual_subscriber' 
                  ? 'border-primary-600 bg-primary-50/50 shadow-sm' 
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}>
                <input 
                  type="radio" 
                  name="target_type" 
                  value="individual_subscriber" 
                  checked={formData.target_type === 'individual_subscriber'} 
                  onChange={handleChange}
                  className="mt-0.5 text-primary-600 focus:ring-primary-500"
                />
                <div>
                  <span className="block text-xs font-bold text-gray-900">Select Individual Contact</span>
                  <span className="block text-[11px] text-gray-500 mt-0.5 leading-tight">Select an existing contact from DB.</span>
                </div>
              </label>

              <label className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-2.5 ${
                formData.target_type === 'custom_email' 
                  ? 'border-primary-600 bg-primary-50/50 shadow-sm' 
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}>
                <input 
                  type="radio" 
                  name="target_type" 
                  value="custom_email" 
                  checked={formData.target_type === 'custom_email'} 
                  onChange={handleChange}
                  className="mt-0.5 text-primary-600 focus:ring-primary-500"
                />
                <div>
                  <span className="block text-xs font-bold text-gray-900">Custom Email Address</span>
                  <span className="block text-[11px] text-gray-500 mt-0.5 leading-tight">Type an individual email address.</span>
                </div>
              </label>
            </div>

            {/* Option A: Select List */}
            {formData.target_type === 'list' && (
              <div className="pt-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Which list should receive this? <span className="text-red-500">*</span></label>
                <select name="list_id" value={formData.list_id} onChange={handleChange} className="w-full border border-gray-300 rounded-lg p-3 focus:ring-primary-500 focus:border-primary-500 text-sm bg-white">
                  <option value="">Select an audience list...</option>
                  {lists.map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Option B: Select Individual Subscriber from Database */}
            {formData.target_type === 'individual_subscriber' && (
              <div className="pt-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Select Individual Subscriber <span className="text-red-500">*</span></label>
                <select 
                  name="target_email" 
                  value={formData.target_email} 
                  onChange={handleChange} 
                  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-primary-500 focus:border-primary-500 text-sm bg-white"
                >
                  <option value="">Select an individual subscriber email...</option>
                  {subscribers.map(sub => (
                    <option key={sub.id} value={sub.email}>
                      {sub.email} {sub.first_name ? `(${sub.first_name})` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-2">Select an existing contact from your database to send this single email campaign to.</p>
              </div>
            )}

            {/* Option C: Custom Target Email Input */}
            {formData.target_type === 'custom_email' && (
              <div className="pt-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Target Email Address <span className="text-red-500">*</span></label>
                <input 
                  type="email" 
                  name="target_email" 
                  value={formData.target_email} 
                  onChange={handleChange} 
                  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-primary-500 focus:border-primary-500 text-sm bg-white" 
                  placeholder="e.g. recipient@example.com or vimal@bexcodeservices.com" 
                />
                <p className="text-xs text-gray-500 mt-2">Type the target email address for this individual campaign send.</p>
              </div>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in zoom-in-95 duration-300">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-gray-100 pb-3 mb-2">
              <div>
                <h2 className="text-xl font-bold text-gray-900">A/B Testing Configuration</h2>
                <p className="text-xs text-gray-500">Test different subject lines and HTML email content to compare performance.</p>
              </div>
              <div className="flex items-center bg-gray-50 border border-gray-200 px-3.5 py-2 rounded-xl shadow-sm">
                <input 
                  type="checkbox" 
                  id="is_ab_test" 
                  name="is_ab_test" 
                  checked={formData.is_ab_test} 
                  onChange={handleChange} 
                  className="h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500 cursor-pointer" 
                />
                <label htmlFor="is_ab_test" className="ml-2 text-xs font-bold text-gray-800 cursor-pointer">
                  Enable A/B Testing (10% / 10% Split)
                </label>
              </div>
            </div>

            {!formData.is_ab_test ? (
              <div className="p-8 text-center bg-gray-50 border border-dashed border-gray-300 rounded-xl space-y-3">
                <GitBranch size={38} className="mx-auto text-gray-400" />
                <h3 className="text-base font-bold text-gray-800">A/B Testing is Currently Disabled</h3>
                <p className="text-xs text-gray-500 max-w-md mx-auto">
                  Your campaign will send a single version using the subject line from Step 1 and content from Step 6. Check "Enable A/B Testing" above to configure Variant A vs. Variant B.
                </p>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, is_ab_test: true }))}
                  className="px-4 py-2 bg-primary-600 text-white font-semibold text-xs rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
                >
                  Enable A/B Test Now
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Variant A Column */}
                  <div className="p-5 bg-blue-50/40 border border-blue-200 rounded-xl space-y-4 shadow-sm">
                    <div className="flex justify-between items-center border-b border-blue-200 pb-2.5">
                      <span className="font-bold text-xs text-blue-700 bg-blue-100 px-2.5 py-1 rounded-md uppercase tracking-wider">
                        Variant A (Primary)
                      </span>
                      <span className="text-[11px] text-blue-600 font-medium">Sends to 10%</span>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="block text-xs font-bold text-gray-700">Subject Line A <span className="text-red-500">*</span></label>
                        <button
                          type="button"
                          onClick={() => { setAiTargetField('subject'); setShowAiModal(true); }}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800"
                        >
                          <Sparkles size={12} /> AI Generate
                        </button>
                      </div>
                      <input 
                        type="text" 
                        name="subject" 
                        value={formData.subject} 
                        onChange={handleChange} 
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-blue-500 outline-none bg-white" 
                        placeholder="Variant A Subject Line..." 
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">HTML Body A</label>
                      <textarea 
                        name="html_content" 
                        rows="7" 
                        value={formData.html_content} 
                        onChange={handleChange} 
                        className="w-full p-3 border border-gray-300 rounded-lg text-xs font-mono focus:ring-blue-500 outline-none bg-white leading-relaxed" 
                        placeholder="<h1>Hello from Variant A</h1>" 
                      />
                    </div>
                  </div>

                  {/* Variant B Column */}
                  <div className="p-5 bg-purple-50/40 border border-purple-200 rounded-xl space-y-4 shadow-sm">
                    <div className="flex justify-between items-center border-b border-purple-200 pb-2.5">
                      <span className="font-bold text-xs text-purple-700 bg-purple-100 px-2.5 py-1 rounded-md uppercase tracking-wider">
                        Variant B (Test)
                      </span>
                      <span className="text-[11px] text-purple-600 font-medium">Sends to 10%</span>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="block text-xs font-bold text-gray-700">Subject Line B <span className="text-red-500">*</span></label>
                        <button
                          type="button"
                          onClick={() => { setAiTargetField('variant_b_subject'); setShowAiModal(true); }}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-600 hover:text-purple-800"
                        >
                          <Sparkles size={12} /> AI Generate
                        </button>
                      </div>
                      <input 
                        type="text" 
                        name="variant_b_subject" 
                        value={formData.variant_b_subject} 
                        onChange={handleChange} 
                        className="w-full px-3 py-2 border border-purple-300 rounded-lg text-xs focus:ring-purple-500 outline-none bg-white" 
                        placeholder="Variant B Subject Line..." 
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">HTML Body B</label>
                      <textarea 
                        name="variant_b_html" 
                        rows="7" 
                        value={formData.variant_b_html} 
                        onChange={handleChange} 
                        className="w-full p-3 border border-purple-300 rounded-lg text-xs font-mono focus:ring-purple-500 outline-none bg-white leading-relaxed" 
                        placeholder="<h1>Hello from Variant B</h1>" 
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 5 && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-gray-100 pb-3">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Select Template</h2>
                <p className="text-xs text-gray-500 mt-0.5">Start with a blank canvas or pick a pre-designed email template.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Blank Template Card with Drag & Drop or HTML Code options */}
              <div className="border-2 border-dashed border-primary-300 rounded-2xl p-6 flex flex-col items-center justify-between text-center bg-primary-50/30 hover:bg-primary-50/70 transition-all space-y-4 shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-primary-100 flex items-center justify-center text-primary-600 shadow-sm mt-2">
                  <FileText size={32} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Blank Template</h3>
                  <p className="text-xs text-gray-500 mt-1">Start from scratch using Drag & Drop Builder or HTML Code Editor.</p>
                </div>
                
                <div className="w-full space-y-2 pt-2">
                  <button 
                    type="button"
                    onClick={() => {
                      setEditorMode('visual');
                      handleTemplateSelect({ id: '', html_content: '' });
                    }}
                    className="w-full py-2.5 px-3 bg-primary-600 text-white rounded-xl text-xs font-bold hover:bg-primary-700 transition-colors shadow-sm flex items-center justify-center gap-1.5"
                  >
                    🎨 Open Drag & Drop Builder
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      setEditorMode('html');
                      handleTemplateSelect({ id: '', html_content: '' });
                    }}
                    className="w-full py-2 px-3 bg-white border border-gray-300 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-100 transition-colors flex items-center justify-center gap-1.5"
                  >
                    💻 Use HTML Code Editor
                  </button>
                </div>
              </div>

              {/* Pre-designed templates */}
              {templates.map(t => (
                <div 
                  key={t.id} 
                  className={`border-2 rounded-2xl p-4 cursor-pointer transition-all flex flex-col justify-between ${
                    formData.template_id === t.id 
                      ? 'border-primary-500 bg-primary-50/50 ring-2 ring-primary-200 shadow-md' 
                      : 'border-gray-200 hover:border-primary-300 hover:shadow-sm bg-white'
                  }`}
                  onClick={() => {
                    setEditorMode('html');
                    handleTemplateSelect(t);
                  }}
                >
                  <div>
                    <div className="w-full h-36 bg-gray-100 rounded-xl mb-3 flex items-center justify-center overflow-hidden border border-gray-200/80">
                      <iframe srcDoc={t.html_content} title={t.name || t.template_name} className="w-[400%] h-[400%] origin-top-left scale-25 pointer-events-none" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-sm">{t.name || t.template_name}</h3>
                  </div>
                  <button 
                    type="button" 
                    className="mt-3 w-full py-2 bg-gray-100 hover:bg-primary-600 hover:text-white text-gray-700 text-xs font-bold rounded-lg transition-colors"
                  >
                    Use This Template
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300 h-full flex flex-col">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-gray-100 pb-3">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Email Content Editor</h2>
                <p className="text-xs text-gray-500 mt-0.5">Customize your email template content before sending.</p>
              </div>

              {/* Editor Mode Tabs */}
              <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
                <button
                  type="button"
                  onClick={() => setEditorMode('visual')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    editorMode === 'visual' 
                      ? 'bg-white text-primary-700 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  🎨 Drag & Drop Builder
                </button>
                <button
                  type="button"
                  onClick={() => setEditorMode('html')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    editorMode === 'html' 
                      ? 'bg-white text-primary-700 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  💻 HTML Code
                </button>
              </div>
            </div>

            {editorMode === 'visual' ? (
              <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm min-h-[650px] bg-white">
                <EmailEditor 
                  ref={emailEditorRef} 
                  minHeight="650px" 
                />
              </div>
            ) : (
              <div className="space-y-2">
                <textarea 
                  name="html_content" 
                  value={formData.html_content} 
                  onChange={handleChange} 
                  className="w-full min-h-[500px] border border-gray-300 rounded-xl p-4 font-mono text-xs focus:ring-primary-500 focus:border-primary-500 leading-relaxed bg-white shadow-sm" 
                  placeholder="<h1>Type or paste your custom HTML code here...</h1>" 
                />
              </div>
            )}
          </div>
        )}

        {step === 7 && (
          <div className="space-y-6 max-w-3xl mx-auto animate-in fade-in zoom-in-95 duration-300">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Dispatch & Scheduling Options</h2>
              <p className="text-xs text-gray-500 mt-0.5">Select how and when you want to send this email campaign before final review.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Direct Send */}
              <div 
                onClick={() => {
                  setFormData(prev => ({ ...prev, scheduled_at: '', dispatch_option: 'direct_send' }));
                }}
                className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                  (!formData.dispatch_option || formData.dispatch_option === 'direct_send') && !formData.scheduled_at
                    ? 'border-green-500 bg-green-50/50 ring-2 ring-green-200 shadow-md' 
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-green-100 text-green-600 flex items-center justify-center mb-3">
                    <Send size={20} />
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm">Direct Send</h3>
                  <p className="text-xs text-gray-500 mt-1">Send emails immediately upon completing final review in Step 8.</p>
                </div>
                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-green-700">
                  <span>Immediate Send</span>
                  <span>{(!formData.dispatch_option || formData.dispatch_option === 'direct_send') && !formData.scheduled_at ? '✓ Active' : ''}</span>
                </div>
              </div>

              {/* Submit for Review */}
              <div 
                onClick={() => {
                  setFormData(prev => ({ ...prev, scheduled_at: '', dispatch_option: 'review' }));
                }}
                className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                  formData.dispatch_option === 'review' 
                    ? 'border-amber-500 bg-amber-50/50 ring-2 ring-amber-200 shadow-md' 
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mb-3">
                    <Check size={20} />
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm">Send to Review</h3>
                  <p className="text-xs text-gray-500 mt-1">Submit campaign for admin review & approval before sending.</p>
                </div>
                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-amber-700">
                  <span>Needs Approval</span>
                  <span>{formData.dispatch_option === 'review' ? '✓ Active' : ''}</span>
                </div>
              </div>

              {/* Schedule */}
              <div 
                onClick={() => {
                  setFormData(prev => ({ ...prev, dispatch_option: 'schedule' }));
                }}
                className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                  (formData.dispatch_option === 'schedule' || formData.scheduled_at)
                    ? 'border-purple-500 bg-purple-50/50 ring-2 ring-purple-200 shadow-md' 
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center mb-3">
                    <Calendar size={20} />
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm">Schedule Campaign</h3>
                  <p className="text-xs text-gray-500 mt-1">Set a specific future date & time to deliver emails automatically.</p>
                </div>
                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-purple-700">
                  <span>Future Date & Time</span>
                  <span>{(formData.dispatch_option === 'schedule' || formData.scheduled_at) ? '✓ Active' : ''}</span>
                </div>
              </div>
            </div>

            {/* Date/Time Picker input if Schedule selected */}
            {(formData.dispatch_option === 'schedule' || formData.scheduled_at) && (
              <div className="p-5 bg-purple-50/50 border border-purple-200 rounded-2xl space-y-2 animate-in fade-in duration-200">
                <label className="block text-xs font-bold text-purple-900">Select Date & Time to Send:</label>
                <input 
                  type="datetime-local" 
                  name="scheduled_at" 
                  value={formData.scheduled_at} 
                  onChange={handleChange} 
                  className="w-full border border-purple-300 rounded-xl p-3 text-xs focus:ring-purple-500 focus:border-purple-500 bg-white font-medium shadow-xs" 
                />
              </div>
            )}
          </div>
        )}

        {step === 8 && (
          <div className="space-y-6 max-w-3xl mx-auto animate-in fade-in zoom-in-95 duration-300">
            <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">Review Your Campaign</h2>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Campaign Name</p>
                  <p className="text-lg font-bold text-gray-900">{formData.name || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Schedule</p>
                  <p className="text-lg font-bold text-gray-900">{formData.scheduled_at ? new Date(formData.scheduled_at).toLocaleString() : 'Immediate Send'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Subject Line A</p>
                  <p className="text-gray-900 font-medium">{formData.subject || '—'}</p>
                </div>
                {formData.is_ab_test && (
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Subject Line B</p>
                    <p className="text-gray-900 font-medium">{formData.variant_b_subject || '—'}</p>
                  </div>
                )}
                <div className="col-span-2 border-t border-gray-200 my-2"></div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Sender</p>
                  <p className="text-gray-900 font-medium">{senders.find(s => s.id === parseInt(formData.sender_id))?.name || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Audience</p>
                  <p className="text-gray-900 font-medium">
                    {formData.target_type === 'custom_email' 
                      ? `Single Email (${formData.target_email || '—'})` 
                      : (lists.find(l => l.id === parseInt(formData.list_id))?.name || '—')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Navigation Footer */}
      <div className="flex justify-between items-center bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <button 
          disabled={step === 1} 
          onClick={handlePrev} 
          className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={16} className="mr-1" /> Back
        </button>
        
        {step < 8 ? (
          <button 
            onClick={handleNext} 
            className="flex items-center px-6 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors shadow-sm shadow-primary-600/30"
          >
            Continue <ChevronRight size={16} className="ml-1" />
          </button>
        ) : (
          <button 
            onClick={handleDispatch} 
            disabled={loading}
            className="flex items-center px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors shadow-sm shadow-green-600/30 disabled:opacity-50"
          >
            {loading ? 'Dispatching...' : 'Dispatch Campaign'} <Send size={16} className="ml-2" />
          </button>
        )}
      </div>

      {/* AI Subject Line Generator Modal */}
      {showAiModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                  <Sparkles size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">AI Subject Line Generator</h3>
                  <p className="text-xs text-gray-500">Powered by BexEmail AI</p>
                </div>
              </div>
              <button onClick={() => { setShowAiModal(false); setAiSuggestions([]); }} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">What is your email about?</label>
                <input
                  type="text"
                  value={aiTopic}
                  onChange={e => setAiTopic(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleGenerateSubjects()}
                  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none"
                  placeholder="e.g. Summer sale with 50% off all products"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tone</label>
                <div className="grid grid-cols-3 gap-2">
                  {['professional', 'casual', 'urgent'].map(tone => (
                    <button
                      key={tone}
                      onClick={() => setAiTone(tone)}
                      className={`py-2 px-3 rounded-lg text-sm font-medium border-2 transition-all capitalize ${aiTone === tone ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-gray-200 text-gray-600 hover:border-violet-300'}`}
                    >
                      {tone}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={handleGenerateSubjects}
              disabled={aiLoading || !aiTopic.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-violet-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20"
            >
              {aiLoading ? <RefreshCw size={18} className="animate-spin" /> : <Sparkles size={18} />}
              {aiLoading ? 'Generating...' : 'Generate Suggestions'}
            </button>

            {aiSuggestions.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-700">✨ Suggestions — click to use:</p>
                {aiSuggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSelectSubject(s)}
                    className="w-full text-left p-3.5 bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200 hover:border-violet-400 rounded-xl text-sm text-gray-800 font-medium transition-all hover:shadow-md group"
                  >
                    <span className="text-violet-400 mr-2 group-hover:text-violet-600">→</span>{s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
