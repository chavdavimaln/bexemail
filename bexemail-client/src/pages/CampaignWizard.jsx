import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronRight, ChevronLeft, Send, Calendar, Monitor, Users, FileText, Settings, User, GitBranch, Sparkles, X, RefreshCw } from 'lucide-react';


export default function CampaignWizard() {
  const [step, setStep] = useState(1);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [senders, setSenders] = useState([]);
  const [lists, setLists] = useState([]);
  const [templates, setTemplates] = useState([]);

  // AI Subject Line Generator state
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiTone, setAiTone] = useState('professional');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);


  const [formData, setFormData] = useState({
    name: '', 
    subject: '', 
    sender_id: '',
    list_id: '', 
    is_ab_test: false,
    variant_b_subject: '',
    template_id: '',
    html_content: '',
    scheduled_at: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [sendersRes, listsRes, templatesRes] = await Promise.all([
        axios.get('http://localhost:5000/api/senders'),
        axios.get('http://localhost:5000/api/lists'),
        axios.get('http://localhost:5000/api/templates')
      ]);
      setSenders(sendersRes.data);
      setLists(listsRes.data);
      setTemplates(templatesRes.data);
    } catch (error) {
      console.error("Failed to fetch wizard data:", error);
    }
  };

  const handleNext = () => setStep(prev => Math.min(prev + 1, 8));
  const handlePrev = () => setStep(prev => Math.max(prev - 1, 1));

  const handleGenerateSubjects = async () => {
    if (!aiTopic.trim()) return;
    setAiLoading(true);
    setAiSuggestions([]);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('http://localhost:5000/api/ai/generate-subject', 
        { topic: aiTopic, tone: aiTone },
        { headers: { Authorization: `Bearer ${token}` } }
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

  const handleTemplateSelect = (template) => {
    setFormData(prev => ({
      ...prev,
      template_id: template.id,
      html_content: template.html_content
    }));
    handleNext();
  };

  const handleDispatch = async () => {
    setLoading(true);
    try {
      // Use the actual dispatch route that expects this data
      // In campaignRoutes.js we have /api/campaigns_wizard/dispatch
      await axios.post('http://localhost:5000/api/campaigns_wizard/dispatch', formData);
      alert('Campaign dispatched successfully!');
      navigate('/campaigns');
    } catch (error) {
      console.error(error);
      alert('Failed to dispatch campaign.');
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

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Create Campaign</h1>
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between">
          {steps.map((s, index) => (
            <div key={s.id} className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${step > s.id ? 'bg-primary-600 border-primary-600 text-white' : step === s.id ? 'border-primary-600 text-primary-600 bg-primary-50' : 'border-gray-200 text-gray-400'}`}>
                {step > s.id ? <Check size={20} /> : s.icon}
              </div>
              <div className={`ml-3 hidden md:block ${step === s.id ? 'text-primary-700 font-semibold' : 'text-gray-500'}`}>
                <p className="text-xs uppercase tracking-wider">Step {s.id}</p>
                <p className="text-sm">{s.title}</p>
              </div>
              {index < steps.length - 1 && (
                <div className={`w-8 md:w-16 h-1 mx-2 md:mx-4 rounded ${step > s.id ? 'bg-primary-600' : 'bg-gray-100'}`}></div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 min-h-[400px]">
        
        {step === 1 && (
          <div className="space-y-6 max-w-2xl mx-auto animate-in fade-in zoom-in-95 duration-300">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Basic Setup</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Internal Campaign Name</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full border border-gray-300 rounded-lg p-3 focus:ring-primary-500 focus:border-primary-500" placeholder="e.g. Summer Sale 2026" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email Subject Line</label>
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
            <h2 className="text-xl font-bold text-gray-900 mb-4">Sender Details</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Who is sending this email?</label>
              <select name="sender_id" value={formData.sender_id} onChange={handleChange} className="w-full border border-gray-300 rounded-lg p-3 focus:ring-primary-500 focus:border-primary-500">
                <option value="">Select a sender...</option>
                {senders.map(s => (
                  <option key={s.id} value={s.id}>{s.name} &lt;{s.email}&gt;</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 max-w-2xl mx-auto animate-in fade-in zoom-in-95 duration-300">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Target Audience</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Which list should receive this?</label>
              <select name="list_id" value={formData.list_id} onChange={handleChange} className="w-full border border-gray-300 rounded-lg p-3 focus:ring-primary-500 focus:border-primary-500">
                <option value="">Select an audience list...</option>
                {lists.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6 max-w-2xl mx-auto animate-in fade-in zoom-in-95 duration-300">
            <h2 className="text-xl font-bold text-gray-900 mb-4">A/B Testing</h2>
            <div className="flex items-center mb-6">
              <input type="checkbox" id="is_ab_test" name="is_ab_test" checked={formData.is_ab_test} onChange={handleChange} className="h-5 w-5 text-primary-600 rounded border-gray-300 focus:ring-primary-500" />
              <label htmlFor="is_ab_test" className="ml-3 text-sm font-medium text-gray-700">Enable Subject Line A/B Test (Sends to 10% each)</label>
            </div>
            {formData.is_ab_test && (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">Variant B Subject Line</label>
                <input type="text" name="variant_b_subject" value={formData.variant_b_subject} onChange={handleChange} className="w-full border border-gray-300 rounded-lg p-3 focus:ring-primary-500 focus:border-primary-500" placeholder="Variant B Subject..." />
              </div>
            )}
          </div>
        )}

        {step === 5 && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Select Template</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div 
                className="border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:border-primary-500 hover:bg-primary-50 transition-colors"
                onClick={() => handleTemplateSelect({ id: '', html_content: '' })}
              >
                <FileText size={48} className="text-gray-400 mb-4" />
                <h3 className="font-bold text-gray-900 mb-1">Blank Template</h3>
                <p className="text-sm text-gray-500">Start from scratch</p>
              </div>
              {templates.map(t => (
                <div 
                  key={t.id} 
                  className={`border-2 rounded-xl p-4 cursor-pointer transition-colors ${formData.template_id === t.id ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200' : 'border-gray-200 hover:border-primary-300'}`}
                  onClick={() => handleTemplateSelect(t)}
                >
                  <div className="w-full h-32 bg-gray-100 rounded-lg mb-4 flex items-center justify-center overflow-hidden">
                    {/* Tiny iframe preview */}
                    <iframe srcDoc={t.html_content} title={t.name} className="w-[400%] h-[400%] origin-top-left scale-25 pointer-events-none" />
                  </div>
                  <h3 className="font-bold text-gray-900">{t.name}</h3>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300 h-full flex flex-col">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Email Content Editor</h2>
            <textarea 
              name="html_content" 
              value={formData.html_content} 
              onChange={handleChange} 
              className="w-full flex-1 min-h-[400px] border border-gray-300 rounded-lg p-4 font-mono text-sm focus:ring-primary-500 focus:border-primary-500" 
              placeholder="<h1>Hello World</h1>" 
            />
          </div>
        )}

        {step === 7 && (
          <div className="space-y-6 max-w-2xl mx-auto animate-in fade-in zoom-in-95 duration-300">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Scheduling</h2>
            <div className="p-6 bg-white border border-gray-200 rounded-xl">
              <label className="block text-sm font-medium text-gray-700 mb-2">When should this campaign go out?</label>
              <input 
                type="datetime-local" 
                name="scheduled_at" 
                value={formData.scheduled_at} 
                onChange={handleChange} 
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-primary-500 focus:border-primary-500" 
              />
              <p className="text-xs text-gray-500 mt-2">Leave blank to send immediately upon dispatch.</p>
            </div>
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
                  <p className="text-gray-900 font-medium">{lists.find(l => l.id === parseInt(formData.list_id))?.name || '—'}</p>
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

