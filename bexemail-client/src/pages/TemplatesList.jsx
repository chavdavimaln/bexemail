import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { LayoutTemplate, Plus, Edit, Trash2 } from 'lucide-react';
import { useModal } from '../context/ModalContext';

const TemplatesList = () => {
  const { confirm, alert: customAlert } = useModal();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

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
            <div className="h-40 bg-gray-100 border-b border-gray-200 flex items-center justify-center text-gray-400">
              <LayoutTemplate size={48} />
            </div>
            <div className="p-5 flex flex-col flex-1">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-gray-900">{template.template_name}</h3>
                <span className="px-2 py-1 bg-gray-100 text-xs font-medium text-gray-600 rounded">
                  {template.category || 'General'}
                </span>
              </div>
              <div className="mt-auto pt-4 flex space-x-2 border-t border-gray-100">
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
    </div>
  );
};

export default TemplatesList;
