import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Search, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

export default function AutomationLogs() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [automation, setAutomation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [autoRes, logsRes] = await Promise.all([
          axios.get(`/api/automations/${id}`),
          axios.get(`/api/automations/${id}/logs`)
        ]);
        setAutomation(autoRes.data);
        setLogs(logsRes.data);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  return (
    <div className="p-6 max-w-7xl mx-auto font-sans">
      <div className="mb-6">
        <button onClick={() => navigate('/automations/list')} className="text-gray-500 hover:text-gray-800 flex items-center gap-1 text-sm font-medium mb-4">
          <ArrowLeft size={16} /> Back to Automations
        </button>
        <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
          {automation ? automation.name : 'Loading...'}
          <span className="text-gray-400 font-normal">/ Logs</span>
        </h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input type="text" placeholder="Search logs..." className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
          </div>
          <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
        
        {loading ? (
          <div className="p-10 text-center text-gray-500">Loading logs...</div>
        ) : logs.length === 0 ? (
          <div className="p-10 text-center text-gray-500">No logs found for this automation.</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-white">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Time</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Contact</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Node ID</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Action Taken</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-mono text-sm">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-gray-900">{log.email}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                    {log.node_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-800">
                    {log.action_taken}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {log.status === 'success' || !log.status ? (
                      <span className="flex items-center gap-1 text-green-600 font-sans font-medium text-xs"><CheckCircle2 size={14}/> Success</span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-600 font-sans font-medium text-xs tooltip" title={log.error_message}><AlertCircle size={14}/> Error</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
