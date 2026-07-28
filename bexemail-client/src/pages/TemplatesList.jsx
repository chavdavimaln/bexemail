import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { LayoutTemplate, Plus, Edit, Trash2, Eye, X } from 'lucide-react';
import { useModal } from '../context/ModalContext';

const TemplatesList = () => {
  const { confirm, alert: customAlert } = useModal();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [previewDevice, setPreviewDevice] = useState('desktop');

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/templates');
      setTemplates(res.data);
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

  if (loading) return <div className="p-8">Loading templates...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Email Templates</h2>
          <p className="text-gray-500 mt-1">Manage reusable HTML designs for your campaigns.</p>
        </div>
        <Link 
          to="/templates/new"
          className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          <Plus size={18} className="mr-2" />
          Create Template
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map(template => (
          <div key={template.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
            <div className="h-40 bg-gray-50 border-b border-gray-200 flex items-center justify-center overflow-hidden relative">
              {template.html_content ? (
                <iframe 
                  srcDoc={template.html_content} 
                  title={template.template_name} 
                  style={{ transform: 'scale(0.25)', transformOrigin: 'top left', width: '400%', height: '400%' }}
                  className="pointer-events-none border-0 absolute top-0 left-0" 
                />
              ) : (
                <LayoutTemplate size={48} className="text-gray-400" />
              )}
            </div>
            <div className="p-5 flex flex-col flex-1">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-gray-900">{template.template_name}</h3>
                <span className="px-2 py-1 bg-gray-100 text-xs font-medium text-gray-600 rounded">
                  {template.category || 'General'}
                </span>
              </div>
              <div className="mt-auto pt-4 flex space-x-2 border-t border-gray-100">
                <button 
                  onClick={() => setSelectedTemplate(template)}
                  className="flex-1 flex justify-center items-center py-1.5 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                >
                  <Eye size={16} className="mr-1.5" /> Preview
                </button>
                <Link 
                  to={`/templates/${template.id}/edit`}
                  className="flex-1 flex justify-center items-center py-1.5 text-sm font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-md transition-colors"
                >
                  <Edit size={16} className="mr-1.5" /> Edit
                </Link>
                <button 
                  onClick={() => handleDelete(template.id)}
                  className="flex-1 flex justify-center items-center py-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
                >
                  <Trash2 size={16} className="mr-1.5" /> Delete
                </button>
              </div>
            </div>
          </div>
        ))}
        {templates.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
            No templates found. Click "Create Template" to get started.
          </div>
        )}
      </div>

      {/* PREVIEW TEMPLATE MODAL */}
      {selectedTemplate && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 max-w-4xl w-full h-[85vh] flex flex-col overflow-hidden animate-in fade-in-50">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 p-4 shrink-0 bg-gray-50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <Eye size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">{selectedTemplate.template_name}</h3>
                  <p className="text-xs text-gray-500">Live preview of your template design.</p>
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
                  <X size={18} />
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
                <div className="relative mx-auto border-4 border-gray-800 rounded-[36px] h-[600px] w-[320px] bg-gray-800 shadow-xl overflow-hidden">
                  {/* Smartphone top bar */}
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
            <div className="flex justify-end gap-2 p-4 border-t border-gray-100 bg-gray-50 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedTemplate(null)}
                className="px-4 py-2 border border-gray-200 text-gray-600 text-xs font-semibold rounded-xl hover:bg-gray-100 transition"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplatesList;
