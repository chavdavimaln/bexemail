import React, { useState, useEffect, useRef } from 'react';
import EmailEditor from 'react-email-editor';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { Check, ChevronRight, ChevronLeft, Send, Calendar, Monitor, Users, FileText, Settings, User, GitBranch, Sparkles, X, RefreshCw, Mail } from 'lucide-react';
import { useModal } from '../context/ModalContext';

const DEFAULT_FOOTER_HTML = `<div style="padding: 25px 20px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; text-align: left; max-width: 600px; margin: 0 auto; box-sizing: border-box; border-radius: 0 0 12px 12px;">
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
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse: collapse; border-top: 1px solid #f1f5f9; padding-top: 12px;">
    <tr>
      <td align="center" style="font-size: 11px; color: #64748b; line-height: 1.6; font-family: inherit; padding-top: 8px;">
        123 Business Rd, Suite 100, Business City, BC 12345<br>
        © 2026 BexEmail. All rights reserved.
      </td>
    </tr>
  </table>
</div>`;

export default function CampaignWizard() {
  const { alert: customAlert } = useModal();
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

  const [showAddSender, setShowAddSender] = useState(false);
  const [systemSmtp, setSystemSmtp] = useState({});
  const [newSender, setNewSender] = useState({ 
    name: '', 
    email: '', 
    is_default: false
  });
  const [subscriberSearch, setSubscriberSearch] = useState('');
  const [previewMode, setPreviewMode] = useState('desktop'); // 'desktop' or 'mobile'
  const [highlightedField, setHighlightedField] = useState(null);

  useEffect(() => {
    if (highlightedField) {
      const timer = setTimeout(() => {
        const el = document.querySelector(`[data-field="${highlightedField}"]`) || document.getElementsByName(highlightedField)[0];
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          if (typeof el.focus === 'function') {
            el.focus();
          }
        }
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [step, highlightedField]);

  // Full Add SMTP & Test Connection Modal States in Wizard
  const [showAddSmtpModal, setShowAddSmtpModal] = useState(false);
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [smtpForm, setSmtpForm] = useState({
    name: '', email: '', smtp_host: 'smtp.gmail.com', smtp_port: '587', smtp_user: '', smtp_pass: '', smtp_secure: 'tls'
  });

  const [showTestSmtpModal, setShowTestSmtpModal] = useState(false);
  const [testSmtpSender, setTestSmtpSender] = useState(null);
  const [testEmailInput, setTestEmailInput] = useState('');
  const [testSmtpLoading, setTestSmtpLoading] = useState(false);
  const [testSmtpResult, setTestSmtpResult] = useState(null);

  const footerEditorRef = useRef(null);
  const [mainEditorReady, setMainEditorReady] = useState(false);
  const [footerEditorReady, setFooterEditorReady] = useState(false);

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
    design_json: null,
    include_footer: true,
    footer_editor_type: 'html', // 'html' or 'builder'
    footer_html: DEFAULT_FOOTER_HTML,
    footer_design_json: null,
    scheduled_at: '',
    dispatch_option: 'review',
    sender_mode: 'broadcast',
    sender_mapping: {}
  });

  useEffect(() => {
    fetchData();
  }, [editId]);

  const fetchData = async () => {
    try {
      const [sendersRes, listsRes, templatesRes, subscribersRes, settingsRes] = await Promise.all([
        axios.get('http://localhost:5000/api/senders').catch(() => ({ data: [] })),
        axios.get('http://localhost:5000/api/lists').catch(() => ({ data: [] })),
        axios.get('http://localhost:5000/api/templates').catch(() => ({ data: [] })),
        axios.get('http://localhost:5000/api/subscribers?limit=500').catch(() => ({ data: { data: [] } })),
        axios.get('http://localhost:5000/api/settings', { headers: { 'x-user-role': 'Super Admin' } }).catch(() => ({ data: {} }))
      ]);
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const configuredSmtp = localStorage.getItem('configured_smtp_sender') || currentUser.email || 'info@bexcodeservices.com';

      let availableSenders = (sendersRes.data && Array.isArray(sendersRes.data) && sendersRes.data.length > 0) ? sendersRes.data : [];
      if (availableSenders.length === 0) {
        availableSenders = [
          {
            id: '1',
            name: currentUser.name || 'Active SMTP Email',
            email: configuredSmtp,
            smtp_user: configuredSmtp,
            is_default: true
          }
        ];
      }
      setSenders(availableSenders);

      const subData = subscribersRes.data?.data || (Array.isArray(subscribersRes.data) ? subscribersRes.data : []);
      setSubscribers(subData);

      const availableLists = listsRes.data?.data || (Array.isArray(listsRes.data) ? listsRes.data : []);
      setLists(availableLists);

      const availableTemplates = templatesRes.data?.data || (Array.isArray(templatesRes.data) ? templatesRes.data : []);
      setTemplates(availableTemplates);

      const senderIdParam = queryParams.get('sender_id');
      if (senderIdParam) {
        setFormData(prev => ({ ...prev, sender_id: senderIdParam }));
      } else {
        const matchingUserSender = availableSenders.find(s => 
          (s.email && s.email.toLowerCase() === (configuredSmtp || '').toLowerCase()) ||
          (s.smtp_user && s.smtp_user.toLowerCase() === (configuredSmtp || '').toLowerCase())
        );

        if (matchingUserSender) {
          setFormData(prev => ({ ...prev, sender_id: matchingUserSender.id.toString() }));
        } else {
          const defaultSender = availableSenders.find(s => s.is_default) || availableSenders[0];
          setFormData(prev => ({ ...prev, sender_id: defaultSender.id.toString() }));
        }
      }

      if (editId) {
        try {
          const res = await axios.get(`http://localhost:5000/api/campaigns/${editId}`, {
            headers: { 'x-user-role': 'Super Admin' }
          });
          const c = res.data;
          const targetEmail = String(c.target_email || '');
          const emails = targetEmail.split(',').map(e => e.trim()).filter(Boolean);
          const allInSubscribers = emails.length > 0 && emails.every(email => subData.some(s => s && s.email === email));

          let formattedScheduledAt = '';
          if (c.scheduled_at) {
            try {
              const d = new Date(c.scheduled_at);
              if (!isNaN(d.getTime())) {
                formattedScheduledAt = d.toISOString().slice(0, 16);
              }
            } catch (e) {}
          }

          let dJson = null;
          try {
            dJson = c.design_json ? (typeof c.design_json === 'string' ? JSON.parse(c.design_json) : c.design_json) : null;
          } catch(e){}

          let fDesignJson = null;
          try {
            fDesignJson = c.footer_design_json ? (typeof c.footer_design_json === 'string' ? JSON.parse(c.footer_design_json) : c.footer_design_json) : null;
          } catch(e){}

          setFormData(prev => ({
            ...prev,
            name: c.name || '',
            subject: c.subject || '',
            sender_id: c.sender_id ? String(c.sender_id) : prev.sender_id,
            target_type: c.target_email ? (allInSubscribers ? 'individual_subscriber' : 'custom_email') : 'list',
            list_id: c.list_id ? String(c.list_id) : '',
            target_email: String(c.target_email || ''),
            is_ab_test: Boolean(c.is_ab_test),
            variant_b_subject: c.variant_b_subject || '',
            variant_b_html: c.variant_b_html || '',
            template_id: c.template_id ? String(c.template_id) : '',
            html_content: c.html_content || '',
            design_json: dJson,
            include_footer: c.include_footer !== undefined && c.include_footer !== null ? Boolean(c.include_footer) : true,
            footer_editor_type: c.footer_editor_type || 'html',
            footer_html: c.footer_html || DEFAULT_FOOTER_HTML,
            footer_design_json: fDesignJson,
            scheduled_at: formattedScheduledAt
          }));
        } catch (error) {
          console.error('Failed to load campaign for editing:', error);
        }
      }
    } catch (error) {
      console.error("Failed to fetch wizard data:", error);
    }
  };

  const handleSaveSmtpInWizard = async () => {
    if (!smtpForm.name.trim() || !smtpForm.email.trim()) {
      customAlert({ title: 'Validation Required', message: 'Sender Name and Sender Email are required.', type: 'warning' });
      return;
    }

    try {
      const payload = {
        name: smtpForm.name.trim(),
        email: smtpForm.email.trim(),
        smtp_host: smtpForm.smtp_host || 'smtp.gmail.com',
        smtp_port: smtpForm.smtp_port ? Number(smtpForm.smtp_port) : 587,
        smtp_user: smtpForm.smtp_user || smtpForm.email,
        smtp_pass: smtpForm.smtp_pass || null,
        smtp_secure: smtpForm.smtp_secure || 'tls',
        is_default: false
      };

      const res = await axios.post('http://localhost:5000/api/senders', payload, {
        headers: { 'x-user-role': 'Admin' }
      });

      const addedSender = res.data;
      setSenders(prev => [...prev, addedSender]);
      setFormData(prev => ({ ...prev, sender_id: addedSender.id.toString() }));
      setShowAddSmtpModal(false);
      setSmtpForm({ name: '', email: '', smtp_host: 'smtp.gmail.com', smtp_port: '587', smtp_user: '', smtp_pass: '', smtp_secure: 'tls' });
      customAlert({ title: 'Success', message: 'New SMTP Sender profile added successfully!', type: 'success' });
    } catch (err) {
      console.error('Failed to save SMTP in wizard:', err);
      customAlert({ title: 'Error', message: err.response?.data?.error || 'Failed to save SMTP configuration.', type: 'danger' });
    }
  };

  const handleOpenTestSmtpInWizard = (senderObj) => {
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    setTestSmtpSender(senderObj);
    setTestEmailInput(currentUser.email || senderObj?.email || 'vimal@bexcodeservices.com');
    setTestSmtpResult(null);
    setShowTestSmtpModal(true);
  };

  const handleRunSmtpTestInWizard = async () => {
    if (!testEmailInput.trim()) {
      customAlert({ title: 'Validation Required', message: 'Please enter a test recipient email address.', type: 'warning' });
      return;
    }

    setTestSmtpLoading(true);
    setTestSmtpResult(null);
    try {
      const payload = {
        test_email: testEmailInput.trim(),
        ...(testSmtpSender || {})
      };
      const senderId = testSmtpSender?.id || 'test';
      const res = await axios.post(`/api/senders/${senderId}/test`, payload).catch(() => axios.post(`http://localhost:5000/api/senders/${senderId}/test`, payload));
      setTestSmtpResult({
        success: true,
        message: res.data.message || 'SMTP Connection & Test Email sent successfully!'
      });
    } catch (err) {
      console.error('SMTP test connection failed:', err);
      const errMsg = err.response?.data?.error || err.response?.data?.message || err.message || 'SMTP Test Connection Failed.';
      setTestSmtpResult({
        success: false,
        message: errMsg
      });
    } finally {
      setTestSmtpLoading(false);
    }
  };

  const handleAddSender = async () => {
    if (!newSender.name.trim() || !newSender.email.trim()) {
      customAlert({ title: 'Validation Error', message: 'Sender Name and Email are required.', type: 'warning' });
      return;
    }

    try {
      const payload = {
        name: newSender.name,
        email: newSender.email,
        is_default: newSender.is_default
      };

      const res = await axios.post('http://localhost:5000/api/senders', payload, {
        headers: { 'x-user-role': 'Admin' }
      });

      const addedSender = res.data;
      setSenders(prev => [...prev, addedSender]);
      setFormData(prev => ({ ...prev, sender_id: addedSender.id.toString() }));
      setShowAddSender(false);
      setNewSender({ name: '', email: '', is_default: false });
      customAlert({ title: 'Success', message: 'Sender profile added successfully!', type: 'success' });
    } catch (error) {
      console.error('Failed to add sender:', error);
      customAlert({ title: 'Error', message: error.response?.data?.error || 'Failed to add sender.', type: 'danger' });
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

    if (name === 'target_type') {
      if (value === 'list') {
        // Clear target_email (individual contacts & custom email)
        setFormData(prev => ({
          ...prev,
          target_type: 'list',
          target_email: ''
        }));
        return;
      }
      if (value === 'individual_subscriber') {
        // Clear list_id and clear target_email initially
        setFormData(prev => ({
          ...prev,
          target_type: 'individual_subscriber',
          list_id: '',
          target_email: ''
        }));
        return;
      }
      if (value === 'custom_email') {
        // Clear list_id and clear target_email for fresh input
        setFormData(prev => ({
          ...prev,
          target_type: 'custom_email',
          list_id: '',
          target_email: ''
        }));
        return;
      }
    }

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const formDataRef = useRef(formData);
  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  // Convert raw HTML strings into native Unlayer design JSON blocks for full drag-and-drop editing
  const htmlToUnlayerDesign = (htmlContent) => {
    if (!htmlContent || typeof htmlContent !== 'string' || htmlContent.trim() === '') {
      return {
        body: {
          rows: [],
          values: { backgroundColor: '#ffffff' }
        }
      };
    }

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');

      const contents = [];
      const processedNodes = new Set();

      const elements = doc.body.querySelectorAll('h1, h2, h3, h4, h5, h6, p, img, a, hr, blockquote, ul, ol');

      if (elements.length > 0) {
        elements.forEach(el => {
          if (processedNodes.has(el)) return;
          if (el.closest('script, style, svg, head')) return;

          const tag = el.tagName.toLowerCase();

          // Headings -> Native Unlayer Heading block
          if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) {
            contents.push({
              type: 'heading',
              values: {
                text: el.innerHTML || el.textContent || '',
                headingType: tag,
                fontSize: tag === 'h1' ? '28px' : (tag === 'h2' ? '24px' : '20px'),
                textAlign: el.style.textAlign || 'left',
                color: el.style.color || '#111827'
              }
            });
            processedNodes.add(el);
            return;
          }

          // Images -> Native Unlayer Image block
          if (tag === 'img') {
            const src = el.getAttribute('src');
            if (src) {
              contents.push({
                type: 'image',
                values: {
                  src: {
                    url: src
                  },
                  altText: el.getAttribute('alt') || '',
                  width: el.getAttribute('width') ? `${el.getAttribute('width')}px` : '100%'
                }
              });
              processedNodes.add(el);
            }
            return;
          }

          // Buttons -> Native Unlayer Button block
          if (tag === 'a' && (el.classList.contains('button') || el.style.backgroundColor || el.getAttribute('role') === 'button' || el.style.display === 'inline-block')) {
            contents.push({
              type: 'button',
              values: {
                text: el.innerText || el.textContent || 'Button',
                href: {
                  url: el.getAttribute('href') || '#'
                },
                buttonColors: {
                  color: el.style.color || '#ffffff',
                  backgroundColor: el.style.backgroundColor || '#2563eb'
                }
              }
            });
            processedNodes.add(el);
            return;
          }

          // Divider -> Native Unlayer Divider block
          if (tag === 'hr') {
            contents.push({
              type: 'divider',
              values: {}
            });
            processedNodes.add(el);
            return;
          }

          // Text / Paragraphs / Lists -> Native Unlayer Text block
          if (['p', 'blockquote', 'ul', 'ol'].includes(tag)) {
            const childHeadingsOrImgs = el.querySelectorAll('h1, h2, h3, h4, h5, h6, img, hr');
            if (childHeadingsOrImgs.length === 0) {
              const htmlText = el.outerHTML || el.innerHTML || '';
              if (htmlText.trim()) {
                contents.push({
                  type: 'text',
                  values: {
                    text: htmlText,
                    color: el.style.color || '#374151',
                    fontSize: el.style.fontSize || '14px',
                    textAlign: el.style.textAlign || 'left'
                  }
                });
                processedNodes.add(el);
              }
            }
            return;
          }
        });
      }

      // Fallback if no elements extracted
      if (contents.length === 0) {
        const bodyHtml = doc.body.innerHTML || htmlContent;
        contents.push({
          type: 'text',
          values: {
            text: bodyHtml
          }
        });
      }

      const rows = contents.map(item => ({
        cells: [1],
        columns: [
          {
            contents: [item],
            values: {}
          }
        ],
        values: {}
      }));

      return {
        body: {
          rows: rows,
          values: {
            backgroundColor: '#ffffff'
          }
        }
      };
    } catch (err) {
      console.error('Failed to parse HTML into Unlayer design:', err);
      return {
        body: {
          rows: [
            {
              cells: [1],
              columns: [
                {
                  contents: [
                    {
                      type: 'text',
                      values: { text: htmlContent }
                    }
                  ],
                  values: {}
                }
              ],
              values: {}
            }
          ],
          values: { backgroundColor: '#ffffff' }
        }
      };
    }
  };

  const loadDataIntoMainEditor = (dataToLoad) => {
    const data = dataToLoad || formDataRef.current || formData;
    if (!emailEditorRef.current?.editor || !data) return;

    try {
      let designToLoad = null;
      if (data.design_json) {
        try {
          designToLoad = typeof data.design_json === 'string'
            ? JSON.parse(data.design_json)
            : data.design_json;
        } catch (e) {}
      }

      if (!designToLoad || !designToLoad.body || !Array.isArray(designToLoad.body.rows) || designToLoad.body.rows.length === 0) {
        if (data.html_content && data.html_content.trim() !== '') {
          designToLoad = htmlToUnlayerDesign(data.html_content);
        }
      }

      if (designToLoad) {
        emailEditorRef.current.editor.loadDesign(designToLoad);
      }
    } catch (err) {
      console.error('Failed to load design into Unlayer main editor:', err);
    }
  };

  const onMainEditorLoad = () => {
    setMainEditorReady(true);
    setTimeout(() => {
      loadDataIntoMainEditor(formDataRef.current);
    }, 100);
  };

  useEffect(() => {
    if (step === 5 && mainEditorReady) {
      const timer = setTimeout(() => {
        loadDataIntoMainEditor(formDataRef.current);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [step, formData.template_id, mainEditorReady]);

  const loadDataIntoFooterEditor = (dataToLoad) => {
    const data = dataToLoad || formDataRef.current || formData;
    if (!footerEditorRef.current?.editor || !data) return;
    try {
      let designToLoad = null;
      if (data.footer_design_json) {
        try {
          designToLoad = typeof data.footer_design_json === 'string'
            ? JSON.parse(data.footer_design_json)
            : data.footer_design_json;
        } catch (e) {}
      }

      if (!designToLoad || !designToLoad.body || !Array.isArray(designToLoad.body.rows) || designToLoad.body.rows.length === 0) {
        if (data.footer_html && data.footer_html.trim() !== '') {
          designToLoad = htmlToUnlayerDesign(data.footer_html);
        }
      }

      if (designToLoad) {
        footerEditorRef.current.editor.loadDesign(designToLoad);
      }
    } catch (err) {
      console.error('Failed to load design into Unlayer footer editor:', err);
    }
  };

  const onFooterEditorLoad = () => {
    setFooterEditorReady(true);
    setTimeout(() => {
      loadDataIntoFooterEditor(formDataRef.current);
    }, 100);
  };

  const exportAllEditors = async () => {
    const current = formDataRef.current;
    let mainHtml = current.html_content;
    let mainDesign = current.design_json;
    let footHtml = current.footer_html;
    let footDesign = current.footer_design_json;

    if (step === 5 && editorMode === 'visual' && emailEditorRef.current?.editor) {
      await new Promise((resolve) => {
        emailEditorRef.current.editor.exportHtml((data) => {
          if (data) {
            mainHtml = data.html || mainHtml;
            mainDesign = data.design || mainDesign;
          }
          resolve();
        });
      });
    }

    if (step === 5 && current.include_footer && current.footer_editor_type === 'builder' && footerEditorRef.current?.editor) {
      await new Promise((resolve) => {
        footerEditorRef.current.editor.exportHtml((data) => {
          if (data) {
            footHtml = data.html || footHtml;
            footDesign = data.design || footDesign;
          }
          resolve();
        });
      });
    }

    let finalHtml = mainHtml || '';
    if (current.include_footer && footHtml && footHtml.trim() !== '') {
      if (!finalHtml.includes(footHtml)) {
        if (finalHtml.includes('</body>')) {
          finalHtml = finalHtml.replace('</body>', `${footHtml}</body>`);
        } else {
          finalHtml = `${finalHtml}\n${footHtml}`;
        }
      }
    }

    const updatedFormData = {
      ...current,
      html_content: mainHtml,
      design_json: mainDesign,
      footer_html: footHtml,
      footer_design_json: footDesign
    };

    formDataRef.current = updatedFormData;
    setFormData(updatedFormData);
    return { updatedFormData, finalHtml };
  };

  const autoSaveDraft = async (overrideData = null) => {
    try {
      const dataToSave = overrideData || formDataRef.current;
      const isSingleEmail = dataToSave.target_type === 'individual_subscriber' || dataToSave.target_type === 'custom_email';
      let contentToSave = dataToSave.html_content || '';
      
      if (dataToSave.include_footer && dataToSave.footer_html && dataToSave.footer_html.trim() !== '') {
        if (!contentToSave.includes(dataToSave.footer_html)) {
          if (contentToSave.includes('</body>')) {
            contentToSave = contentToSave.replace('</body>', `${dataToSave.footer_html}</body>`);
          } else {
            contentToSave = `${contentToSave}\n${dataToSave.footer_html}`;
          }
        }
      }

      const payload = {
        name: dataToSave.name || 'Untitled Campaign Draft',
        subject: dataToSave.subject || 'No Subject',
        sender_id: dataToSave.sender_id ? String(dataToSave.sender_id) : null,
        target_type: dataToSave.target_type || 'list',
        list_id: isSingleEmail ? null : (dataToSave.list_id && !isNaN(Number(dataToSave.list_id)) ? Number(dataToSave.list_id) : null),
        target_email: isSingleEmail ? (dataToSave.target_email || '') : null,
        is_ab_test: dataToSave.is_ab_test || false,
        variant_b_subject: dataToSave.variant_b_subject || null,
        variant_b_html: dataToSave.variant_b_html || null,
        template_id: dataToSave.template_id && !isNaN(Number(dataToSave.template_id)) ? Number(dataToSave.template_id) : null,
        html_content: contentToSave,
        design_json: dataToSave.design_json ? JSON.stringify(dataToSave.design_json) : null,
        include_footer: dataToSave.include_footer ? 1 : 0,
        footer_editor_type: dataToSave.footer_editor_type || 'html',
        footer_html: dataToSave.footer_html || null,
        footer_design_json: dataToSave.footer_design_json ? JSON.stringify(dataToSave.footer_design_json) : null,
        status: 'draft'
      };

      if (editId) {
        await axios.put(`http://localhost:5000/api/campaigns/${editId}`, payload, {
          headers: { 'x-user-role': 'Admin' }
        });
      } else {
        const res = await axios.post('http://localhost:5000/api/campaigns', payload, {
          headers: { 'x-user-role': 'Admin' }
        });
        if (res.data && (res.data.id || res.data.campaignId)) {
          const newId = res.data.id || res.data.campaignId;
          navigate(`/campaigns/new?edit=${newId}`, { replace: true });
        }
      }
    } catch (err) {
      console.error('Auto-save draft error:', err);
    }
  };

  const handleSaveDraftManual = async () => {
    const { updatedFormData, finalHtml } = await exportAllEditors();
    await autoSaveDraft({ ...updatedFormData, html_content: finalHtml });
    customAlert({
      title: 'Draft Saved',
      message: 'Your campaign progress has been saved as a draft successfully!',
      type: 'success'
    });
  };

  const goToStep = async (targetStep) => {
    const { updatedFormData, finalHtml } = await exportAllEditors();
    await autoSaveDraft({ ...updatedFormData, html_content: finalHtml });
    setStep(targetStep);
  };

  const validateAndHighlight = async (targetCheckStep = null, dataToCheck = formDataRef.current) => {
    if (!targetCheckStep || targetCheckStep === 1) {
      if (!dataToCheck.name || !dataToCheck.name.trim()) {
        await customAlert({ title: 'Validation Required', message: 'Campaign Name is required. Please fill it out in Step 1.', type: 'warning' });
        setStep(1);
        setHighlightedField('name');
        return false;
      }
      if (!dataToCheck.subject || !dataToCheck.subject.trim()) {
        await customAlert({ title: 'Validation Required', message: 'Subject Line is required. Please fill it out in Step 1.', type: 'warning' });
        setStep(1);
        setHighlightedField('subject');
        return false;
      }
    }

    if (!targetCheckStep || targetCheckStep === 2) {
      if (!dataToCheck.sender_id) {
        await customAlert({ title: 'Validation Required', message: 'Sender is required. Please select a sender in Step 2.', type: 'warning' });
        setStep(2);
        setHighlightedField('sender_id');
        return false;
      }
    }

    if (!targetCheckStep || targetCheckStep === 3) {
      if (dataToCheck.target_type === 'list' && !dataToCheck.list_id) {
        await customAlert({ title: 'Validation Required', message: 'Target contact list is required. Please select a list in Step 3.', type: 'warning' });
        setStep(3);
        setHighlightedField('list_id');
        return false;
      }
      if ((dataToCheck.target_type === 'individual_subscriber' || dataToCheck.target_type === 'custom_email') && (!dataToCheck.target_email || !dataToCheck.target_email.trim())) {
        await customAlert({ title: 'Validation Required', message: 'Target Email Address is required. Please select or enter an email in Step 3.', type: 'warning' });
        setStep(3);
        setHighlightedField('target_email');
        return false;
      }
    }

    return true;
  };

  const handleNext = async () => {
    const { updatedFormData } = await exportAllEditors();
    const isValid = await validateAndHighlight(step, updatedFormData);
    if (!isValid) return;
    goToStep(Math.min(step + 1, 7));
  };

  const handlePrev = () => {
    goToStep(Math.max(step - 1, 1));
  };

  const handleTemplateSelect = async (template) => {
    const content = template?.html_content || '';
    let dJson = null;
    try {
      dJson = template?.design_json ? (typeof template.design_json === 'string' ? JSON.parse(template.design_json) : template.design_json) : null;
    } catch(e){}

    let fDesignJson = null;
    try {
      fDesignJson = template?.footer_design_json ? (typeof template.footer_design_json === 'string' ? JSON.parse(template.footer_design_json) : template.footer_design_json) : null;
    } catch(e){}

    const updated = {
      ...formDataRef.current,
      template_id: template?.id ? String(template.id) : '',
      html_content: content,
      design_json: dJson,
      include_footer: template?.include_footer !== undefined && template?.include_footer !== null ? Boolean(template.include_footer) : true,
      footer_editor_type: template?.footer_editor_type || 'html',
      footer_html: template?.footer_html || DEFAULT_FOOTER_HTML,
      footer_design_json: fDesignJson
    };

    formDataRef.current = updated;
    setFormData(updated);

    if (emailEditorRef.current?.editor) {
      setTimeout(() => {
        loadDataIntoMainEditor(updated);
      }, 100);
    }
    if (footerEditorRef.current?.editor && updated.include_footer) {
      setTimeout(() => {
        loadDataIntoFooterEditor(updated);
      }, 100);
    }

    await autoSaveDraft(updated);
    setStep(5);
  };

  const handleUpdateSelectedTemplate = async () => {
    if (!formData.template_id) return;
    try {
      const { updatedFormData } = await exportAllEditors();
      await axios.put(`http://localhost:5000/api/templates/${formData.template_id}`, {
        html_content: updatedFormData.html_content,
        design_json: JSON.stringify(updatedFormData.design_json),
        include_footer: updatedFormData.include_footer ? 1 : 0,
        footer_editor_type: updatedFormData.footer_editor_type,
        footer_html: updatedFormData.footer_html,
        footer_design_json: JSON.stringify(updatedFormData.footer_design_json)
      }, {
        headers: { 'x-user-role': 'Admin' }
      });
      customAlert({ title: 'Success', message: 'Template updated successfully in database!', type: 'success' });
    } catch (err) {
      console.error('Failed to update template:', err);
      customAlert({ title: 'Error', message: 'Failed to update template in database.', type: 'danger' });
    }
  };

  const handleDispatch = async () => {
    const { updatedFormData, finalHtml } = await exportAllEditors();

    const isValid = await validateAndHighlight(null, updatedFormData);
    if (!isValid) return;

    setLoading(true);
    try {
      const isSingleEmail = updatedFormData.target_type === 'individual_subscriber' || updatedFormData.target_type === 'custom_email';
      let dispatchHtml = finalHtml || updatedFormData.html_content || '<h1>Default Campaign</h1>';

      const targetStatus = (updatedFormData.dispatch_option === 'schedule' || updatedFormData.scheduled_at)
        ? 'scheduled'
        : (updatedFormData.dispatch_option === 'direct_send' ? 'sending' : 'submitted_for_review');

      const payload = {
        name: updatedFormData.name,
        campaignName: updatedFormData.name,
        subject: updatedFormData.subject,
        sender_id: updatedFormData.sender_id,
        senderId: updatedFormData.sender_id,
        sender_mode: updatedFormData.sender_mode || 'broadcast',
        senderMode: updatedFormData.sender_mode || 'broadcast',
        sender_mapping: updatedFormData.sender_mapping || null,
        senderMapping: updatedFormData.sender_mapping || null,
        list_id: isSingleEmail ? null : updatedFormData.list_id,
        listId: isSingleEmail ? null : updatedFormData.list_id,
        target_email: isSingleEmail ? updatedFormData.target_email.trim() : null,
        targetEmail: isSingleEmail ? updatedFormData.target_email.trim() : null,
        is_ab_test: updatedFormData.is_ab_test,
        isAbTest: updatedFormData.is_ab_test,
        variant_b_subject: updatedFormData.variant_b_subject,
        variantBSubject: updatedFormData.variant_b_subject,
        variant_b_html: updatedFormData.variant_b_html,
        variantBHtml: updatedFormData.variant_b_html,
        template_id: updatedFormData.template_id,
        html_content: dispatchHtml,
        htmlContent: dispatchHtml,
        design_json: updatedFormData.design_json ? JSON.stringify(updatedFormData.design_json) : null,
        include_footer: updatedFormData.include_footer ? 1 : 0,
        footer_editor_type: updatedFormData.footer_editor_type || 'html',
        footer_html: updatedFormData.footer_html || null,
        footer_design_json: updatedFormData.footer_design_json ? JSON.stringify(updatedFormData.footer_design_json) : null,
        scheduled_at: updatedFormData.scheduled_at || null,
        status: targetStatus
      };

      if (editId) {
        await axios.put(`http://localhost:5000/api/campaigns/${editId}`, payload, {
          headers: { 'x-user-role': 'Admin' }
        });
      } else {
        await axios.post('http://localhost:5000/api/campaigns/dispatch', payload);
      }
      setDispatchedSuccess(true);

      const alertTitle = targetStatus === 'submitted_for_review' 
        ? 'Submitted for Review' 
        : (targetStatus === 'scheduled' ? 'Campaign Scheduled' : 'Campaign Dispatched');
      const alertMsg = targetStatus === 'submitted_for_review' 
        ? 'Campaign saved successfully and submitted for admin review!' 
        : (targetStatus === 'scheduled' ? 'Campaign scheduled successfully!' : 'Campaign dispatched for immediate sending!');

      customAlert({ title: alertTitle, message: alertMsg, type: 'success' });
    } catch (error) {
      console.error('Dispatch error:', error);
      customAlert({ title: 'Dispatch Error', message: error.response?.data?.error || 'Failed to dispatch campaign.', type: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  const selectedEmails = formData.target_email 
    ? formData.target_email.split(',').map(e => e.trim()).filter(Boolean)
    : [];

  const handleToggleSubscriber = (email) => {
    let newEmails;
    if (selectedEmails.includes(email)) {
      newEmails = selectedEmails.filter(e => e !== email);
    } else {
      newEmails = [...selectedEmails, email];
    }
    setFormData(prev => ({
      ...prev,
      target_email: newEmails.join(',')
    }));
  };

  const steps = [
    { id: 1, title: 'Setup', icon: <Settings size={18} /> },
    { id: 2, title: 'Sender', icon: <User size={18} /> },
    { id: 3, title: 'Audience', icon: <Users size={18} /> },
    { id: 4, title: 'Template', icon: <FileText size={18} /> },
    { id: 5, title: 'Editor', icon: <Monitor size={18} /> },
    { id: 6, title: 'Preview & Review', icon: <Sparkles size={18} /> },
    { id: 7, title: 'Schedule', icon: <Calendar size={18} /> },
  ];

  if (dispatchedSuccess) {
    return (
      <div className="max-w-2xl mx-auto my-12 bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
        <div className="w-16 h-16 rounded-full bg-green-100 border border-green-200 flex items-center justify-center mx-auto text-green-600 shadow-sm">
          <Check size={36} />
        </div>

        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1.5">
            {formData.dispatch_option === 'review' || (!formData.dispatch_option && !formData.scheduled_at)
              ? 'Submitted for Admin Review!'
              : (formData.scheduled_at ? 'Campaign Scheduled Successfully!' : 'Campaign Dispatched Successfully!')}
          </h2>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            {formData.dispatch_option === 'review' || (!formData.dispatch_option && !formData.scheduled_at)
              ? <>Your campaign <strong className="text-gray-800">{formData.name}</strong> has been saved with status <span className="text-amber-700 font-bold">Review Pending</span>. It will not be sent until an admin accepts and confirms review.</>
              : <>Your campaign <strong className="text-gray-800">{formData.name}</strong> has been saved and queued for sending in the database.</>}
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
              setStep(6);
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
        
        {/* Top Right Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSaveDraftManual}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl transition border border-gray-300 shadow-sm"
          >
            <FileText size={15} /> Save Draft
          </button>
          <select
            defaultValue="review"
            onChange={(e) => {
              const val = e.target.value;
              if (val === 'review') goToStep(6);
              if (val === 'direct_send') handleDispatch();
            }}
            className="px-4 py-2.5 bg-white border border-gray-300 hover:border-gray-400 text-gray-800 text-xs font-bold rounded-xl transition-all shadow-sm focus:ring-2 focus:ring-primary-500 outline-none cursor-pointer"
          >
            <option value="review">✓ Review Campaign</option>
            <option value="direct_send">🚀 Direct Send Campaign</option>
          </select>
        </div>
      </div>

      {/* Progress Bar - Fully Responsive, 100% No Horizontal Scroll */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 mb-6 w-full">
        <div className="flex items-center justify-between w-full">
          {steps.map((s, index) => (
            <React.Fragment key={s.id}>
              <button 
                type="button"
                onClick={() => goToStep(s.id)}
                className="flex items-center gap-2 justify-center focus:outline-none group transition-all"
              >
                <div className={`flex items-center justify-center w-8 h-8 md:w-9 md:h-9 rounded-full border-2 transition-all shrink-0 ${
                  step > s.id 
                    ? 'bg-primary-600 border-primary-600 text-white shadow-sm' 
                    : step === s.id 
                      ? 'border-primary-600 text-white bg-primary-600 ring-4 ring-primary-100 shadow-md scale-105' 
                      : 'border-gray-200 text-gray-400 bg-gray-50 group-hover:border-gray-300 group-hover:text-gray-600'
                }`}>
                  {step > s.id ? <Check size={16} /> : s.icon}
                </div>

                <div className="hidden lg:block text-left">
                  <p className={`text-[10px] uppercase tracking-wider font-extrabold leading-none ${step === s.id ? 'text-primary-600' : 'text-gray-400'}`}>
                    Step {s.id}
                  </p>
                  <p className={`text-xs font-bold leading-tight truncate ${step === s.id ? 'text-gray-900' : 'text-gray-500'}`}>
                    {s.title}
                  </p>
                </div>
              </button>

              {index < steps.length - 1 && (
                <div className={`h-0.5 flex-1 mx-1.5 md:mx-2 rounded transition-colors ${
                  step > s.id ? 'bg-primary-600' : 'bg-gray-200'
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 min-h-[400px]">
        
        {step === 1 && (
          <div className="space-y-6 max-w-2xl mx-auto animate-in fade-in zoom-in-95 duration-300">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Basic Setup</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Internal Campaign Name <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                name="name" 
                data-field="name"
                value={formData.name} 
                onChange={(e) => { setHighlightedField(null); handleChange(e); }} 
                onFocus={() => setHighlightedField(null)}
                className={`w-full border rounded-lg p-3 transition-all duration-300 ${
                  highlightedField === 'name' 
                    ? 'border-red-500 ring-4 ring-red-200/90 bg-red-50/40 animate-pulse shadow-md font-bold text-gray-900' 
                    : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
                }`} 
                placeholder="e.g. Summer Sale 2026" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email Subject Line <span className="text-red-500">*</span></label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  name="subject" 
                  data-field="subject"
                  value={formData.subject} 
                  onChange={(e) => { setHighlightedField(null); handleChange(e); }} 
                  onFocus={() => setHighlightedField(null)}
                  className={`flex-1 border rounded-lg p-3 transition-all duration-300 ${
                    highlightedField === 'subject' 
                      ? 'border-red-500 ring-4 ring-red-200/90 bg-red-50/40 animate-pulse shadow-md font-bold text-gray-900' 
                      : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
                  }`} 
                  placeholder="Check out our latest deals!" 
                />
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

              {/* Highlighted Notice Message Line */}
              <div className="mt-3 p-3 bg-amber-50/80 border-l-4 border-amber-500 rounded-r-xl flex items-center gap-2.5 text-xs text-amber-900 shadow-xs">
                <Mail size={16} className="text-amber-600 shrink-0" />
                <div>
                  <span className="font-bold text-amber-800 mr-1.5">Note:</span>
                  <span className="bg-amber-200/90 text-amber-950 font-bold px-2 py-0.5 rounded border border-amber-300/70 inline-block shadow-2xs">
                    This subject is used as the official subject line for your email campaign.
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 max-w-2xl mx-auto animate-in fade-in zoom-in-95 duration-300">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2 border-b border-gray-100 pb-3">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Sender Details</h2>
                <p className="text-xs text-gray-500 mt-0.5">Select an active sender profile / SMTP configuration for your campaign.</p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/profiles')}
                className="text-xs font-semibold text-primary-600 hover:text-primary-800 bg-primary-50 px-3 py-1.5 rounded-lg border border-primary-200 transition-all flex items-center gap-1 shadow-sm shrink-0"
              >
                + Add New Sender
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Who is sending this email? <span className="text-red-500">*</span>
                </label>
                <select
                  name="sender_id"
                  data-field="sender_id"
                  value={formData.sender_id}
                  onChange={(e) => { setHighlightedField(null); handleChange(e); }}
                  onFocus={() => setHighlightedField(null)}
                  className={`w-full border rounded-xl p-3 text-sm font-medium shadow-xs transition-all duration-300 ${
                    highlightedField === 'sender_id' 
                      ? 'border-red-500 ring-4 ring-red-200/90 bg-red-50/40 animate-pulse shadow-md font-bold text-gray-900' 
                      : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500 bg-white'
                  }`}
                >
                  {senders.map(s => (
                    <option key={s.id} value={s.id.toString()}>
                      {s.name} &lt;{s.email}&gt; {s.smtp_host ? `(SMTP: ${s.smtp_host}:${s.smtp_port || 587})` : ''} {s.is_default ? '• Default Sender' : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-500 mt-1.5">Emails will be dispatched using the selected SMTP sender profile credentials.</p>
              </div>

              {/* Dynamic SMTP Details Banner for Selected Sender */}
              {(() => {
                const selectedSender = senders.find(s => s.id.toString() === String(formData.sender_id || '')) || senders.find(s => s.is_default) || senders[0];
                if (!selectedSender) return null;

                const activeSmtpUser = selectedSender?.smtp_user || selectedSender?.email || systemSmtp.smtp_user || 'info@bexcodeservices.com';
                const host = selectedSender?.smtp_host || systemSmtp.smtp_host || 'smtp.gmail.com';
                const port = selectedSender?.smtp_port || systemSmtp.smtp_port || 465;
                const secure = selectedSender?.smtp_secure || systemSmtp.smtp_secure || 'ssl';
                const isCustom = !!(selectedSender?.smtp_host && selectedSender?.smtp_port);

                return (
                  <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-200 shadow-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center shrink-0">
                        <Mail size={18} className="text-blue-600" />
                      </div>
                      <div>
                        <span className="block text-xs font-bold text-gray-900">
                          Active SMTP Email: <span className="text-blue-700">{activeSmtpUser}</span> ({selectedSender.name})
                        </span>
                        <span className="block text-[11px] text-gray-500 mt-0.5">
                          SMTP Configuration: <strong className="text-gray-700">{host}:{port}</strong> ({secure}) — {isCustom ? 'Custom Sender SMTP' : 'System Default SMTP'}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenTestSmtpInWizard(selectedSender)}
                      className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5 shrink-0"
                    >
                      <Send size={13} /> Test SMTP Connection
                    </button>
                  </div>
                );
              })()}
            </div>
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

            {/* SMTP Sender Routing Box for Target Audience (When 2+ senders selected) */}
            {(() => {
              const selectedSenderIds = (formData.sender_id || '')
                .split(',')
                .map(id => id.trim())
                .filter(Boolean);

              const selectedSendersObj = senders.filter(s => selectedSenderIds.includes(s.id.toString()));

              if (selectedSendersObj.length <= 1) return null;

              return (
                <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-emerald-900 flex items-center gap-2">
                      <Mail size={16} className="text-emerald-600" /> SMTP Sender Routing for Target Audience
                    </h4>
                    <span className="text-[10px] font-extrabold px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
                      {selectedSendersObj.length} Senders Active
                    </span>
                  </div>

                  <p className="text-xs text-emerald-800 font-medium">
                    Configure which SMTP email account sends to this Target Audience:
                  </p>

                  <div className="space-y-2">
                    {/* Option 1: Broadcast to Audience from ALL Selected Senders */}
                    <label 
                      onClick={() => {
                        setFormData(prev => ({ 
                          ...prev, 
                          sender_mode: 'broadcast',
                          sender_mapping: { ...prev.sender_mapping, 'all': selectedSendersObj.map(s => s.id) } 
                        }));
                      }}
                      className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${
                        (!formData.sender_mode || formData.sender_mode === 'broadcast')
                          ? 'border-emerald-600 bg-white shadow-sm ring-1 ring-emerald-300'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 text-xs font-bold text-gray-900">
                        <input 
                          type="radio" 
                          name="smtp_routing_option" 
                          checked={!formData.sender_mode || formData.sender_mode === 'broadcast'} 
                          readOnly 
                          className="text-emerald-600 focus:ring-emerald-500" 
                        />
                        <span>Send from ALL Selected Senders (Dual Broadcast from {selectedSendersObj.map(s => s.email).join(' & ')})</span>
                      </div>
                      <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200">
                        Receive from BOTH Senders
                      </span>
                    </label>

                    {/* Option 2: Individual Sender routing */}
                    {selectedSendersObj.map(s => {
                      const isSingleSelected = formData.sender_mode === 'custom' && formData.sender_mapping?.['all']?.[0] === s.id;
                      return (
                        <label 
                          key={s.id}
                          onClick={() => {
                            setFormData(prev => ({ 
                              ...prev, 
                              sender_mode: 'custom',
                              sender_mapping: { ...prev.sender_mapping, 'all': [s.id] } 
                            }));
                          }}
                          className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${
                            isSingleSelected
                              ? 'border-emerald-600 bg-white shadow-sm ring-1 ring-emerald-300'
                              : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 text-xs font-bold text-gray-900">
                            <input 
                              type="radio" 
                              name="smtp_routing_option" 
                              checked={isSingleSelected} 
                              readOnly 
                              className="text-emerald-600 focus:ring-emerald-500" 
                            />
                            <span>Send to this Audience ONLY from: <strong className="text-emerald-900">{s.name} &lt;{s.email}&gt;</strong></span>
                          </div>
                          <span className="text-[10px] font-bold bg-gray-100 text-gray-700 px-2 py-0.5 rounded border border-gray-200">
                            Single SMTP Only
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Option A: Select List (Multi-Select Supported) */}
            {formData.target_type === 'list' && (
              (() => {
                const selectedListIds = (formData.list_id || '')
                  .split(',')
                  .map(id => id.trim())
                  .filter(Boolean);

                const isAllSelected = selectedListIds.includes('all');

                const toggleList = (idStr) => {
                  let current = [...selectedListIds];
                  if (idStr === 'all') {
                    setFormData(prev => ({ ...prev, list_id: 'all' }));
                    return;
                  }

                  current = current.filter(i => i !== 'all');
                  if (current.includes(idStr)) {
                    if (current.length > 1) {
                      current = current.filter(i => i !== idStr);
                    }
                  } else {
                    current.push(idStr);
                  }
                  setFormData(prev => ({ ...prev, list_id: current.join(',') }));
                };

                const selectAllLists = () => {
                  setFormData(prev => ({ ...prev, list_id: 'all' }));
                };

                const selectedListsObj = lists.filter(l => selectedListIds.includes(l.id.toString()));
                const totalSelectedSubscribers = isAllSelected 
                  ? subscribers.filter(s => s.status === 'subscribed').length || subscribers.length
                  : selectedListsObj.reduce((acc, curr) => acc + (Number(curr.subscriber_count || curr.contacts_count || 0)), 0);

                return (
                  <div className="pt-2 space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="block text-sm font-semibold text-gray-700">
                        Which list should receive this? <span className="text-red-500">*</span>
                        <span className="text-xs font-normal text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 ml-2 font-bold">
                          {isAllSelected ? 'All Lists Selected' : `Multi-Select (${selectedListIds.length} Selected • ~${totalSelectedSubscribers} Subscribers)`}
                        </span>
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={selectAllLists}
                          className="text-xs font-bold text-primary-600 hover:text-primary-700 bg-primary-50 px-2.5 py-1 rounded-lg border border-primary-200 transition cursor-pointer"
                        >
                          Select All Lists
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, list_id: '' }))}
                          className="text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-lg border border-red-200 transition cursor-pointer"
                        >
                          Clear All
                        </button>
                      </div>
                    </div>

                    {/* Selected List Badges */}
                    <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl">
                      {isAllSelected ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-lg shadow-2xs">
                          <span>🌐 All Target Lists ({lists.length} Contact Lists • {subscribers.length} Subscribers)</span>
                        </span>
                      ) : selectedListsObj.length > 0 ? (
                        selectedListsObj.map(l => (
                          <span key={l.id} className="inline-flex items-center gap-1.5 px-3 py-1 bg-white text-primary-700 text-xs font-bold rounded-lg border border-primary-200 shadow-2xs">
                            <span>{l.name} ({l.subscriber_count || l.contacts_count || 0} subscribers)</span>
                            {selectedListsObj.length > 1 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleList(l.id.toString());
                                }}
                                className="text-gray-400 hover:text-red-600 p-0.5 rounded-full"
                              >
                                <X size={12} />
                              </button>
                            )}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-gray-400 px-2 py-0.5">No list selected yet</span>
                      )}
                    </div>

                    {/* Multi-Select List Options */}
                    <div 
                      data-field="list_id"
                      className={`border rounded-xl p-2 bg-white max-h-56 overflow-y-auto space-y-1.5 shadow-2xs transition-all duration-300 ${
                        highlightedField === 'list_id' 
                          ? 'border-red-500 ring-4 ring-red-200/90 bg-red-50/20 animate-pulse shadow-md' 
                          : 'border-gray-300'
                      }`}
                    >
                      {/* All Target Lists Option */}
                      <div
                        onClick={() => { setHighlightedField(null); toggleList('all'); }}
                        className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all ${
                          isAllSelected 
                            ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-400/30' 
                            : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100/80'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                            isAllSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 bg-white'
                          }`}>
                            {isAllSelected && <Check size={14} />}
                          </div>
                          <div>
                            <p className="text-xs font-extrabold text-blue-900 flex items-center gap-1.5">
                              <span>🌐 All Target Lists (All Active Contact Lists)</span>
                            </p>
                            <p className="text-[11px] text-blue-600 font-medium">Global dispatch to all {lists.length} lists and subscribers</p>
                          </div>
                        </div>
                        <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded border border-blue-200">
                          {lists.length} Lists
                        </span>
                      </div>

                      {/* Individual Lists */}
                      {lists.map(l => {
                        const countFromApi = Number(l.subscriber_count ?? l.contacts_count ?? 0);
                        const countFromState = subscribers.filter(s => {
                          if (s.list_ids) {
                            const ids = String(s.list_ids).split(',');
                            return ids.includes(String(l.id));
                          }
                          return false;
                        }).length;

                        const count = countFromApi > 0 ? countFromApi : countFromState;
                        const isSelected = !isAllSelected && selectedListIds.includes(l.id.toString());

                        return (
                          <div
                            key={l.id}
                            onClick={() => { setHighlightedField(null); toggleList(l.id.toString()); }}
                            className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all ${
                              isSelected 
                                ? 'bg-primary-50/80 border-primary-300 ring-1 ring-primary-400/30' 
                                : 'bg-white border-gray-100 hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                                isSelected ? 'bg-primary-600 border-primary-600 text-white' : 'border-gray-300 bg-white'
                              }`}>
                                {isSelected && <Check size={14} />}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-gray-900">{l.name}</p>
                                {l.description && <p className="text-[11px] text-gray-400">{l.description}</p>}
                              </div>
                            </div>
                            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded border ${
                              count > 0 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              {count} Assigned Contacts
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-[11px] text-gray-500">Check one or multiple target lists to broadcast this campaign to all assigned contacts.</p>
                  </div>
                );
              })()
            )}

            {/* Option B: Select Individual Subscriber from Database */}
            {formData.target_type === 'individual_subscriber' && (
              <div className="pt-2 space-y-3">
                <label className="block text-sm font-semibold text-gray-700">Select Individual Subscriber <span className="text-red-500">*</span></label>
                
                {/* Selected tags */}
                {selectedEmails.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 p-2 bg-gray-50 border border-gray-200 rounded-lg max-h-28 overflow-y-auto">
                    {selectedEmails.map(email => {
                      const sub = subscribers.find(s => s.email === email);
                      const nameDisplay = sub && sub.first_name ? ` (${sub.first_name})` : '';
                      return (
                        <span key={email} className="inline-flex items-center gap-1 bg-white text-xs font-medium text-gray-800 px-2.5 py-1 rounded-md border border-gray-200 shadow-sm">
                          {email}{nameDisplay}
                          <button 
                            type="button" 
                            onClick={() => handleToggleSubscriber(email)}
                            className="text-gray-400 hover:text-gray-600 focus:outline-none cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Search and control buttons */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Search by email or name..."
                    value={subscriberSearch}
                    onChange={(e) => setSubscriberSearch(e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg p-2 focus:ring-primary-500 focus:border-primary-500 text-sm bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const filtered = subscribers.filter(sub => {
                        if (!sub || !sub.email) return false;
                        const search = String(subscriberSearch || '').toLowerCase();
                        return String(sub.email).toLowerCase().includes(search) || 
                          (sub.first_name && String(sub.first_name).toLowerCase().includes(search));
                      });
                      const allFilteredEmails = filtered.map(sub => sub.email);
                      const union = Array.from(new Set([...selectedEmails, ...allFilteredEmails]));
                      setFormData(prev => ({ ...prev, target_email: union.join(',') }));
                    }}
                    className="text-xs px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium cursor-pointer"
                  >
                    Select All Filtered
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, target_email: '' }));
                    }}
                    className="text-xs px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-red-600 cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>

                {/* Scrollable list of subscribers */}
                <div 
                  data-field="target_email"
                  className={`border rounded-lg overflow-hidden bg-white max-h-60 overflow-y-auto transition-all duration-300 ${
                    highlightedField === 'target_email'
                      ? 'border-red-500 ring-4 ring-red-200/90 bg-red-50/20 animate-pulse shadow-md'
                      : 'border-gray-200'
                  }`}
                >
                  {subscribers.filter(sub => {
                    if (!sub || !sub.email) return false;
                    const search = String(subscriberSearch || '').toLowerCase();
                    return String(sub.email).toLowerCase().includes(search) || 
                      (sub.first_name && String(sub.first_name).toLowerCase().includes(search));
                  }).length === 0 ? (
                    <div className="p-4 text-center text-sm text-gray-500">No subscribers found</div>
                  ) : (
                    subscribers
                      .filter(sub => {
                        if (!sub || !sub.email) return false;
                        const search = String(subscriberSearch || '').toLowerCase();
                        return String(sub.email).toLowerCase().includes(search) || 
                          (sub.first_name && String(sub.first_name).toLowerCase().includes(search));
                      })
                      .map(sub => {
                        const isChecked = selectedEmails.includes(sub.email);
                        return (
                          <label 
                            key={sub.id} 
                            className={`flex items-center justify-between p-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 cursor-pointer text-sm ${isChecked ? 'bg-primary-50/20' : ''}`}
                          >
                            <div className="flex items-center gap-3">
                              <input 
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => { setHighlightedField(null); handleToggleSubscriber(sub.email); }}
                                className="text-primary-600 focus:ring-primary-500 rounded border-gray-300 cursor-pointer"
                              />
                              <span className="font-medium text-gray-900">{sub.email}</span>
                            </div>
                            {sub.first_name && (
                              <span className="text-xs text-gray-500 font-medium bg-gray-100 px-2 py-0.5 rounded-full">{sub.first_name}</span>
                            )}
                          </label>
                        );
                      })
                  )}
                </div>
                <p className="text-xs text-gray-500">Select one or more subscribers from your database to send this campaign to.</p>
              </div>
            )}

            {/* Option C: Custom Target Email Input */}
            {formData.target_type === 'custom_email' && (
              <div className="pt-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Target Email Address <span className="text-red-500">*</span></label>
                <input 
                  type="email" 
                  name="target_email" 
                  data-field="target_email"
                  value={formData.target_email} 
                  onChange={(e) => { setHighlightedField(null); handleChange(e); }} 
                  onFocus={() => setHighlightedField(null)}
                  className={`w-full border rounded-lg p-3 text-sm bg-white transition-all duration-300 ${
                    highlightedField === 'target_email' 
                      ? 'border-red-500 ring-4 ring-red-200/90 bg-red-50/40 animate-pulse shadow-md font-bold text-gray-900' 
                      : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
                  }`} 
                  placeholder="e.g. recipient@example.com or vimal@bexcodeservices.com" 
                />
                <p className="text-xs text-gray-500 mt-2">Type the target email address for this individual campaign send.</p>
              </div>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-gray-100 pb-3">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Select Template</h2>
                <p className="text-xs text-gray-500 mt-0.5">Start with a blank canvas or pick a pre-designed email template to customize.</p>
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
                    formData.template_id === String(t.id) 
                      ? 'border-primary-500 bg-primary-50/50 ring-2 ring-primary-200 shadow-md' 
                      : 'border-gray-200 hover:border-primary-300 hover:shadow-sm bg-white'
                  }`}
                  onClick={() => {
                    handleTemplateSelect(t);
                  }}
                >
                  <div>
                    <div className="w-full h-36 bg-gray-100 rounded-xl mb-3 flex items-center justify-center overflow-hidden border border-gray-200/80 relative">
                      <iframe srcDoc={t.html_content} title={t.name || t.template_name} style={{ transform: 'scale(0.25)', transformOrigin: 'top left', width: '400%', height: '400%' }} className="pointer-events-none absolute top-0 left-0 border-0" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-sm">{t.name || t.template_name}</h3>
                  </div>
                  <button 
                    type="button" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTemplateSelect(t);
                    }}
                    className="mt-3 w-full py-2.5 bg-primary-50 hover:bg-primary-600 text-primary-700 hover:text-white border border-primary-200 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    🎨 Select & Edit Template
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-gray-100 pb-3">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Email Content Editor</h2>
                <p className="text-xs text-gray-500 mt-0.5">Customize your email template content before sending.</p>
              </div>

              <div className="flex items-center gap-2">
                {formData.template_id && (
                  <button
                    type="button"
                    onClick={handleUpdateSelectedTemplate}
                    className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-xs"
                    title="Update selected template in database"
                  >
                    💾 Save Changes to Template
                  </button>
                )}

                {/* Editor Mode Tabs */}
                <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setEditorMode('visual');
                      if (emailEditorRef.current?.editor) {
                        loadDataIntoMainEditor(formData);
                      }
                    }}
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
            </div>

            {editorMode === 'visual' ? (
              <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm min-h-[650px] bg-white">
                <EmailEditor 
                  ref={emailEditorRef} 
                  onLoad={onMainEditorLoad}
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

            {/* Footer Settings Section - Matching Image 4 */}
            <div className="border-t border-gray-200 pt-6 mt-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-gray-700">
                  <input 
                    type="checkbox"
                    checked={formData.include_footer}
                    onChange={e => setFormData({ ...formData, include_footer: e.target.checked })}
                    className="rounded text-primary-600 focus:ring-primary-500 w-4 h-4 cursor-pointer"
                  />
                  Include Custom Email Footer at the bottom
                </label>

                {formData.include_footer && (
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

              {formData.include_footer && (
                <div className="p-5 bg-gray-50 rounded-2xl border border-gray-200 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                    <h4 className="text-xs font-bold text-gray-700">Footer Editor</h4>
                    <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Editing Footer Block</span>
                  </div>

                  {formData.footer_editor_type === 'html' ? (
                    <div className="space-y-2">
                      <label className="block text-[11px] font-bold text-gray-600">HTML Code for Footer</label>
                      <textarea
                        value={formData.footer_html}
                        onChange={e => setFormData({ ...formData, footer_html: e.target.value })}
                        className="w-full h-36 p-3 font-mono text-xs text-emerald-600 bg-slate-900 rounded-xl outline-none border border-slate-700 resize-y shadow-inner"
                        placeholder="<!-- Write your footer HTML here -->"
                      />
                      <p className="text-[10px] text-gray-500 mt-1">This HTML will be automatically injected at the bottom of the main template HTML.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="block text-[11px] font-bold text-gray-600">Visual Footer Builder</label>
                      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden h-[420px] shadow-sm">
                        <EmailEditor 
                          ref={footerEditorRef} 
                          onLoad={onFooterEditorLoad} 
                          minHeight="420px"
                        />
                      </div>
                      <p className="text-[10px] text-gray-500 mt-1">Design the footer visually. It will be saved and merged at the bottom of the template.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {step === 6 && (() => {
          // Resolve Sender(s)
          const senderIds = String(formData.sender_id || '').split(',').map(id => id.trim()).filter(Boolean);
          const selectedSenders = senders.filter(s => senderIds.includes(s.id.toString()));
          const isMultiSender = selectedSenders.length > 1;

          const senderName = isMultiSender
            ? selectedSenders.map(s => s.name).join(' & ')
            : (selectedSenders[0]?.name || senders.find(s => s.is_default)?.name || 'Default System Sender');

          const senderEmail = isMultiSender
            ? selectedSenders.map(s => s.email).join(' & ')
            : (selectedSenders[0]?.email || senders.find(s => s.is_default)?.email || 'noreply@bexcodeservices.com');

          const smtpUser = isMultiSender
            ? selectedSenders.map(s => `${s.name} <${s.smtp_user || s.email}>`).join(' | ')
            : (selectedSenders[0]?.smtp_user || systemSmtp?.smtp_user || senderEmail);

          const smtpHost = isMultiSender
            ? selectedSenders.map(s => s.smtp_host || 'smtp.gmail.com').join(' | ')
            : (selectedSenders[0]?.smtp_host || systemSmtp?.smtp_host || 'smtp.gmail.com');

          const smtpPort = isMultiSender
            ? selectedSenders.map(s => s.smtp_port || 587).join(' | ')
            : (selectedSenders[0]?.smtp_port || systemSmtp?.smtp_port || 587);

          const smtpSecure = isMultiSender
            ? selectedSenders.map(s => s.smtp_secure || 'tls').join(' | ')
            : (selectedSenders[0]?.smtp_secure || systemSmtp?.smtp_secure || 'tls');

          const isCustomSmtp = isMultiSender || !!(selectedSenders[0]?.smtp_host && selectedSenders[0]?.smtp_port);

          // Resolve Audience
          const selectedList = lists.find(l => l && l.id !== undefined && String(l.id) === String(formData.list_id || ''));
          let audienceTypeTag = 'Subscriber List';
          let audienceTitle = 'All Contacts Directory';
          let audienceDetail = 'Sending to all contacts';
          let contactCount = subscribers.length;

          if (formData.target_type === 'list') {
            audienceTypeTag = 'Subscriber List';
            if (selectedList) {
              audienceTitle = selectedList.name;
              contactCount = selectedList.subscriber_count || selectedList.contacts_count || selectedList.subscriberCount || 0;
              audienceDetail = `Saved list ID #${selectedList.id}`;
            } else {
              audienceTitle = 'Target List';
              audienceDetail = 'All Active Subscribers';
            }
          } else if (formData.target_type === 'individual_subscriber') {
            audienceTypeTag = 'Selected Contacts';
            const emails = String(formData.target_email || '').split(',').map(e => e.trim()).filter(Boolean);
            contactCount = emails.length;
            audienceTitle = `${emails.length} Selected Contact(s)`;
            audienceDetail = emails.slice(0, 3).join(', ') + (emails.length > 3 ? ` ...+${emails.length - 3} more` : '');
          } else if (formData.target_type === 'custom_email') {
            audienceTypeTag = 'Custom Email';
            const emails = String(formData.target_email || '').split(',').map(e => e.trim()).filter(Boolean);
            contactCount = emails.length || 1;
            audienceTitle = formData.target_email || 'Single Email Recipient';
            audienceDetail = 'Custom recipient address';
          }

          // Resolve Template & Content
          const selectedTemplate = templates.find(t => t && t.id !== undefined && String(t.id) === String(formData.template_id || ''));
          const templateName = selectedTemplate ? (selectedTemplate.name || selectedTemplate.template_name) : (formData.html_content ? 'Custom Content' : 'Blank Template');
          const designMode = editorMode === 'visual' ? '🎨 Drag & Drop Visual Builder' : '💻 Custom HTML Code Editor';
          const textSnippet = (formData.html_content || '').replace(/<[^>]+>/g, ' ').slice(0, 150).trim();

          // Resolve Schedule & Dispatch Strategy
          let dispatchTitle = 'Immediate Direct Send';
          let dispatchBadgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300';

          if (formData.dispatch_option === 'review') {
            dispatchTitle = 'Pending Admin Review';
            dispatchBadgeClass = 'bg-amber-100 text-amber-800 border-amber-300';
          } else if (formData.scheduled_at || formData.dispatch_option === 'schedule') {
            const formattedTime = formData.scheduled_at ? new Date(formData.scheduled_at).toLocaleString() : 'Scheduled Date & Time';
            dispatchTitle = `Scheduled for ${formattedTime}`;
            dispatchBadgeClass = 'bg-purple-100 text-purple-800 border-purple-300';
          }

          // Combine Email HTML and Footer HTML for Live Preview
          let mergedPreviewHtml = formData.html_content || '<div style="padding: 20px; font-family: sans-serif; text-align: center; color: #888;">No content designed yet. Proceed to Step 5 to edit the layout.</div>';
          if (formData.include_footer && formData.footer_html && formData.footer_html.trim() !== '') {
            if (!mergedPreviewHtml.includes(formData.footer_html)) {
              if (mergedPreviewHtml.includes('</body>')) {
                mergedPreviewHtml = mergedPreviewHtml.replace('</body>', `${formData.footer_html}</body>`);
              } else {
                mergedPreviewHtml = `${mergedPreviewHtml}\n${formData.footer_html}`;
              }
            }
          }

          return (
            <div className="space-y-8 max-w-6xl mx-auto animate-in fade-in zoom-in-95 duration-300">
              <div className="text-center space-y-1">
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Review & Live Preview</h2>
                <p className="text-xs text-gray-500">Double check all configurations, sender details, audience, and preview live email content before scheduling.</p>
              </div>

              {/* Main Review Summary Banner (Step 8 UI) */}
              <div className="bg-gradient-to-r from-primary-900 via-primary-800 to-indigo-900 text-white rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-primary-200 bg-white/10 px-2.5 py-1 rounded-full border border-white/20">
                      Campaign Review & Final Dispatch
                    </span>
                    <h3 className="text-2xl font-black mt-2 text-white">{formData.name || 'Untitled Campaign'}</h3>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1.5 rounded-xl border text-xs font-bold ${dispatchBadgeClass}`}>
                      {dispatchTitle}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs pt-1">
                  <div className="bg-white/10 p-3 rounded-xl backdrop-blur-sm border border-white/10">
                    <span className="block text-[10px] font-extrabold uppercase text-primary-200">Sender</span>
                    <span className="font-bold text-white truncate block mt-0.5">{senderName}</span>
                    <span className="text-[11px] text-gray-300 truncate block">&lt;{senderEmail}&gt;</span>
                  </div>

                  <div className="bg-white/10 p-3 rounded-xl backdrop-blur-sm border border-white/10">
                    <span className="block text-[10px] font-extrabold uppercase text-primary-200">Target Audience</span>
                    <span className="font-bold text-white truncate block mt-0.5">{audienceTitle}</span>
                    <span className="text-[11px] text-emerald-300 font-bold block">{contactCount} Contacts</span>
                  </div>

                  <div className="bg-white/10 p-3 rounded-xl backdrop-blur-sm border border-white/10">
                    <span className="block text-[10px] font-extrabold uppercase text-primary-200">Design Template</span>
                    <span className="font-bold text-white truncate block mt-0.5">{templateName}</span>
                    <span className="text-[11px] text-gray-300 truncate block">{formData.html_content ? `${formData.html_content.length} chars` : 'Empty HTML'}</span>
                  </div>

                  <div className="bg-white/10 p-3 rounded-xl backdrop-blur-sm border border-white/10">
                    <span className="block text-[10px] font-extrabold uppercase text-primary-200">A/B Testing</span>
                    <span className="font-bold text-white truncate block mt-0.5">{formData.is_ab_test ? 'Active (50/50 Split)' : 'Disabled'}</span>
                    <span className="text-[11px] text-gray-300 truncate block">{formData.is_ab_test ? '2 Subject Variants' : '1 Subject Line'}</span>
                  </div>
                </div>
              </div>

              {/* 4 Detail Grid Cards (Step 8 UI) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* 1. Setup & Subject Lines Card */}
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-3.5 hover:border-primary-300 transition-all">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                    <h4 className="text-xs font-black uppercase tracking-wider text-gray-900 flex items-center gap-2">
                      <FileText size={15} className="text-primary-600" /> Campaign & Subject Lines
                    </h4>
                    <button type="button" onClick={() => setStep(1)} className="text-[11px] font-bold text-primary-600 hover:text-primary-800">
                      Edit Step 1
                    </button>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div>
                      <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Internal Campaign Name</span>
                      <p className="font-bold text-gray-900 text-sm mt-0.5">{formData.name || '—'}</p>
                    </div>

                    <div>
                      <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Primary Subject Line (Variant A)</span>
                      <p className="font-semibold text-gray-800 bg-gray-50 p-2 rounded-lg border border-gray-200 mt-0.5">{formData.subject || '—'}</p>
                    </div>

                    {formData.is_ab_test && (
                      <div>
                        <span className="text-[10px] font-extrabold text-purple-600 uppercase tracking-wider">Test Subject Line (Variant B)</span>
                        <p className="font-semibold text-purple-900 bg-purple-50 p-2 rounded-lg border border-purple-200 mt-0.5">{formData.variant_b_subject || '—'}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Sender Profile & SMTP Card */}
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-3.5 hover:border-primary-300 transition-all">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                    <h4 className="text-xs font-black uppercase tracking-wider text-gray-900 flex items-center gap-2">
                      <Mail size={15} className="text-blue-600" /> Sender Profile & SMTP Configuration
                    </h4>
                    <button type="button" onClick={() => setStep(2)} className="text-[11px] font-bold text-primary-600 hover:text-primary-800">
                      Edit Step 2
                    </button>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div>
                      <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Sender Profile</span>
                      <p className="font-bold text-gray-900 text-sm mt-0.5">{senderName} &lt;{senderEmail}&gt;</p>
                    </div>

                    <div>
                      <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Active SMTP Email Account</span>
                      <p className="font-semibold text-blue-700 bg-blue-50 p-2 rounded-lg border border-blue-200 mt-0.5">{smtpUser}</p>
                    </div>

                    <div>
                      <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">SMTP Server & Encryption</span>
                      <p className="font-medium text-gray-700 mt-0.5">
                        <strong className="text-gray-900">{smtpHost}:{smtpPort}</strong> ({smtpSecure.toUpperCase()}) — {isCustomSmtp ? 'Custom Sender SMTP' : 'System Default SMTP'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3. Target Audience Card */}
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-3.5 hover:border-primary-300 transition-all">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                    <h4 className="text-xs font-black uppercase tracking-wider text-gray-900 flex items-center gap-2">
                      <Users size={15} className="text-emerald-600" /> Target Audience & Recipients
                    </h4>
                    <button type="button" onClick={() => setStep(3)} className="text-[11px] font-bold text-primary-600 hover:text-primary-800">
                      Edit Step 3
                    </button>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Audience Type</span>
                        <p className="font-bold text-gray-900 text-sm mt-0.5">{audienceTypeTag}</p>
                      </div>
                      <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-black">
                        {contactCount} Total Contacts
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Recipient Details</span>
                      <p className="font-medium text-gray-800 bg-gray-50 p-2.5 rounded-lg border border-gray-200 mt-0.5 break-words">
                        {audienceTitle} — <span className="text-gray-600 font-normal">{audienceDetail}</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* 4. Template & Content Card */}
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-3.5 hover:border-primary-300 transition-all">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                    <h4 className="text-xs font-black uppercase tracking-wider text-gray-900 flex items-center gap-2">
                      <FileText size={15} className="text-purple-600" /> Template & Email Content
                    </h4>
                    <button type="button" onClick={() => setStep(5)} className="text-[11px] font-bold text-primary-600 hover:text-primary-800">
                      Edit Step 5
                    </button>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div>
                      <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Selected Template</span>
                      <p className="font-bold text-gray-900 text-sm mt-0.5">{templateName}</p>
                    </div>

                    <div>
                      <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Design Mode</span>
                      <p className="font-medium text-gray-800 mt-0.5">{designMode}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Merged Live Email Preview (Template + Footer) */}
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                      <Monitor size={18} className="text-primary-600" /> Live Email & Footer Preview
                    </h3>
                    <p className="text-xs text-gray-500">Live rendered preview of email template with custom footer included.</p>
                  </div>

                  <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200 shrink-0">
                    <button
                      type="button"
                      onClick={() => setPreviewMode('desktop')}
                      className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${previewMode === 'desktop' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
                    >
                      🖥️ Desktop
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewMode('mobile')}
                      className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${previewMode === 'mobile' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
                    >
                      📱 Mobile
                    </button>
                  </div>
                </div>

                <div className="flex justify-center bg-gray-50/70 border border-dashed border-gray-200 rounded-2xl p-6 min-h-[550px]">
                  {previewMode === 'desktop' ? (
                    <iframe 
                      title="Campaign Desktop Live Preview"
                      srcDoc={mergedPreviewHtml} 
                      className="w-full min-h-[550px] border border-gray-200 rounded-xl bg-white shadow-sm"
                    />
                  ) : (
                    <div className="w-[360px] border-8 border-gray-800 rounded-[32px] overflow-hidden bg-white shadow-2xl relative flex flex-col" style={{ height: '550px' }}>
                      <div className="h-6 bg-gray-800 flex justify-center items-center shrink-0">
                        <div className="w-16 h-3 bg-black rounded-full" />
                      </div>
                      <iframe 
                        title="Campaign Mobile Live Preview"
                        srcDoc={mergedPreviewHtml} 
                        className="flex-1 w-full border-0"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {step === 7 && (
          <div className="space-y-6 max-w-3xl mx-auto animate-in fade-in zoom-in-95 duration-300">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Dispatch & Scheduling Options</h2>
              <p className="text-xs text-gray-500 mt-0.5">Select how and when you want to send this email campaign before final review.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 1. Send to Review (Card 1 - Default) */}
              <div 
                onClick={() => {
                  setFormData(prev => ({ ...prev, scheduled_at: '', dispatch_option: 'review' }));
                }}
                className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                  (formData.dispatch_option === 'review' || !formData.dispatch_option) 
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
                  <span>{(formData.dispatch_option === 'review' || !formData.dispatch_option) ? '✓ Active' : ''}</span>
                </div>
              </div>

              {/* 2. Direct Send (Card 2) */}
              <div 
                onClick={() => {
                  setFormData(prev => ({ ...prev, scheduled_at: '', dispatch_option: 'direct_send' }));
                }}
                className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                  formData.dispatch_option === 'direct_send'
                    ? 'border-green-500 bg-green-50/50 ring-2 ring-green-200 shadow-md' 
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-green-100 text-green-600 flex items-center justify-center mb-3">
                    <Send size={20} />
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm">Direct Send</h3>
                  <p className="text-xs text-gray-500 mt-1">Send emails immediately upon completing final dispatch in Step 7.</p>
                </div>
                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-green-700">
                  <span>Immediate Send</span>
                  <span>{formData.dispatch_option === 'direct_send' ? '✓ Active' : ''}</span>
                </div>
              </div>

              {/* 3. Schedule Campaign (Card 3) */}
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
        
        {step < 7 ? (
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
            className={`flex items-center px-6 py-2.5 text-sm font-bold text-white rounded-xl transition-all shadow-md disabled:opacity-50 ${
              formData.dispatch_option === 'review' || !formData.dispatch_option
                ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/30'
                : (formData.dispatch_option === 'schedule' || formData.scheduled_at)
                ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/30'
                : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
            }`}
          >
            {loading ? (
              'Processing...'
            ) : formData.dispatch_option === 'review' || !formData.dispatch_option ? (
              <> Send to Review <Check size={16} className="ml-2" /> </>
            ) : (formData.dispatch_option === 'schedule' || formData.scheduled_at) ? (
              <> Schedule Campaign <Calendar size={16} className="ml-2" /> </>
            ) : (
              <> Dispatch Campaign <Send size={16} className="ml-2" /> </>
            )}
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
      {/* Add SMTP Configuration Modal in Wizard */}
      {showAddSmtpModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-2 border-b">
              <h3 className="text-lg font-bold text-gray-900">Add SMTP Configuration</h3>
              <button onClick={() => setShowAddSmtpModal(false)} className="text-gray-400 hover:bg-gray-100 p-1.5 rounded-lg">
                <X size={18} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Sender Name *</label>
                  <input type="text" value={smtpForm.name} onChange={e => setSmtpForm({...smtpForm, name: e.target.value})} className="w-full px-3.5 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm" placeholder="e.g. Sales Department" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Sender Email *</label>
                  <input type="email" value={smtpForm.email} onChange={e => setSmtpForm({...smtpForm, email: e.target.value})} className="w-full px-3.5 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm" placeholder="info@company.com" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">SMTP Host</label>
                <input type="text" value={smtpForm.smtp_host} onChange={e => setSmtpForm({...smtpForm, smtp_host: e.target.value})} className="w-full px-3.5 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm" placeholder="smtp.gmail.com" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">SMTP Port</label>
                  <input type="text" value={smtpForm.smtp_port} onChange={e => setSmtpForm({...smtpForm, smtp_port: e.target.value})} className="w-full px-3.5 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm" placeholder="587" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">SMTP Security</label>
                  <select value={smtpForm.smtp_secure} onChange={e => setSmtpForm({...smtpForm, smtp_secure: e.target.value})} className="w-full px-3.5 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-blue-50/20 text-sm">
                    <option value="tls">TLS (Standard)</option>
                    <option value="ssl">SSL</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">SMTP User</label>
                  <input type="text" value={smtpForm.smtp_user} onChange={e => setSmtpForm({...smtpForm, smtp_user: e.target.value})} className="w-full px-3.5 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm" placeholder="user@gmail.com" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">SMTP Password</label>
                  <div className="relative">
                    <input 
                      type={showSmtpPassword ? 'text' : 'password'} 
                      value={smtpForm.smtp_pass} 
                      onChange={e => setSmtpForm({...smtpForm, smtp_pass: e.target.value})} 
                      className="w-full px-3.5 py-2 pr-9 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm" 
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowSmtpPassword(!showSmtpPassword)} 
                      className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                    >
                      {showSmtpPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center border-t pt-4">
              <button 
                type="button"
                onClick={() => handleOpenTestSmtpInWizard(smtpForm)}
                className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition border border-blue-200 flex items-center gap-1.5 shadow-sm"
              >
                <Send size={13} />
                <span>Test Connection</span>
              </button>
              <div className="flex gap-2">
                <button onClick={() => setShowAddSmtpModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl text-xs font-semibold border transition">Cancel</button>
                <button onClick={handleSaveSmtpInWizard} className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition shadow-sm">Save SMTP Config</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Test SMTP Connection Modal in Wizard */}
      {showTestSmtpModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-2 border-b">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <Mail size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Test SMTP Connection</h3>
                  <p className="text-xs text-gray-500">Verify SMTP settings & dispatch test email</p>
                </div>
              </div>
              <button onClick={() => setShowTestSmtpModal(false)} className="text-gray-400 hover:bg-gray-100 p-1.5 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                <p><span className="text-gray-500">Sender Profile:</span> <strong className="text-gray-800">{testSmtpSender?.name || 'New Sender'}</strong> &lt;{testSmtpSender?.email || 'N/A'}&gt;</p>
                <p><span className="text-gray-500">SMTP Host & Port:</span> <strong className="text-gray-800">{testSmtpSender?.smtp_host || 'smtp.gmail.com'}:{testSmtpSender?.smtp_port || 465}</strong></p>
                <p><span className="text-gray-500">SMTP User:</span> <strong className="text-gray-800">{testSmtpSender?.smtp_user || testSmtpSender?.email || '—'}</strong></p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Test Recipient Email Address *</label>
                <input 
                  type="email" 
                  value={testEmailInput} 
                  onChange={e => setTestEmailInput(e.target.value)} 
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  placeholder="vimal@bexcodeservices.com"
                />
                <p className="text-[11px] text-gray-400 mt-1">A verification email will be dispatched to this address using the configured SMTP server.</p>
              </div>

              {testSmtpResult && (
                <div className={`p-4 rounded-xl border text-xs font-medium space-y-1 ${
                  testSmtpResult.success 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}>
                  <div className="flex items-center gap-1.5 font-bold text-sm">
                    {testSmtpResult.success ? '✅ Test Email Dispatched!' : '❌ SMTP Connection Failed'}
                  </div>
                  <p>{testSmtpResult.message}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t pt-4">
              <button 
                onClick={() => setShowTestSmtpModal(false)} 
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl text-xs font-semibold border transition"
              >
                Close
              </button>
              <button 
                onClick={handleRunSmtpTestInWizard} 
                disabled={testSmtpLoading}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-2 disabled:opacity-50"
              >
                {testSmtpLoading ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                {testSmtpLoading ? 'Testing SMTP...' : 'Send Test Email'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
