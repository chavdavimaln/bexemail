import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Copy, Code, CheckCircle, Plus, Trash2, ArrowUp, ArrowDown, HelpCircle, GripVertical } from 'lucide-react';

export default function SubscriberForms() {
  const [lists, setLists] = useState([]);
  const [selectedList, setSelectedList] = useState('');
  const [redirectUrl, setRedirectUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [formType, setFormType] = useState('Signup form submitted');
  
  // Interactive Fields Builder state
  const [fields, setFields] = useState([
    { id: 'first_name', name: 'first_name', label: 'First Name', type: 'text', placeholder: 'John', required: false, isSystem: true },
    { id: 'email', name: 'email', label: 'Email Address', type: 'email', placeholder: 'john@example.com', required: true, isSystem: true }
  ]);

  // Drag and Drop state
  const [draggedIndex, setDraggedIndex] = useState(null);

  useEffect(() => {
    fetchLists();
  }, []);

  const fetchLists = async () => {
    try {
      // Use the verified lists endpoint instead of campaigns_wizard
      const res = await axios.get('/api/lists'); 
      const activeLists = res.data || [];
      setLists(activeLists);
      if (activeLists.length > 0) setSelectedList(activeLists[0].id.toString());
    } catch (err) {
      console.error('Failed to fetch lists:', err);
    }
  };

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const generateCode = () => {
    const fieldsHtml = fields.map(field => {
      return `  <div style="margin-bottom: 15px;">
    <label style="display: block; margin-bottom: 5px; font-weight: 500; font-family: sans-serif; font-size: 14px; color: #374151;">${field.label}${field.required ? ' *' : ''}</label>
    <input 
      type="${field.type}" 
      id="${field.id}" 
      name="${field.name}" 
      placeholder="${field.placeholder}" 
      ${field.required ? 'required' : ''} 
      style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; box-sizing: border-box; outline: none; transition: border-color 0.2s;"
      onfocus="this.style.borderColor='#3b82f6'"
      onblur="this.style.borderColor='#d1d5db'"
    />
  </div>`;
    }).join('\n\n');

    return `<form action="${API_URL}/api/forms/submit/${selectedList}" method="POST" style="max-w-md mx-auto p-6 bg-white border border-gray-200 rounded-2xl shadow-sm font-sans">
  <!-- Form Trigger Type -->
  <input type="hidden" name="form_type" value="${formType}" />
  
  <!-- Optional Redirect URL -->
  ${redirectUrl ? `<input type="hidden" name="redirectUrl" value="${redirectUrl}" />` : '<!-- <input type="hidden" name="redirectUrl" value="https://yourwebsite.com/thank-you" /> -->'}
  
${fieldsHtml}
  
  <button type="submit" style="width: 100%; background-color: #2563eb; color: white; padding: 12px; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; transition: background-color 0.2s;" onmouseover="this.style.backgroundColor='#1d4ed8'" onmouseout="this.style.backgroundColor='#2563eb'">
    Subscribe
  </button>
</form>`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Fields actions
  const addCustomField = () => {
    const customId = `custom_${Date.now()}`;
    setFields([
      ...fields,
      {
        id: customId,
        name: `custom_field_${fields.length}`,
        label: `Custom Field ${fields.length}`,
        type: 'text',
        placeholder: 'Enter value',
        required: false,
        isSystem: false
      }
    ]);
  };

  const deleteField = (id) => {
    // Email field is mandatory
    if (id === 'email') return;
    setFields(fields.filter(f => f.id !== id));
  };

  const updateFieldProperty = (id, prop, val) => {
    setFields(fields.map(f => {
      if (f.id === id) {
        // Prevent email from being set to optional
        if (id === 'email' && prop === 'required') return f;
        return { ...f, [prop]: val };
      }
      return f;
    }));
  };

  // Reordering fields
  const moveField = (index, direction) => {
    const newFields = [...fields];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newFields.length) return;
    
    // Swap
    const temp = newFields[index];
    newFields[index] = newFields[targetIndex];
    newFields[targetIndex] = temp;
    setFields(newFields);
  };

  // Drag and drop handlers
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newFields = [...fields];
    const draggedItem = newFields[draggedIndex];
    newFields.splice(draggedIndex, 1);
    newFields.splice(index, 0, draggedItem);
    
    setDraggedIndex(index);
    setFields(newFields);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto font-sans pb-16">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Lead Capture Forms</h1>
        <p className="text-gray-600">Generate, customize, and embed high-converting lead forms to capture contacts directly into your segments.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: Controls & Settings (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Section 1: Form Settings */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <h2 className="text-lg font-bold text-gray-950 mb-4 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 bg-blue-50 text-blue-600 rounded-full text-sm">1</span>
              Configuration Settings
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Target Audience List</label>
                <select 
                  value={selectedList} 
                  onChange={(e) => setSelectedList(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm bg-white"
                >
                  {lists.map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                  {lists.length === 0 && <option value="">No lists found</option>}
                </select>
                <p className="text-xs text-gray-500 mt-1">Which subscriber segment new signups join.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Automation Trigger</label>
                <select 
                  value={formType} 
                  onChange={(e) => setFormType(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm bg-white"
                >
                  <option value="Signup form submitted">Signup form submitted</option>
                  <option value="Contact form submitted">Contact form submitted</option>
                  <option value="Landing-page form submitted">Landing-page form submitted</option>
                  <option value="Survey submitted">Survey submitted</option>
                  <option value="Lead form submitted">Lead form submitted</option>
                  <option value="Event-registration form submitted">Event-registration form submitted</option>
                  <option value="Feedback form submitted">Feedback form submitted</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">Fires matching automation workflows immediately.</p>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Redirect URL (Optional)</label>
              <input 
                type="url" 
                value={redirectUrl} 
                onChange={(e) => setRedirectUrl(e.target.value)}
                placeholder="https://yourwebsite.com/thank-you"
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">The URL subscribers land on after successfully submitting the form.</p>
            </div>
          </div>

          {/* Section 2: Interactive Fields Builder */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-950 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 bg-blue-50 text-blue-600 rounded-full text-sm">2</span>
                Form Field Designer
              </h2>
              <button 
                onClick={addCustomField}
                className="flex items-center gap-1.5 text-xs font-bold bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition"
              >
                <Plus size={14} /> Add Field
              </button>
            </div>

            <p className="text-xs text-gray-500 mb-4">Drag and drop fields to reorder them, or use the arrows. Edit labels and placeholders inline.</p>

            <div className="space-y-3">
              {fields.map((field, idx) => (
                <div 
                  key={field.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragEnd={handleDragEnd}
                  className={`flex flex-col md:flex-row md:items-center gap-3 p-4 bg-gray-50 border rounded-xl transition ${
                    draggedIndex === idx ? 'opacity-40 border-blue-500 bg-blue-50/10' : 'border-gray-200 hover:bg-gray-100/50'
                  }`}
                >
                  {/* Drag Handle */}
                  <div className="cursor-move text-gray-400 flex items-center pr-1 hidden md:flex">
                    <GripVertical size={18} />
                  </div>

                  {/* Field Label Input */}
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">Label Text</label>
                    <input 
                      type="text" 
                      value={field.label}
                      onChange={(e) => updateFieldProperty(field.id, 'label', e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-gray-200 bg-white rounded-lg text-sm outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  {/* Placeholder Input */}
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">Placeholder</label>
                    <input 
                      type="text" 
                      value={field.placeholder}
                      onChange={(e) => updateFieldProperty(field.id, 'placeholder', e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-gray-200 bg-white rounded-lg text-sm outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  {/* HTML name Input (For backend processing) */}
                  <div className="w-28">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">Field ID/Name</label>
                    <input 
                      type="text" 
                      disabled={field.isSystem}
                      value={field.name}
                      onChange={(e) => updateFieldProperty(field.id, 'name', e.target.value.replace(/\s+/g, '_').toLowerCase())}
                      className="w-full px-2.5 py-1.5 border border-gray-200 bg-white rounded-lg text-sm outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
                    />
                  </div>

                  {/* Actions (Required checkbox, Reordering and Delete) */}
                  <div className="flex items-center gap-2 mt-2 md:mt-0 justify-end md:justify-start">
                    <div className="flex items-center gap-1 mr-2">
                      <input 
                        type="checkbox" 
                        id={`req-${field.id}`}
                        disabled={field.id === 'email'}
                        checked={field.required}
                        onChange={(e) => updateFieldProperty(field.id, 'required', e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor={`req-${field.id}`} className="text-xs text-gray-600 select-none cursor-pointer">Required</label>
                    </div>

                    <div className="flex items-center border border-gray-200 rounded-lg bg-white overflow-hidden">
                      <button 
                        disabled={idx === 0}
                        onClick={() => moveField(idx, -1)}
                        className="p-1.5 hover:bg-gray-100 text-gray-500 disabled:opacity-30 disabled:hover:bg-transparent"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button 
                        disabled={idx === fields.length - 1}
                        onClick={() => moveField(idx, 1)}
                        className="p-1.5 border-l border-gray-200 hover:bg-gray-100 text-gray-500 disabled:opacity-30 disabled:hover:bg-transparent"
                      >
                        <ArrowDown size={14} />
                      </button>
                    </div>

                    <button 
                      disabled={field.id === 'email'}
                      onClick={() => deleteField(field.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 disabled:opacity-30 hover:bg-red-50 rounded-lg transition"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Explanation Guide */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 p-6 rounded-2xl border border-blue-100">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2 text-base">
              <HelpCircle size={18} className="text-blue-600" />
              How to Embed & Use Lead Forms
            </h3>
            <div className="text-sm text-gray-700 space-y-3 leading-relaxed">
              <p>
                <strong>What is the purpose of this form?</strong><br />
                It generates a secure, clean HTML form that feeds new contacts directly into your chosen Target List. Adding a form allows you to grow your email lists organically from external landing pages, blogs, and sites.
              </p>
              <div className="border-t border-blue-200/40 my-3"></div>
              <ol className="list-decimal pl-4 space-y-2">
                <li>
                  Select the <strong>Target Audience List</strong> where captured contacts will be enrolled in your database.
                </li>
                <li>
                  Choose a matching <strong>Automation Trigger</strong>. This trigger is embedded inside the hidden input fields, allowing active automations listening for this form submission type to begin instantly.
                </li>
                <li>
                  Configure, rename, or add custom fields.
                </li>
                <li>
                  Copy the generated <strong>HTML Embed Code</strong> on the right.
                </li>
                <li>
                  Paste the code anywhere within the HTML body of your website. It uses inline CSS styles, meaning it will render beautifully immediately on any framework or plain CMS like WordPress.
                </li>
              </ol>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Output Embed Code (5 Cols) */}
        <div className="lg:col-span-5 bg-gray-950 rounded-2xl shadow-xl border border-gray-900 flex flex-col overflow-hidden self-stretch lg:h-[750px]">
          <div className="bg-gray-900 px-6 py-4 flex justify-between items-center border-b border-gray-800 flex-shrink-0">
            <div className="flex items-center gap-2 text-gray-200">
              <Code size={18} className="text-blue-400" />
              <span className="font-semibold text-sm">HTML Embed Code</span>
            </div>
            <button 
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-xs font-semibold bg-gray-800 hover:bg-gray-700 text-white px-3.5 py-2 rounded-lg transition"
            >
              {copied ? <CheckCircle size={14} className="text-green-400" /> : <Copy size={14} />}
              {copied ? 'Copied Code!' : 'Copy Code'}
            </button>
          </div>
          <div className="p-6 overflow-auto flex-1 text-[13px] text-gray-300 font-mono whitespace-pre-wrap leading-relaxed bg-[#0b0f19]">
            {generateCode()}
          </div>
        </div>

      </div>
    </div>
  );
}
