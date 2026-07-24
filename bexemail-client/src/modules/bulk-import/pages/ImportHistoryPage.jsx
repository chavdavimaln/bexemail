import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { History, RotateCcw, AlertCircle, FileText, Globe, RefreshCw } from 'lucide-react';
import { useNotification } from '../../../components/NotificationContext';
import { useModal } from '../../../context/ModalContext';

export default function ImportHistoryPage() {
  const { success, error } = useNotification();
  const { confirm } = useModal();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rollbackLoadingId, setRollbackLoadingId] = useState(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await axios.get('http://localhost:5000/api/bulk-import/logs');
      setLogs(res.data || []);
    } catch (err) {
      console.error(err);
      error('Failed to load import logs.');
    } finally {
      setLoading(false);
    }
  };

  const handleRollback = async (id, filename, originSite) => {
    const isOk = await confirm({
      title: 'Rollback Import',
      message: `Are you sure you want to rollback the import of "${filename}" for site "${originSite}"? This will delete newly added subscribers and restore modified contacts to their previous states.`,
      confirmText: 'Rollback & Restore',
      type: 'warning'
    });

    if (!isOk) return;

    try {
      setRollbackLoadingId(id);
      await axios.post(`http://localhost:5000/api/bulk-import/logs/${id}/rollback`);
      success('Import rolled back and old state restored successfully!');
      fetchLogs(); // refresh list
    } catch (err) {
      console.error(err);
      error(err.response?.data?.error || 'Failed to rollback import.');
    } finally {
      setRollbackLoadingId(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Import History & Backups</h2>
          <p className="text-gray-500 mt-1 text-sm">
            View import logs and restore contacts to previous states if needed.
          </p>
        </div>
        <button 
          onClick={fetchLogs} 
          disabled={loading}
          className="p-2 border border-gray-200 hover:bg-gray-50 rounded-xl transition text-gray-600"
          title="Refresh logs"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 bg-white flex items-center gap-2">
          <History size={18} className="text-primary-600" />
          <h3 className="font-bold text-gray-950">Import Backups</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 border-collapse">
            <thead className="bg-gray-50/50 text-gray-500 font-semibold border-b border-gray-200">
              <tr>
                <th className="px-6 py-4">Filename / Source</th>
                <th className="px-6 py-4">Origin Site</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Import Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-400">
                    <div className="animate-pulse flex flex-col items-center">
                      <div className="h-8 w-8 bg-gray-200 rounded-full mb-3"></div>
                      <div className="h-4 w-32 bg-gray-200 rounded"></div>
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-400 font-medium">
                    No import backups found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 flex items-center gap-2.5">
                      <FileText size={18} className="text-gray-400" />
                      <span className="font-bold text-gray-900">{log.filename}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-600">
                        <Globe size={12} className="text-gray-400" />
                        {log.origin_site}
                      </span>
                    </td>
                    <td className="px-6 py-4 uppercase text-xs font-bold tracking-wider text-gray-400">
                      {log.import_type}
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleRollback(log.id, log.filename, log.origin_site)}
                        disabled={rollbackLoadingId === log.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-red-200 hover:border-red-600 bg-white hover:bg-red-50 text-red-600 hover:text-red-700 rounded-xl text-xs font-bold transition-all"
                      >
                        <RotateCcw size={14} className={rollbackLoadingId === log.id ? 'animate-spin' : ''} />
                        {rollbackLoadingId === log.id ? 'Restoring...' : 'Rollback'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
