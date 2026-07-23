import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Download, RotateCcw, Edit3, Eye, X, CheckCircle } from 'lucide-react';
import { useModal } from '../context/ModalContext';

const HistoryLogs = () => {
  const { confirm, alert: customAlert } = useModal();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modals state
  const [viewModal, setViewModal] = useState({ isOpen: false, data: null, title: '' });
  const [editModal, setEditModal] = useState({ isOpen: false, log: null, editedJson: '' });

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5000/api/history', {
        headers: { 'x-user-role': 'Super Admin' }
      });
      setLogs(response.data);
    } catch (error) {
      console.error('Failed to fetch history logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickRestore = async (id) => {
    const isOk = await confirm({
      title: 'Restore Record',
      message: 'Are you sure you want to quickly restore this deleted record as it was?',
      confirmText: 'Restore Record',
      type: 'warning'
    });
    if (!isOk) return;
    try {
      await axios.post(`http://localhost:5000/api/history/${id}/restore`, {}, {
        headers: { 'x-user-role': 'Super Admin' }
      });
      customAlert({ title: 'Success', message: 'Record restored successfully', type: 'success' });
      fetchLogs(); // refresh
    } catch (error) {
      console.error('Failed to restore record:', error);
      customAlert({ title: 'Error', message: error.response?.data?.error || 'Failed to restore record', type: 'danger' });
    }
  };

  const openViewModal = (log) => {
    const dataToView = log.action === 'delete' ? log.old_data : log.new_data;
    setViewModal({
      isOpen: true,
      title: `${log.action === 'delete' ? 'Deleted' : 'Modified'} Record Data (${log.table_name})`,
      data: dataToView
    });
  };

  const openEditModal = (log) => {
    setEditModal({
      isOpen: true,
      log: log,
      editedJson: JSON.stringify(log.old_data, null, 2)
    });
  };

  const handleEditRestoreSubmit = async () => {
    try {
      // Parse to validate JSON
      const editedData = JSON.parse(editModal.editedJson);
      
      await axios.post(`http://localhost:5000/api/history/${editModal.log.id}/restore-edited`, { editedData }, {
        headers: { 'x-user-role': 'Super Admin' }
      });
      alert('Record edited and restored successfully');
      setEditModal({ isOpen: false, log: null, editedJson: '' });
      fetchLogs();
    } catch (error) {
      if (error instanceof SyntaxError) {
        alert('Invalid JSON format. Please fix the JSON syntax before submitting.');
      } else {
        alert(error.response?.data?.error || 'Failed to restore edited record');
      }
    }
  };

  const handleDownload = () => {
    window.open('http://localhost:5000/api/history/download', '_blank');
  };

  if (loading) {
    return <div className="p-8 flex justify-center text-gray-500">Loading history logs...</div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Advanced History & Audit Logs</h1>
          <p className="text-gray-500 mt-1">Track, view, edit, and recover deleted data across all modules.</p>
        </div>
        <button
          onClick={handleDownload}
          className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
        >
          <Download size={16} className="mr-2" />
          Export CSV
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-semibold text-gray-900">Timestamp</th>
                <th className="px-6 py-4 font-semibold text-gray-900">Action</th>
                <th className="px-6 py-4 font-semibold text-gray-900">Module Table</th>
                <th className="px-6 py-4 font-semibold text-gray-900">Record ID</th>
                <th className="px-6 py-4 font-semibold text-gray-900">Changed By</th>
                <th className="px-6 py-4 font-semibold text-gray-900 text-right">Options</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    No history logs found
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                        ${log.action === 'add' ? 'bg-green-100 text-green-800' :
                          log.action === 'delete' ? 'bg-red-100 text-red-800' :
                          log.action === 'restore' ? 'bg-purple-100 text-purple-800' :
                          'bg-blue-100 text-blue-800'}`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900 capitalize">
                      {log.table_name}
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      #{log.record_id}
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {log.changed_by || 'System'}
                    </td>
                    <td className="px-6 py-4 text-right space-x-3 whitespace-nowrap">
                      <button
                        onClick={() => openViewModal(log)}
                        className="inline-flex items-center text-gray-600 hover:text-gray-900 font-medium transition-colors"
                        title="View raw data"
                      >
                        <Eye size={16} className="mr-1" /> View
                      </button>

                      {log.action === 'delete' && (
                        <>
                          <button
                            onClick={() => openEditModal(log)}
                            className="inline-flex items-center text-primary-600 hover:text-primary-700 font-medium transition-colors"
                            title="Edit data before restoring"
                          >
                            <Edit3 size={16} className="mr-1" /> Edit & Restore
                          </button>
                          
                          <button
                            onClick={() => handleQuickRestore(log.id)}
                            className="inline-flex items-center text-green-600 hover:text-green-700 font-medium transition-colors"
                            title="Restore exactly as it was"
                          >
                            <RotateCcw size={16} className="mr-1" /> Quick Restore
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Data Modal */}
      {viewModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">{viewModal.title}</h3>
              <button onClick={() => setViewModal({ isOpen: false, data: null, title: '' })} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 bg-gray-50">
              <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono">
                {JSON.stringify(viewModal.data, null, 2)}
              </pre>
            </div>
            <div className="p-4 border-t bg-gray-50 text-right">
              <button
                onClick={() => setViewModal({ isOpen: false, data: null, title: '' })}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit & Restore Modal */}
      {editModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Edit & Restore Record</h3>
                <p className="text-sm text-gray-500 mt-1">Modify the JSON data below before restoring it to the {editModal.log?.table_name} table.</p>
              </div>
              <button onClick={() => setEditModal({ isOpen: false, log: null, editedJson: '' })} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 bg-gray-50 flex flex-col">
              <label className="block text-sm font-medium text-gray-700 mb-2">JSON Data</label>
              <textarea
                value={editModal.editedJson}
                onChange={(e) => setEditModal({ ...editModal, editedJson: e.target.value })}
                className="w-full flex-1 min-h-[300px] p-4 font-mono text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none resize-none"
                spellCheck={false}
              />
            </div>
            <div className="p-6 border-t bg-white flex justify-between items-center">
              <span className="text-sm text-gray-500 flex items-center">
                <AlertTriangle size={16} className="text-amber-500 mr-2" /> Ensure JSON syntax is valid before saving
              </span>
              <div className="flex space-x-3">
                <button
                  onClick={() => setEditModal({ isOpen: false, log: null, editedJson: '' })}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditRestoreSubmit}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium flex items-center transition-colors shadow-sm"
                >
                  <CheckCircle size={16} className="mr-2" /> Restore Edited Data
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryLogs;
