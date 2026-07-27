import React, { useState, useEffect, useRef } from 'react';
import EmailEditor from 'react-email-editor';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ArrowLeft, Code, Layout, Copy, Check, Plus, Eye, Sparkles, FolderPlus, X, RefreshCw } from 'lucide-react';
import { useModal } from '../context/ModalContext';

const DEFAULT_CATEGORIES = ['Newsletter', 'Promotion', 'Welcome', 'Transactional', 'Announcement', 'E-Commerce'];

const SAMPLE_HTML = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f7f6; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 30px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    h1 { color: #1e293b; font-size: 24px; margin-bottom: 10px; }
    p { color: #475569; font-size: 15px; line-height: 1.6; }
    .btn { display: inline-block; background-color: #2563eb; color: #ffffff !important; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 15px; }
    .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Welcome to BexEmail! 🚀</h1>
    <p>This is a custom HTML template. You can write your custom code, inline CSS, or paste responsive email designs here.</p>
    <a href="#" class="btn">Explore Dashboard</a>
    <div class="footer">
      <p>© 2026 BexEmail Inc. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;

const DEFAULT_FOOTER_HTML = `<div style="padding: 25px 20px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; text-align: left; max-width: 600px; margin: 0 auto; box-sizing: border-box; border-radius: 0 0 12px 12px;">
  <!-- Row 1: Logo (Left) & Social Media (Right) -->
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse: collapse; margin-bottom: 15px;">
    <tr>
      <td align="left" style="font-size: 18px; font-weight: bold; color: #2563eb; font-family: inherit;">
        BexEmail
      </td>
      <td align="right" style="font-family: inherit; font-size: 12px;">
        <a href="https://facebook.com" style="margin-left: 10px; color: #1877f2; text-decoration: none; font-weight: 600;">Facebook</a>
        <a href="https://instagram.com" style="margin-left: 10px; color: #e1306c; text-decoration: none; font-weight: 600;">Instagram</a>
        <a href="https://linkedin.com" style="margin-left: 10px; color: #0077b5; text-decoration: none; font-weight: 600;">LinkedIn</a>
        <a href="https://twitter.com" style="margin-left: 10px; color: #0f172a; text-decoration: none; font-weight: 600;">Twitter-X</a>
      </td>
    </tr>
  </table>
  
  <!-- Row 2: Address and All Rights Reserved -->
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse: collapse; border-top: 1px solid #f1f5f9; padding-top: 12px;">
    <tr>
      <td align="center" style="font-size: 11px; color: #64748b; line-height: 1.6; font-family: inherit; padding-top: 8px;">
        123 Business Rd, Suite 100, Business City, BC 12345<br>
        © 2026 BexEmail. All rights reserved.
      </td>
    </tr>
  </table>
</div>`;

const TemplateEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);
  const emailEditorRef = useRef(null);
  const { alert: customAlert } = useModal();

  // Active Editor View Tab: 'builder' (Drag & Drop), 'code_editor' (HTML Code Editor), or 'code_view' (View & Copy HTML)
  const [activeTab, setActiveTab] = useState('builder');

  // Categories list (defaults + saved custom categories)
  const [categories, setCategories] = useState(() => {
    const saved = localStorage.getItem('bexemail_template_categories');
    return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
  });

  // Modal for Add New Category
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');

  const footerEditorRef = useRef(null);
  const [footerEditorReady, setFooterEditorReady] = useState(false);

  const [formData, setFormData] = useState({
    template_name: '',
    category: 'Newsletter',
    html_content: '',
    plain_text_content: '',
    design_json: null,
    include_footer: 1,
    footer_editor_type: 'html',
    footer_html: DEFAULT_FOOTER_HTML,
    footer_design_json: null
  });

  const [loading, setLoading] = useState(false);
  const [editorReady, setEditorReady] = useState(false);
  const [templateData, setTemplateData] = useState(null);
  const [copiedHtml, setCopiedHtml] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewDevice, setPreviewDevice] = useState('desktop');

  useEffect(() => {
    if (isEditing) {
      fetchTemplate();
    }
  }, [id]);

  useEffect(() => {
    if (editorReady && templateData) {
      loadDataIntoEditor(templateData);
    }
  }, [editorReady, templateData]);

  const loadDataIntoEditor = (data) => {
    if (!emailEditorRef.current?.editor || !data) return;
    
    try {
      let designToLoad = null;
      if (data.design_json) {
        designToLoad = typeof data.design_json === 'string' 
          ? JSON.parse(data.design_json) 
          : data.design_json;
      } else if (data.html_content && data.html_content.trim() !== '') {
        designToLoad = {
          body: {
            rows: [
              {
                cells: [1],
                columns: [
                  {
                    contents: [
                      {
                        type: 'html',
                        values: {
                          html: data.html_content
                        }
                      }
                    ]
                  }
                ]
              }
            ]
          }
        };
      }

      if (designToLoad) {
        emailEditorRef.current.editor.loadDesign(designToLoad);
      }
    } catch (err) {
      console.error('Failed to load design into Unlayer editor:', err);
    }
  };

  const fetchTemplate = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/templates/${id}`);
      const tData = res.data;
      
      const loadedFormData = {
        ...tData,
        include_footer: tData.include_footer !== null && tData.include_footer !== undefined ? tData.include_footer : 1,
        footer_editor_type: tData.footer_editor_type || 'html',
        footer_html: tData.footer_html || DEFAULT_FOOTER_HTML,
        footer_design_json: tData.footer_design_json || null
      };
      
      setFormData(loadedFormData);
      setTemplateData(loadedFormData);

      // Add category if custom and not in list
      if (tData.category && !categories.includes(tData.category)) {
        const updated = [...categories, tData.category];
        setCategories(updated);
        localStorage.setItem('bexemail_template_categories', JSON.stringify(updated));
      }

      if (editorReady) {
        loadDataIntoEditor(tData);
      }
    } catch (error) {
      console.error('Error fetching template:', error);
      customAlert({
        title: 'Error',
        message: 'Failed to load template details.',
        type: 'danger'
      });
    }
  };

  const onLoad = () => {
    setEditorReady(true);
    if (templateData) {
      loadDataIntoEditor(templateData);
    }
  };

  const onFooterLoad = () => {
    setFooterEditorReady(true);
    let designToLoad = null;
    if (formData.footer_design_json) {
      designToLoad = typeof formData.footer_design_json === 'string'
        ? JSON.parse(formData.footer_design_json)
        : formData.footer_design_json;
    } else if (formData.footer_html) {
      designToLoad = {
        body: {
          rows: [
            {
              cells: [1],
              columns: [
                {
                  contents: [
                    {
                      type: 'html',
                      values: {
                        html: formData.footer_html
                      }
                    }
                  ]
                }
              ]
            }
          ]
        }
      };
    }
    if (designToLoad && footerEditorRef.current?.editor) {
      footerEditorRef.current.editor.loadDesign(designToLoad);
    }
  };

  const exportHtmlFromFooterBuilder = () => {
    return new Promise((resolve) => {
      if (formData.footer_editor_type === 'builder' && footerEditorRef.current?.editor) {
        footerEditorRef.current.editor.exportHtml((data) => {
          const { html, design } = data;
          resolve({ html, design });
        });
      } else {
        resolve({ html: formData.footer_html, design: formData.footer_design_json });
      }
    });
  };

  const mergeFooterIntoHtml = (mainHtml, footerHtml) => {
    if (!mainHtml) return footerHtml;
    if (!footerHtml) return mainHtml;
    
    // Check if footer is already merged
    if (mainHtml.includes('Facebook') && mainHtml.includes('Instagram') && mainHtml.includes('All rights reserved')) {
      return mainHtml;
    }
    
    const bodyCloseIndex = mainHtml.lastIndexOf('</body>');
    if (bodyCloseIndex !== -1) {
      return mainHtml.substring(0, bodyCloseIndex) + footerHtml + mainHtml.substring(bodyCloseIndex);
    }
    
    const divCloseIndex = mainHtml.lastIndexOf('</div>');
    if (divCloseIndex !== -1) {
      return mainHtml.substring(0, divCloseIndex) + footerHtml + mainHtml.substring(divCloseIndex);
    }
    
    return mainHtml + '\n' + footerHtml;
  };

  // Sync HTML from Drag & Drop builder into formData.html_content
  const exportHtmlFromBuilder = () => {
    return new Promise((resolve) => {
      if (emailEditorRef.current?.editor) {
        emailEditorRef.current.editor.exportHtml((data) => {
          const { html, design } = data;
          setFormData(prev => ({
            ...prev,
            html_content: html,
            design_json: JSON.stringify(design)
          }));
          resolve({ html, design });
        });
      } else {
        resolve({ html: formData.html_content, design: formData.design_json });
      }
    });
  };

  // Handle Tab Switch
  const handleTabChange = async (newTab) => {
    if (activeTab === 'builder' && newTab !== 'builder') {
      await exportHtmlFromBuilder();
    }
    setActiveTab(newTab);
  };

  // Copy HTML to Clipboard
  const handleCopyHtml = async () => {
    let htmlToCopy = formData.html_content;
    if (activeTab === 'builder' && emailEditorRef.current?.editor) {
      const exported = await exportHtmlFromBuilder();
      htmlToCopy = exported.html;
    }

    if (formData.include_footer) {
      let footerHtml = formData.footer_html;
      if (formData.footer_editor_type === 'builder' && footerEditorRef.current?.editor) {
        const exportedFooter = await exportHtmlFromFooterBuilder();
        footerHtml = exportedFooter.html;
      }
      htmlToCopy = mergeFooterIntoHtml(htmlToCopy, footerHtml);
    }

    if (!htmlToCopy) {
      customAlert({
        title: 'No Content',
        message: 'There is no HTML content to copy yet. Build or paste your design first.',
        type: 'warning'
      });
      return;
    }

    navigator.clipboard.writeText(htmlToCopy);
    setCopiedHtml(true);
    setTimeout(() => setCopiedHtml(false), 2500);
  };

  // Add New Category Handler
  const handleAddCategory = (e) => {
    e.preventDefault();
    const trimmed = newCategoryInput.trim();
    if (!trimmed) return;

    if (!categories.includes(trimmed)) {
      const updated = [...categories, trimmed];
      setCategories(updated);
      localStorage.setItem('bexemail_template_categories', JSON.stringify(updated));
    }

    setFormData(prev => ({ ...prev, category: trimmed }));
    setNewCategoryInput('');
    setShowAddCategoryModal(false);
    customAlert({
      title: 'Category Added',
      message: `Category "${trimmed}" created and selected!`,
      type: 'success'
    });
  };

  const handlePreviewTemplate = async () => {
    let mainHtml = formData.html_content;
    if (activeTab === 'builder' && emailEditorRef.current?.editor) {
      const exported = await exportHtmlFromBuilder();
      mainHtml = exported.html;
    } else if (activeTab === 'code_editor' && !mainHtml) {
      mainHtml = SAMPLE_HTML;
    }

    let footerHtml = formData.footer_html;
    if (formData.include_footer) {
      if (formData.footer_editor_type === 'builder' && footerEditorRef.current?.editor) {
        const exportedFooter = await exportHtmlFromFooterBuilder();
        footerHtml = exportedFooter.html;
      }
      mainHtml = mergeFooterIntoHtml(mainHtml, footerHtml);
    }

    setPreviewHtml(mainHtml);
    setShowPreviewModal(true);
  };

  const handleSave = async () => {
    if (!formData.template_name.trim()) {
      return customAlert({
        title: 'Validation Error',
        message: 'Please enter a Template Name before saving.',
        type: 'warning'
      });
    }
    await handlePreviewTemplate();
  };

  const executeSave = async () => {
    setLoading(true);
    try {
      let finalHtml = formData.html_content;
      let finalDesignStr = formData.design_json;

      if (activeTab === 'builder' && emailEditorRef.current?.editor) {
        const exported = await exportHtmlFromBuilder();
        finalHtml = exported.html;
        finalDesignStr = JSON.stringify(exported.design);
      } else if (activeTab === 'code_editor' && !finalHtml) {
        finalHtml = SAMPLE_HTML;
      }

      // Handle custom footer if included
      let footerHtml = formData.footer_html;
      let footerDesignStr = formData.footer_design_json;

      if (formData.include_footer) {
        if (formData.footer_editor_type === 'builder' && footerEditorRef.current?.editor) {
          const exportedFooter = await exportHtmlFromFooterBuilder();
          footerHtml = exportedFooter.html;
          footerDesignStr = JSON.stringify(exportedFooter.design);
        }
        finalHtml = mergeFooterIntoHtml(finalHtml, footerHtml);
      }

      const payload = {
        ...formData,
        template_name: formData.template_name.trim(),
        html_content: finalHtml,
        design_json: finalDesignStr,
        footer_html: footerHtml,
        footer_design_json: footerDesignStr
      };

      if (isEditing) {
        await axios.put(`http://localhost:5000/api/templates/${id}`, payload);
      } else {
        await axios.post('http://localhost:5000/api/templates', payload);
      }

      customAlert({
        title: 'Saved Successfully',
        message: 'Template saved successfully!',
        type: 'success'
      });
      setShowPreviewModal(false);
      navigate('/templates');
    } catch (error) {
      console.error('Error saving template:', error);
      customAlert({
        title: 'Save Failed',
        message: error.response?.data?.error || 'Failed to save template.',
        type: 'danger'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      
      {/* Top Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/templates')}
            className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
            title="Back to Templates"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {isEditing ? 'Edit Email Template' : 'Create New Email Template'}
            </h2>
            <p className="text-xs text-gray-500">Design visually or build using raw HTML code.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Copy HTML Button */}
          <button
            type="button"
            onClick={handleCopyHtml}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl border border-gray-200 transition"
          >
            {copiedHtml ? <Check size={15} className="text-green-600" /> : <Copy size={15} />}
            {copiedHtml ? 'Copied HTML!' : 'Copy HTML Code'}
          </button>

          {/* Preview Template Button */}
          <button
            type="button"
            onClick={handlePreviewTemplate}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl border border-blue-200 transition"
          >
            <Eye size={15} />
            Preview Template
          </button>

          {/* Save Template Button */}
          <button 
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs rounded-xl shadow-md shadow-primary-200 transition disabled:opacity-50"
          >
            <Save size={16} />
            {loading ? 'Saving...' : 'Save Template'}
          </button>
        </div>
      </div>

      {/* Template Metadata Header Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Template Name Input */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Template Name *</label>
            <input 
              type="text" 
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary-500 font-medium"
              value={formData.template_name}
              onChange={(e) => setFormData({...formData, template_name: e.target.value})}
              placeholder="e.g., Summer Promo 2026"
            />
          </div>

          {/* Category Dropdown + Add Category Button */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Category *</label>
            <div className="flex gap-2">
              <select 
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary-500 font-bold text-gray-800"
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setShowAddCategoryModal(true)}
                className="px-3.5 py-2.5 bg-primary-50 hover:bg-primary-100 text-primary-700 border border-primary-200 text-xs font-bold rounded-xl transition shrink-0 flex items-center gap-1"
                title="Create a new category"
              >
                <FolderPlus size={14} /> + Add Category
              </button>
            </div>
          </div>

        </div>

        {/* Footer Settings Row */}
        <div className="border-t border-gray-100 pt-4 mt-2">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-gray-700">
              <input 
                type="checkbox"
                checked={formData.include_footer === 1 || formData.include_footer === true}
                onChange={e => setFormData({ ...formData, include_footer: e.target.checked ? 1 : 0 })}
                className="rounded text-primary-600 focus:ring-primary-500 w-4 h-4 cursor-pointer"
              />
              Include Custom Email Footer at the bottom
            </label>

            {(formData.include_footer === 1 || formData.include_footer === true) && (
              <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200 shrink-0">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, footer_editor_type: 'html' })}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${formData.footer_editor_type === 'html' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
                >
                  ✏️ Footer HTML Code
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, footer_editor_type: 'builder' })}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${formData.footer_editor_type === 'builder' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
                >
                  🧱 Footer Drag & Drop
                </button>
              </div>
            )}
          </div>

          {(formData.include_footer === 1 || formData.include_footer === true) && (
            <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                <h4 className="text-xs font-bold text-gray-700">Footer Editor</h4>
                <span className="text-[10px] text-gray-400 font-semibold uppercase">Editing Footer Block</span>
              </div>

              {formData.footer_editor_type === 'html' ? (
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-gray-600">HTML Code for Footer</label>
                  <textarea
                    value={formData.footer_html}
                    onChange={e => setFormData({ ...formData, footer_html: e.target.value })}
                    className="w-full h-32 p-3 font-mono text-[11px] text-emerald-600 bg-slate-900 rounded-lg outline-none border border-slate-700 resize-y"
                    placeholder="<!-- Write your footer HTML here -->"
                  />
                  <p className="text-[10px] text-gray-500 mt-1">This HTML will be automatically injected at the bottom of the main template HTML.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-gray-600">Visual Footer Builder</label>
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden h-[400px]">
                    <EmailEditor 
                      ref={footerEditorRef} 
                      onLoad={onFooterLoad} 
                      minHeight="400px"
                    />
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1">Design the footer visually. It will be saved and merged at the bottom of the template.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tab View Selector Bar */}
        <div className="flex bg-gray-100 p-1.5 rounded-xl border border-gray-200">
          
          {/* Tab 1: Drag & Drop Builder */}
          <button
            type="button"
            onClick={() => handleTabChange('builder')}
            className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
              activeTab === 'builder'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Layout size={16} /> Drag & Drop Builder
          </button>

          {/* Tab 2: HTML Code Editor */}
          <button
            type="button"
            onClick={() => handleTabChange('code_editor')}
            className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
              activeTab === 'code_editor'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Code size={16} /> Create Template with HTML Code
          </button>

          {/* Tab 3: View & Copy HTML Code */}
          <button
            type="button"
            onClick={() => handleTabChange('code_view')}
            className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
              activeTab === 'code_view'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Eye size={16} /> View & Copy Generated HTML
          </button>

        </div>
      </div>

      {/* TAB CONTENT 1: DRAG & DROP VISUAL BUILDER */}
      <div className={activeTab === 'builder' ? 'block' : 'hidden'}>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden h-[750px]">
          <EmailEditor 
            ref={emailEditorRef} 
            onLoad={onLoad} 
            minHeight="750px"
          />
        </div>
      </div>

      {/* TAB CONTENT 2: HTML CODE EDITOR WITH LIVE PREVIEW */}
      {activeTab === 'code_editor' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <Code className="text-primary-600" size={18} /> HTML Source Code Editor
              </h3>
              <p className="text-xs text-gray-500">Write or paste your custom HTML email design below with instant live preview.</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, html_content: SAMPLE_HTML }))}
                className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs font-bold rounded-lg transition"
              >
                Load Sample HTML
              </button>
              <button
                type="button"
                onClick={handleCopyHtml}
                className="px-3 py-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200 text-xs font-bold rounded-lg transition flex items-center gap-1"
              >
                {copiedHtml ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                {copiedHtml ? 'Copied!' : 'Copy Code'}
              </button>
            </div>
          </div>

          {/* Split Screen Editor & Live Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[650px]">
            
            {/* HTML Code Textarea */}
            <div className="flex flex-col h-full border border-gray-300 rounded-xl overflow-hidden shadow-inner bg-slate-900 text-slate-100">
              <div className="bg-slate-800 px-4 py-2 text-xs font-mono font-bold text-slate-300 border-b border-slate-700 flex justify-between items-center">
                <span>HTML Code Editor</span>
                <span className="text-[10px] text-slate-400">UTF-8 • HTML5</span>
              </div>
              <textarea
                value={formData.html_content}
                onChange={e => setFormData({ ...formData, html_content: e.target.value })}
                placeholder="<!-- Paste or write your custom HTML template code here -->"
                className="w-full h-full p-4 bg-slate-900 text-emerald-400 font-mono text-xs outline-none resize-none leading-relaxed"
                spellCheck="false"
              />
            </div>

            {/* Real-time HTML Render Frame */}
            <div className="flex flex-col h-full border border-gray-300 rounded-xl overflow-hidden shadow-sm bg-white">
              <div className="bg-gray-100 px-4 py-2 text-xs font-bold text-gray-700 border-b border-gray-200 flex justify-between items-center">
                <span>Live Email Render Preview</span>
                <span className="text-[10px] bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-bold">Interactive</span>
              </div>
              <iframe
                title="Live HTML Preview"
                srcDoc={formData.html_content || '<div style="padding: 40px; text-align: center; color: #94a3b8; font-family: sans-serif;">Paste HTML code on the left to view live preview.</div>'}
                className="w-full h-full border-none bg-white"
              />
            </div>

          </div>
        </div>
      )}

      {/* TAB CONTENT 3: VIEW & COPY GENERATED HTML CODE */}
      {activeTab === 'code_view' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <Eye className="text-primary-600" size={18} /> Generated HTML Code Viewer
              </h3>
              <p className="text-xs text-gray-500">View or copy the raw HTML generated from your Drag & Drop visual template builder.</p>
            </div>

            <button
              type="button"
              onClick={handleCopyHtml}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5"
            >
              {copiedHtml ? <Check size={16} /> : <Copy size={16} />}
              {copiedHtml ? 'Copied to Clipboard!' : 'Copy Entire HTML Code'}
            </button>
          </div>

          <div className="border border-gray-300 rounded-xl overflow-hidden bg-slate-950 text-slate-100 p-4 font-mono text-xs leading-relaxed max-h-[600px] overflow-y-auto">
            {formData.html_content ? (
              <pre className="whitespace-pre-wrap break-all text-slate-200">{formData.html_content}</pre>
            ) : (
              <div className="text-center py-12 text-slate-500">
                <p>No HTML content generated yet.</p>
                <p className="text-[11px] text-slate-600 mt-1">Switch to the "Drag & Drop Builder" tab to design your email, then return here to view and copy your HTML code.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ADD NEW CATEGORY MODAL */}
      {showAddCategoryModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 max-w-md w-full p-6 space-y-4 animate-in fade-in-50">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <FolderPlus size={18} className="text-primary-600" /> Create New Category
              </h3>
              <button onClick={() => setShowAddCategoryModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Category Name *</label>
                <input 
                  type="text"
                  required
                  value={newCategoryInput}
                  onChange={e => setNewCategoryInput(e.target.value)}
                  placeholder="e.g., Seasonal Sales, Black Friday, Onboarding"
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary-500 font-medium"
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCategoryModal(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-600 text-xs font-semibold rounded-xl hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white text-xs font-bold rounded-xl hover:bg-primary-700 transition shadow-sm"
                >
                  Create & Select Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* PREVIEW TEMPLATE MODAL */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 max-w-4xl w-full h-[85vh] flex flex-col overflow-hidden animate-in fade-in-50">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 p-4 shrink-0 bg-gray-50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <Eye size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Full Template Preview</h3>
                  <p className="text-xs text-gray-500">Live preview of your template design merged with the footer.</p>
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
                  onClick={() => setShowPreviewModal(false)} 
                  className="text-gray-400 hover:text-gray-600 p-1.5 hover:bg-gray-100 rounded-lg transition"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body: preview frame */}
            <div className="flex-1 bg-gray-100 p-6 overflow-y-auto flex items-center justify-center">
              {previewDevice === 'desktop' ? (
                <div className="w-full h-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <iframe 
                    srcDoc={previewHtml} 
                    title="Template Live Preview Desktop" 
                    className="w-full h-full border-0 bg-white"
                  />
                </div>
              ) : (
                <div className="relative mx-auto border-4 border-gray-800 rounded-[36px] h-[600px] w-[320px] bg-gray-800 shadow-xl overflow-hidden">
                  {/* Smartphone top bar */}
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 h-4 w-32 bg-gray-800 rounded-b-xl z-20"></div>
                  <div className="w-full h-full bg-white overflow-hidden">
                    <iframe 
                      srcDoc={previewHtml} 
                      title="Template Live Preview Mobile" 
                      className="w-full h-full border-0 bg-white"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-2 p-4 border-t border-gray-100 bg-gray-50 shrink-0">
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="px-4 py-2 border border-gray-200 text-gray-600 text-xs font-semibold rounded-xl hover:bg-gray-100 transition"
              >
                Close Preview
              </button>
              <button
                type="button"
                onClick={executeSave}
                disabled={loading}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-xl transition shadow-sm disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Looks Good, Save'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default TemplateEditor;
