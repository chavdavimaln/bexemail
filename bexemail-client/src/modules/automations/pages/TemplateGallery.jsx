import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Award, Gift, Plus, ShoppingCart, Star, Users, Workflow, Zap } from 'lucide-react';

const iconMap = {
  users: Users,
  'shopping-cart': ShoppingCart,
  zap: Zap,
  star: Star,
  gift: Gift,
  award: Award,
  workflow: Workflow,
};

const colorMap = {
  blue: 'bg-blue-50 border-blue-100 text-blue-600',
  green: 'bg-green-50 border-green-100 text-green-600',
  purple: 'bg-purple-50 border-purple-100 text-purple-600',
  yellow: 'bg-yellow-50 border-yellow-100 text-yellow-600',
  pink: 'bg-pink-50 border-pink-100 text-pink-600',
  orange: 'bg-orange-50 border-orange-100 text-orange-600',
};

export default function TemplateGallery() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creatingId, setCreatingId] = useState(null);

  useEffect(() => {
    let active = true;
    axios.get('/api/automations/templates')
      .then(({ data }) => {
        if (active) setTemplates(Array.isArray(data) ? data : []);
      })
      .catch((requestError) => {
        console.error('Failed to load automation templates', requestError);
        if (active) setError('Automation templates could not be loaded from the database.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const handleUseTemplate = async (templateId) => {
    setCreatingId(templateId);
    setError('');
    try {
      const { data } = await axios.post(`/api/automations/templates/${templateId}/use`);
      navigate(`/automations/builder/${data.id}`);
    } catch (requestError) {
      console.error('Failed to create automation from template', requestError);
      setError(requestError.response?.data?.error || 'Failed to create automation from this template.');
    } finally {
      setCreatingId(null);
    }
  };

  const createBlank = async () => {
    setCreatingId('blank');
    setError('');
    try {
      const { data } = await axios.post('/api/automations', {
        name: 'New Custom Automation',
        trigger_type: 'custom',
        reentry_policy: { allowReentry: true, cooldownDays: 7 },
        workflow_graph: { nodes: [], edges: [] },
      });
      navigate(`/automations/builder/${data.id}`);
    } catch (requestError) {
      console.error('Failed to create automation', requestError);
      setError(requestError.response?.data?.error || 'Failed to create an automation.');
    } finally {
      setCreatingId(null);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto font-sans">
      <div className="mb-8">
        <button onClick={() => navigate('/automations')} className="text-gray-500 hover:text-gray-800 flex items-center gap-1 text-sm font-medium mb-4">
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-2">Automation Templates</h1>
        <p className="text-gray-500 max-w-3xl">Templates on this page are loaded from MySQL and create a persisted draft when selected.</p>
      </div>

      {error && <div role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="py-20 text-center text-gray-500">Loading templates from the database…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <button
            type="button"
            onClick={createBlank}
            disabled={creatingId !== null}
            className="border-2 border-dashed border-gray-300 hover:border-blue-400 rounded-xl p-8 flex flex-col items-center justify-center text-center transition bg-gray-50/50 hover:bg-blue-50/30 group disabled:opacity-60"
          >
            <div className="bg-white p-4 rounded-full shadow-sm mb-4 group-hover:scale-110 transition-transform">
              <Plus className="text-gray-400 group-hover:text-blue-500" size={32} />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Build from Scratch</h3>
            <p className="text-sm text-gray-500">{creatingId === 'blank' ? 'Creating database record…' : 'Create an empty database-backed workflow.'}</p>
          </button>

          {templates.map((template) => {
            const Icon = iconMap[template.icon_key] || Workflow;
            const colors = colorMap[template.color_key] || colorMap.blue;
            return (
              <article key={template.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition flex flex-col">
                <div className={`p-6 border-b ${colors} flex justify-between items-start`}>
                  <div className="bg-white p-3 rounded-lg shadow-sm"><Icon size={24} /></div>
                  {!!template.is_popular && (
                    <span className="bg-white px-3 py-1 rounded-full text-xs font-bold text-gray-700 shadow-sm border border-gray-100 flex items-center gap-1">
                      <Star size={12} className="text-yellow-500 fill-yellow-500" /> Popular
                    </span>
                  )}
                </div>
                <div className="p-6 flex-grow flex flex-col">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{template.category}</span>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{template.name}</h3>
                  <p className="text-sm text-gray-600 mb-6 flex-grow">{template.description}</p>
                  <button
                    type="button"
                    onClick={() => handleUseTemplate(template.id)}
                    disabled={creatingId !== null}
                    className="w-full bg-white border border-gray-300 text-gray-700 font-medium py-2 rounded-lg hover:bg-gray-50 hover:text-blue-600 hover:border-blue-200 transition disabled:opacity-60"
                  >
                    {creatingId === template.id ? 'Creating draft…' : 'Use Template'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
