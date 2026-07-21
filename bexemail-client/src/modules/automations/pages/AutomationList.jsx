import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Plus, Play, Pause, Edit, Users, FileText, Settings, BarChart } from 'lucide-react';

export default function AutomationList() {
  const [automations, setAutomations] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = searchParams.get('status') || 'all';
  const filteredAutomations = statusFilter === 'all'
    ? automations
    : automations.filter((automation) => automation.status === statusFilter);

  const fetchAutomations = async () => {
    try {
      const { data } = await axios.get('/api/automations');
      setAutomations(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching automations", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAutomations();
  }, []);

  const handleAction = async (id, action) => {
    try {
      if (action === 'activate' || action === 'pause' || action === 'resume' || action === 'stop') {
        await axios.post(`/api/automations/${id}/${action}`);
        fetchAutomations();
      }
    } catch (error) {
      const errMsg = error.response?.data?.error || `Failed to ${action} automation.`;
      alert(errMsg);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active': return <span className="px-2.5 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium border border-green-200 capitalize flex items-center gap-1"><Play size={10} fill="currentColor"/> {status}</span>;
      case 'paused': return <span className="px-2.5 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium border border-yellow-200 capitalize flex items-center gap-1"><Pause size={10} fill="currentColor"/> {status}</span>;
      case 'draft': return <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium border border-gray-200 capitalize flex items-center gap-1"><Settings size={10}/> {status}</span>;
      default: return <span className="px-2.5 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium capitalize">{status}</span>;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto font-sans">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Automations</h1>
          <p className="text-gray-500 mt-1 text-sm">Manage your marketing workflows and journeys</p>
        </div>
        <button 
          onClick={() => navigate('/automations/builder')}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium shadow-sm hover:shadow-md"
        >
          <Plus size={18} />
          Create Automation
        </button>
      </div>

      <div className="mb-4 flex justify-end">
        <select
          value={statusFilter}
          onChange={(event) => {
            const value = event.target.value;
            setSearchParams(value === 'all' ? {} : { status: value });
          }}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700"
          aria-label="Filter automations by status"
        >
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="stopped">Stopped</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20 text-gray-400">Loading automations...</div>
      ) : filteredAutomations.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
           <div className="mx-auto w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-blue-500 mb-4">
             <Settings size={32} />
           </div>
           <h3 className="text-xl font-bold text-gray-900 mb-2">No {statusFilter === 'all' ? '' : `${statusFilter} `}automations found</h3>
           <p className="text-gray-500 mb-6 max-w-md mx-auto">Create a workflow or choose another database status filter.</p>
           <button onClick={() => navigate('/automations/builder')} className="bg-blue-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition shadow-sm hover:shadow-md">Create Automation</button>
        </div>
      ) : (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50/80">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Trigger</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Active</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Completed</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Updated</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredAutomations.map((auto) => (
              <tr key={auto.id} className="hover:bg-gray-50/50 transition-colors group">
                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{auto.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-600 text-sm">
                  {(auto.trigger_type || 'Custom').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(auto.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-600 text-sm font-medium">{auto.active_contacts || 0}</td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-sm">{auto.completed_contacts || 0}</td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-sm">
                  {new Date(auto.updated_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                  <div className="flex items-center justify-end gap-3 opacity-100">
                    <button onClick={() => navigate(`/automations/builder/${auto.id}`)} className="text-gray-400 hover:text-blue-600 tooltip" title="Edit Workflow">
                      <Edit size={18} />
                    </button>
                    <button onClick={() => navigate(`/automations/${auto.id}/contacts`)} className="text-gray-400 hover:text-indigo-600 tooltip" title="View Contacts">
                      <Users size={18} />
                    </button>
                    <button onClick={() => navigate(`/automations/${auto.id}/logs`)} className="text-gray-400 hover:text-gray-700 tooltip" title="View Logs">
                      <FileText size={18} />
                    </button>
                    <button onClick={() => navigate(`/automations/${auto.id}/analytics`)} className="text-gray-400 hover:text-blue-600 tooltip" title="Analytics">
                      <BarChart size={18} />
                    </button>
                    {auto.status === 'active' && (
                      <button onClick={() => handleAction(auto.id, 'pause')} className="text-gray-400 hover:text-yellow-600" title="Pause">
                        <Pause size={18} />
                      </button>
                    )}
                    {auto.status === 'paused' && (
                      <button onClick={() => handleAction(auto.id, 'resume')} className="text-gray-400 hover:text-green-600" title="Resume">
                        <Play size={18} />
                      </button>
                    )}
                    {(auto.status === 'draft' || auto.status === 'paused') && (
                      <button onClick={() => handleAction(auto.id, 'activate')} className="text-gray-400 hover:text-green-600" title="Activate">
                        <Play size={18} fill="currentColor"/>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}
