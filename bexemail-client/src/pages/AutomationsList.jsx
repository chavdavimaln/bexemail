import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Workflow, Plus, Power, PowerOff } from 'lucide-react';

const AutomationsList = () => {
  const [automations, setAutomations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAutomations();
  }, []);

  const fetchAutomations = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/automations');
      setAutomations(res.data);
    } catch (error) {
      console.error('Error fetching automations:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      await axios.put(`http://localhost:5000/api/automations/${id}/status`, { status: newStatus });
      fetchAutomations();
    } catch (error) {
      console.error('Error toggling status:', error);
    }
  };

  if (loading) return <div className="p-8">Loading automations...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Automations</h2>
          <p className="text-gray-500 mt-1">Set up trigger-based workflows and autoresponders.</p>
        </div>
        <Link 
          to="/automations/new"
          className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          <Plus size={18} className="mr-2" />
          Create Workflow
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-6 py-4 font-medium text-gray-600 text-sm">Workflow Name</th>
              <th className="px-6 py-4 font-medium text-gray-600 text-sm">Trigger</th>
              <th className="px-6 py-4 font-medium text-gray-600 text-sm">Status</th>
              <th className="px-6 py-4 font-medium text-gray-600 text-sm text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {automations.map(auto => (
              <tr key={auto.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <Workflow className="text-gray-400 mr-3" size={20} />
                    <span className="font-medium text-gray-900">{auto.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 capitalize">{auto.trigger_type}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                    ${auto.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {auto.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={() => toggleStatus(auto.id, auto.status)}
                    className="text-gray-400 hover:text-gray-900 transition-colors"
                    title={auto.status === 'active' ? 'Deactivate' : 'Activate'}
                  >
                    {auto.status === 'active' ? <PowerOff size={20} className="text-red-500"/> : <Power size={20} className="text-green-500"/>}
                  </button>
                </td>
              </tr>
            ))}
            {automations.length === 0 && (
              <tr>
                <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                  No automations found. Create your first workflow!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AutomationsList;
