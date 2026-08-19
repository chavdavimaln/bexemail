import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { 
  LayoutTemplate, Plus, Edit, Trash2, Eye, X, Search, Filter, 
  Sparkles, ChevronDown, Copy, Send, Briefcase, Check, RotateCcw
} from 'lucide-react';
import { useModal } from '../context/ModalContext';

const INDUSTRIES = [
  'All Industries',
  'Arts & entertainment',
  'Business & finance',
  'Creative services',
  'E-commerce & retail',
  'Education & nonprofit',
  'Food & travel',
  'Health & wellness',
  'Home & garden',
  'Industrial services',
  'Technology & software'
];

const CATEGORIES = [
  'All',
  'Announce',
  'Newsletter',
  'Seasonal',
  'Sell products',
  'Sell services',
  'Invite to event',
  'Welcome',
  'Portfolio'
];

const TemplatesList = () => {
  const navigate = useNavigate();
  const { confirm, alert: customAlert } = useModal();

  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [previewDevice, setPreviewDevice] = useState('desktop');

  // Filter States
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'saved', 'predesigned'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedIndustry, setSelectedIndustry] = useState('All Industries');
  const [sortBy, setSortBy] = useState('Recommended'); // 'Recommended', 'Newest', 'Name'

  // Dropdown UI toggles
  const [showIndustryDropdown, setShowIndustryDropdown] = useState(false);
  const [cloningId, setCloningId] = useState(null);
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  // Send Test Email States
  const [showSendTestModal, setShowSendTestModal] = useState(false);
  const [testTemplateTarget, setTestTemplateTarget] = useState(null);
  const [senders, setSenders] = useState([]);
  const [sendingTest, setSendingTest] = useState(false);
  const [testEmailForm, setTestEmailForm] = useState({
    test_email: currentUser.email || '',
    sender_id: '',
    subject: ''
  });

  const fetchSenders = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/senders').catch(() => axios.get('/api/senders'));
      const sendersList = res.data || [];
      setSenders(sendersList);
      return sendersList;
    } catch (e) {
      console.error('Error fetching senders:', e);
      return [];
    }
  };

  const handleOpenSendTest = async (template) => {
    let currentSenders = senders;
    if (currentSenders.length === 0) {
      currentSenders = await fetchSenders();
    }
    const defaultSender = currentSenders.find(s => s.is_default) || currentSenders[0];

    setTestTemplateTarget(template);
    setTestEmailForm({
      test_email: currentUser.email || '',
      sender_id: defaultSender ? String(defaultSender.id) : '',
      subject: `[Test Email] ${template.template_name || 'Email Template Preview'}`
    });
    setShowSendTestModal(true);
  };

  const handleSendTestEmail = async (e) => {
    if (e) e.preventDefault();
    if (!testEmailForm.test_email || !testEmailForm.test_email.trim()) {
      return customAlert({
        title: 'Validation Error',
        message: 'Please enter a valid recipient test email address.',
        type: 'warning'
      });
    }

    setSendingTest(true);
    try {
      const payload = {
        test_email: testEmailForm.test_email.trim(),
        sender_id: testEmailForm.sender_id || null,
        subject: testEmailForm.subject || `[Test Email] ${testTemplateTarget?.template_name || 'Email Template Preview'}`,
        template_name: testTemplateTarget?.template_name,
        html_content: testTemplateTarget?.html_content || '<h1>Template Preview</h1>',
        include_footer: 0
      };

      const res = await axios.post('http://localhost:5000/api/templates/send-test', payload);

      customAlert({
        title: 'Test Email Sent',
        message: res.data.message || `Test email sent successfully to ${testEmailForm.test_email}!`,
        type: 'success'
      });
      setShowSendTestModal(false);
    } catch (error) {
      console.error('Send test email error:', error);
      customAlert({
        title: 'Send Test Failed',
        message: error.response?.data?.error || error.message || 'Failed to send test email.',
        type: 'danger'
      });
    } finally {
      setSendingTest(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
    fetchSenders();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:5000/api/templates');
      setTemplates(res.data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    const isOk = await confirm({
      title: 'Delete Template',
      message: 'Are you sure you want to delete this template?',
      confirmText: 'Delete',
      type: 'danger'
    });
    if (isOk) {
      try {
        await axios.delete(`http://localhost:5000/api/templates/${id}`);
        fetchTemplates();
      } catch (error) {
        console.error('Error deleting template:', error);
        customAlert({
          title: 'Error',
          message: 'Failed to delete template.',
          type: 'danger'
        });
      }
    }
  };

  // Clone/Create custom template from predesign
  const handleCloneTemplate = async (template) => {
    setCloningId(template.id);
    try {
      const res = await axios.post(`http://localhost:5000/api/templates/${template.id}/clone`, {
        template_name: `${template.template_name} (My Copy)`
      });
      const newId = res.data.id;
      customAlert({
        title: 'Template Created',
        message: 'Template cloned successfully into your database! Opening editor...',
        type: 'success'
      });
      navigate(`/templates/${newId}/edit`);
    } catch (error) {
      console.error('Error cloning template:', error);
      customAlert({
        title: 'Error',
        message: 'Failed to create template copy.',
        type: 'danger'
      });
    } finally {
      setCloningId(null);
    }
  };

  // Create Campaign from Template
  const handleCreateEmailFromTemplate = (template) => {
    navigate(`/campaigns/new?templateId=${template.id}`);
  };

  // Reset Filters
  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setSelectedIndustry('All Industries');
    setSortBy('Recommended');
  };

  // Filtering Logic
  const filteredTemplates = templates.filter(tmpl => {
    // Tab Filter
    const isPre = Boolean(tmpl.is_predesigned);
    if (activeTab === 'predesigned' && !isPre) return false;
    if (activeTab === 'saved' && isPre) return false;

    // Search Query
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const nameMatch = (tmpl.template_name || '').toLowerCase().includes(q);
      const catMatch = (tmpl.category || '').toLowerCase().includes(q);
      const indMatch = (tmpl.industry || '').toLowerCase().includes(q);
      if (!nameMatch && !catMatch && !indMatch) return false;
    }

    // Category Filter
    if (selectedCategory !== 'All') {
      if ((tmpl.category || 'General').toLowerCase() !== selectedCategory.toLowerCase()) {
        return false;
      }
    }

    // Industry Filter
    if (selectedIndustry !== 'All Industries') {
      if ((tmpl.industry || 'General').toLowerCase() !== selectedIndustry.toLowerCase()) {
        return false;
      }
    }

    return true;
  }).sort((a, b) => {
    if (sortBy === 'Newest') {
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    }
    if (sortBy === 'Name') {
      return (a.template_name || '').localeCompare(b.template_name || '');
    }
    // Recommended: Saved custom templates first, then predesigned templates
    const aPre = Number(a.is_predesigned) || 0;
    const bPre = Number(b.is_predesigned) || 0;
    if (aPre !== bPre) {
      return aPre - bPre;
    }
    return b.id - a.id;
  });

  const predesignedCount = templates.filter(t => t.is_predesigned).length;
  const savedCount = templates.filter(t => !t.is_predesigned).length;

  if (loading) {
    return (
      <div className="p-12 text-center text-gray-500">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent mb-3"></div>
        <p className="font-medium text-gray-600">Loading email templates database...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            Email Templates
            <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full font-semibold">
              {templates.length} Total
            </span>
          </h2>
          <p className="text-gray-500 text-sm mt-0.5">
            Manage your saved templates or explore pre-designed industry templates.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link 
            to="/templates/new"
            className="flex items-center px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium text-sm rounded-xl shadow-sm transition-all"
          >
            <Plus size={18} className="mr-1.5" />
            Create from Scratch
          </Link>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="border-b border-gray-200 flex items-center justify-between gap-4">
        <div className="flex space-x-8">
          <button
            onClick={() => setActiveTab('all')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'all'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            All Templates ({templates.length})
          </button>

          <button
            onClick={() => setActiveTab('saved')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'saved'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            Saved Templates ({savedCount})
          </button>

          <button
            onClick={() => setActiveTab('predesigned')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'predesigned'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Sparkles size={16} className={activeTab === 'predesigned' ? 'text-primary-600' : 'text-gray-400'} />
            Predesigned Templates ({predesignedCount})
          </button>
        </div>

        <div className="hidden lg:flex items-center gap-2 text-xs text-gray-500">
          <span>Sort by:</span>
          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-transparent font-semibold text-gray-800 focus:outline-none cursor-pointer"
          >
            <option value="Recommended">Recommended</option>
            <option value="Newest">Newest</option>
            <option value="Name">Name (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Category Pills Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === cat
                ? 'bg-gray-900 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Filter and Search Control Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-gray-200 shadow-sm">
        
        {/* Search Input */}
        <div className="relative flex-1 w-full">
          <Search size={18} className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates by industry, category, or title..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Industry Filter Dropdown */}
        <div className="relative w-full sm:w-auto">
          <button
            onClick={() => setShowIndustryDropdown(!showIndustryDropdown)}
            className={`w-full sm:w-auto flex items-center justify-between gap-2 px-4 py-2 text-sm font-semibold rounded-xl border transition-all ${
              selectedIndustry !== 'All Industries'
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <span className="flex items-center gap-1.5 truncate">
              <Briefcase size={16} className="text-gray-500" />
              {selectedIndustry}
            </span>
            <ChevronDown size={16} className="text-gray-400" />
          </button>

          {showIndustryDropdown && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-30 max-h-72 overflow-y-auto animate-in fade-in-50">
              <div className="px-3 py-1.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                Filter by Industry
              </div>
              {INDUSTRIES.map(ind => (
                <button
                  key={ind}
                  onClick={() => {
                    setSelectedIndustry(ind);
                    setShowIndustryDropdown(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-xs flex items-center justify-between hover:bg-gray-50 ${
                    selectedIndustry === ind ? 'font-bold text-primary-600 bg-primary-50/50' : 'text-gray-700'
                  }`}
                >
                  <span>{ind}</span>
                  {selectedIndustry === ind && <Check size={14} className="text-primary-600" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Clear Filters Button */}
        {(selectedCategory !== 'All' || selectedIndustry !== 'All Industries' || searchQuery !== '') && (
          <button
            onClick={handleClearFilters}
            className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-800 px-3 py-2 rounded-xl hover:bg-gray-100 transition"
          >
            <RotateCcw size={14} /> Clear
          </button>
        )}
      </div>

      {/* Template Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map(template => (
          <div 
            key={template.id} 
            className="group bg-white rounded-2xl border border-gray-200 overflow-hidden flex flex-col hover:shadow-xl hover:border-gray-300 transition-all duration-200 relative"
          >
            {/* Template Preview Container */}
            <div className="h-56 bg-gray-50 border-b border-gray-200 flex items-center justify-center overflow-hidden relative group-hover:bg-gray-100 transition-colors">
              
              {/* Live Iframe Preview or Thumbnail Image */}
              {template.thumbnail ? (
                <img 
                  src={template.thumbnail} 
                  alt={template.template_name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                />
              ) : template.html_content ? (
                <iframe 
                  srcDoc={template.html_content} 
                  title={template.template_name} 
                  style={{ transform: 'scale(0.3)', transformOrigin: 'top left', width: '333%', height: '333%' }}
                  className="pointer-events-none border-0 absolute top-0 left-0" 
                />
              ) : (
                <LayoutTemplate size={56} className="text-gray-300" />
              )}

              {/* Hover Action Overlay (Mailchimp style) */}
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center p-4 gap-2.5">
                <button
                  onClick={() => handleCreateEmailFromTemplate(template)}
                  className="w-44 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  <Send size={14} /> Create Email
                </button>

                <button
                  onClick={() => handleCloneTemplate(template)}
                  disabled={cloningId === template.id}
                  className="w-44 py-2 bg-white hover:bg-gray-50 text-gray-900 font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  {cloningId === template.id ? (
                    <div className="h-4 w-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Copy size={14} /> Create Template
                    </>
                  )}
                </button>

                <button
                  onClick={() => setSelectedTemplate(template)}
                  className="w-44 py-2 bg-slate-800/90 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5"
                >
                  <Eye size={14} /> Live Preview
                </button>
              </div>

              {/* Badges on Top Left & Top Right */}
              <div className="absolute top-3 left-3 flex gap-1.5">
                {template.is_predesigned ? (
                  <span className="px-2.5 py-1 bg-blue-600 text-white text-[10px] font-bold rounded-lg uppercase tracking-wider shadow-sm flex items-center gap-1">
                    <Sparkles size={10} /> Predesign
                  </span>
                ) : (
                  <span className="px-2.5 py-1 bg-emerald-600 text-white text-[10px] font-bold rounded-lg uppercase tracking-wider shadow-sm">
                    My Custom
                  </span>
                )}
              </div>

              {template.industry && template.industry !== 'General' && (
                <div className="absolute top-3 right-3">
                  <span className="px-2.5 py-1 bg-gray-900/80 backdrop-blur-md text-white text-[11px] font-medium rounded-lg shadow-sm">
                    {template.industry}
                  </span>
                </div>
              )}
            </div>

            {/* Template Meta Content */}
            <div className="p-4 flex flex-col flex-1 bg-white">
              <div className="flex justify-between items-start mb-2 gap-2">
                <h3 className="font-bold text-gray-900 text-base line-clamp-1 group-hover:text-primary-600 transition-colors">
                  {template.template_name}
                </h3>
                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[11px] font-semibold rounded shrink-0">
                  {template.category || 'General'}
                </span>
              </div>

              <div className="mt-auto pt-3 flex items-center justify-between border-t border-gray-100 text-xs">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setSelectedTemplate(template)}
                    className="text-gray-500 hover:text-blue-600 font-semibold flex items-center gap-1"
                  >
                    <Eye size={14} /> Preview
                  </button>
                  <span className="text-gray-300">•</span>
                  <button 
                    onClick={() => handleOpenSendTest(template)}
                    className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                    title="Send a test email of this template to any email ID"
                  >
                    <Send size={14} /> Send Test
                  </button>
                  <span className="text-gray-300">•</span>
                  <Link 
                    to={`/templates/${template.id}/edit`}
                    className="text-primary-600 hover:text-primary-700 font-semibold flex items-center gap-1"
                  >
                    <Edit size={14} /> Edit
                  </Link>
                </div>

                {!template.is_predesigned && (
                  <button 
                    onClick={() => handleDelete(template.id)}
                    className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded transition-colors"
                    title="Delete custom template"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>

          </div>
        ))}

        {/* Empty State */}
        {filteredTemplates.length === 0 && (
          <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-dashed border-gray-300 p-8">
            <LayoutTemplate size={48} className="mx-auto text-gray-300 mb-3" />
            <h3 className="text-lg font-bold text-gray-800">No matching templates found</h3>
            <p className="text-gray-500 text-sm mt-1 mb-4">
              Try adjusting your search criteria, selecting a different industry, or clearing filters.
            </p>
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs rounded-xl transition"
            >
              Reset All Filters
            </button>
          </div>
        )}
      </div>

      {/* Modal: Preview Template */}
      {selectedTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-5xl h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-gray-100">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 p-4 shrink-0 bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                  <Eye size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-900 text-lg">{selectedTemplate.template_name}</h3>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded">
                      {selectedTemplate.industry || 'General'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">Live preview of your email template design.</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                {/* Desktop/Mobile toggles */}
                <div className="flex bg-gray-200/80 p-0.5 rounded-lg border border-gray-200">
                  <button
                    onClick={() => setPreviewDevice('desktop')}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                      previewDevice === 'desktop' ? 'bg-white text-gray-950 shadow-sm' : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    Desktop
                  </button>
                  <button
                    onClick={() => setPreviewDevice('mobile')}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                      previewDevice === 'mobile' ? 'bg-white text-gray-950 shadow-sm' : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    Mobile
                  </button>
                </div>

                <button 
                  onClick={() => setSelectedTemplate(null)} 
                  className="text-gray-400 hover:text-gray-600 p-1.5 hover:bg-gray-100 rounded-lg transition"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Body: preview frame */}
            <div className="flex-1 bg-gray-100 p-6 overflow-y-auto flex items-center justify-center">
              {previewDevice === 'desktop' ? (
                <div className="w-full h-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <iframe 
                    srcDoc={selectedTemplate.html_content} 
                    title="Template Live Preview Desktop" 
                    className="w-full h-full border-0 bg-white"
                  />
                </div>
              ) : (
                <div className="relative mx-auto border-4 border-gray-800 rounded-[36px] h-[640px] w-[340px] bg-gray-800 shadow-2xl overflow-hidden">
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 h-4 w-32 bg-gray-800 rounded-b-xl z-20"></div>
                  <div className="w-full h-full bg-white overflow-hidden">
                    <iframe 
                      srcDoc={selectedTemplate.html_content} 
                      title="Template Live Preview Mobile" 
                      className="w-full h-full border-0 bg-white"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-between items-center p-4 border-t border-gray-100 bg-gray-50 shrink-0">
              <span className="text-xs text-gray-500">
                Category: <strong>{selectedTemplate.category || 'General'}</strong> | Industry: <strong>{selectedTemplate.industry || 'General'}</strong>
              </span>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenSendTest(selectedTemplate)}
                  className="px-4 py-2 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-200 text-xs font-bold rounded-xl shadow-2xs transition flex items-center gap-1.5"
                  title="Send a test email of this template to any email ID"
                >
                  <Send size={14} />
                  <span>Send Test Email</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedTemplate(null)}
                  className="px-4 py-2 border border-gray-200 text-gray-600 text-xs font-semibold rounded-xl hover:bg-gray-100 transition"
                >
                  Close Preview
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const tmpl = selectedTemplate;
                    setSelectedTemplate(null);
                    handleCloneTemplate(tmpl);
                  }}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-xl shadow-sm transition"
                >
                  Use & Edit Template
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Modal: Send Test Email */}
      {showSendTestModal && testTemplateTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden border border-gray-100">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Send size={20} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-gray-900">Send Test Email</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Template: <span className="font-semibold text-gray-800">{testTemplateTarget.template_name}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSendTestModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 hover:bg-gray-100 rounded-lg transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSendTestEmail} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Recipient Test Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={testEmailForm.test_email}
                    onChange={(e) => setTestEmailForm({ ...testEmailForm, test_email: e.target.value })}
                    placeholder="e.g. yourname@example.com"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                  />
                </div>
                <p className="text-[11px] text-gray-400 mt-1">Enter ANY email address to receive a live test preview of this template.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  SMTP Sender Profile
                </label>
                <select
                  value={testEmailForm.sender_id}
                  onChange={(e) => setTestEmailForm({ ...testEmailForm, sender_id: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                >
                  {senders.length === 0 ? (
                    <option value="">Default System SMTP</option>
                  ) : (
                    senders.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.email}) {s.is_default ? '— Default Sender' : ''}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Subject Line
                </label>
                <input
                  type="text"
                  value={testEmailForm.subject}
                  onChange={(e) => setTestEmailForm({ ...testEmailForm, subject: e.target.value })}
                  placeholder="[Test Email] Template Preview"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowSendTestModal(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl border border-gray-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingTest}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-200 transition disabled:opacity-50"
                >
                  {sendingTest ? (
                    <>
                      <RotateCcw size={14} className="animate-spin" />
                      <span>Sending Test...</span>
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      <span>Send Test Email Now</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default TemplatesList;
