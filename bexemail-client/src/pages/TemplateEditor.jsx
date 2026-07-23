import React, { useState, useEffect, useRef } from 'react';
import EmailEditor from 'react-email-editor';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ArrowLeft } from 'lucide-react';

const TemplateEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);
  const emailEditorRef = useRef(null);

  const [formData, setFormData] = useState({
    template_name: '',
    category: 'Newsletter',
    html_content: '',
    plain_text_content: '',
    design_json: null // For reloading the builder state
  });
  const [loading, setLoading] = useState(false);

  const [editorReady, setEditorReady] = useState(false);
  const [templateData, setTemplateData] = useState(null);

  const loadDataIntoEditor = (data) => {
    if (!emailEditorRef.current?.editor || !data) return;
    
    try {
      let designToLoad = null;
      if (data.design_json) {
        designToLoad = typeof data.design_json === 'string' 
          ? JSON.parse(data.design_json) 
          : data.design_json;
      } else if (data.html_content && data.html_content.trim() !== '') {
        // Fallback for templates created before design_json was stored: wrap html_content into an Unlayer HTML block
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

  const fetchTemplate = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/templates/${id}`);
      const tData = res.data;
      setFormData(tData);
      setTemplateData(tData);

      if (editorReady) {
        loadDataIntoEditor(tData);
      }
    } catch (error) {
      console.error('Error fetching template:', error);
      alert('Failed to load template');
    }
  };

  const onLoad = () => {
    setEditorReady(true);
    if (templateData) {
      loadDataIntoEditor(templateData);
    }
  };

  const handleSave = () => {
    if (!formData.template_name) return alert('Template name is required');
    
    if (!emailEditorRef.current?.editor) {
      return alert('Editor is not ready yet');
    }

    // Extract HTML and Design JSON from the editor
    emailEditorRef.current.editor.exportHtml(async (data) => {
      const { design, html } = data;
      
      setLoading(true);
      try {
        const payload = {
          ...formData,
          html_content: html,
          design_json: JSON.stringify(design)
        };

        if (isEditing) {
          await axios.put(`http://localhost:5000/api/templates/${id}`, payload);
        } else {
          await axios.post('http://localhost:5000/api/templates', payload);
        }
        navigate('/templates');
      } catch (error) {
        console.error('Error saving template:', error);
        alert(error.response?.data?.error || 'Failed to save template');
      } finally {
        setLoading(false);
      }
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <button 
            onClick={() => navigate('/templates')}
            className="p-2 mr-4 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-2xl font-bold text-gray-900">
            {isEditing ? 'Edit Template' : 'Create New Template'}
          </h2>
        </div>
        <button 
          onClick={handleSave}
          disabled={loading}
          className="flex items-center px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50"
        >
          <Save size={18} className="mr-2" />
          {loading ? 'Saving...' : 'Save Template'}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Template Name</label>
            <input 
              type="text" 
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              value={formData.template_name}
              onChange={(e) => setFormData({...formData, template_name: e.target.value})}
              placeholder="e.g., Summer Promo"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select 
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              value={formData.category}
              onChange={(e) => setFormData({...formData, category: e.target.value})}
            >
              <option value="Newsletter">Newsletter</option>
              <option value="Promotion">Promotion</option>
              <option value="Welcome">Welcome</option>
              <option value="Transactional">Transactional</option>
            </select>
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg overflow-hidden h-[700px]">
          <EmailEditor 
            ref={emailEditorRef} 
            onLoad={onLoad} 
            minHeight="700px"
          />
        </div>
      </div>
    </div>
  );
};

export default TemplateEditor;
