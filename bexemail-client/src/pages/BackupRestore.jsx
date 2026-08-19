import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Database, UploadCloud, RefreshCw, CheckCircle2, AlertTriangle, Play, FileCheck, Trash, ShieldCheck, HelpCircle } from 'lucide-react';
import { useModal } from '../context/ModalContext';

const DEFAULT_TABLES = [
  { id: 'subscribers', name: 'Subscribers Directory' },
  { id: 'lists', name: 'Target Lists & Associations' },
  { id: 'campaigns', name: 'Email Campaigns' },
  { id: 'templates', name: 'Email Templates' },
  { id: 'senders', name: 'SMTP Senders List' },
  { id: 'settings', name: 'System Settings' },
  { id: 'admin_users', name: 'User Profiles & Permissions' }
];

export default function BackupRestore() {
  const { confirm, alert: customAlert } = useModal();
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(false);

  // New Backup State
  const [description, setDescription] = useState('');
  const [selectedTablesToBackup, setSelectedTablesToBackup] = useState(DEFAULT_TABLES.map(t => t.id));
  const [creating, setCreating] = useState(false);

  // Reversion State
  const [revertBackupItem, setRevertBackupItem] = useState(null);
  const [tablesToRestore, setTablesToRestore] = useState([]);
  const [reverting, setReverting] = useState(false);

  useEffect(() => {
    fetchBackups();
  }, []);

  const getAuthHeaders = () => {
    let user = {};
    try { user = JSON.parse(localStorage.getItem('user') || '{}'); } catch (e) {}
    const token = localStorage.getItem('token');
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (user && user.id) {
      headers['x-user-id'] = String(user.id);
      headers['x-user-role'] = user.role || 'Admin';
      if (user.admin_id) headers['x-admin-id'] = String(user.admin_id);
    }
    return headers;
  };

  const fetchBackups = async () => {
    try {
      setLoading(true);
      const headers = getAuthHeaders();
      const res = await axios.get('/api/backup/list', { headers });
      setBackups(res.data || []);
    } catch (err) {
      console.error(err);
      customAlert({ title: 'Error', message: 'Failed to load backup history list.', type: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async (e) => {
    e.preventDefault();
    if (!description.trim()) {
      customAlert({ title: 'Validation Error', message: 'Please enter a description for the backup.', type: 'warning' });
      return;
    }
    if (selectedTablesToBackup.length === 0) {
      customAlert({ title: 'Validation Error', message: 'Please select at least one table to backup.', type: 'warning' });
      return;
    }

    try {
      setCreating(true);
      const headers = getAuthHeaders();
      await axios.post('/api/backup/create', {
        description: description.trim(),
        tables: selectedTablesToBackup
      }, { headers });
      setDescription('');
      customAlert({ title: 'Success', message: 'Database backup created and registered successfully!', type: 'success' });
      fetchBackups();
    } catch (err) {
      console.error(err);
      customAlert({ title: 'Error', message: err.response?.data?.error || 'Failed to create backup.', type: 'danger' });
    } finally {
      setCreating(false);
    }
  };

  const startRevert = (backup) => {
    setRevertBackupItem(backup);
    // Auto-select all tables that are included in this backup
    const included = (backup.tables_included || '').split(',').filter(Boolean);
    setTablesToRestore(included);
  };

  const handleRevertBackup = async () => {
    if (tablesToRestore.length === 0) {
      customAlert({ title: 'Validation Error', message: 'Please select at least one table to restore.', type: 'warning' });
      return;
    }

    // Confirmation dialog
    const isOk = await confirm({
      title: 'CRITICAL: Revert Database Backup?',
      message: `Warning: This action will overwrite existing database records for the selected tables (${tablesToRestore.join(', ')}). Are you absolutely sure you want to proceed?`,
      confirmText: 'Yes, Revert Now',
      type: 'danger'
    });

    if (!isOk) return;

    try {
      setReverting(true);
      await axios.post(`http://localhost:5000/api/backup/${revertBackupItem.id}/restore`, {
        tablesToRestore
      });
      setRevertBackupItem(null);
      customAlert({
        title: 'Restoration Complete',
        message: 'The selected database tables have been successfully reverted to the backup state!',
        type: 'success'
      });
      fetchBackups();
    } catch (err) {
      console.error(err);
      customAlert({ title: 'Error', message: err.response?.data?.error || 'Failed to restore backup.', type: 'danger' });
    } finally {
      setReverting(false);
    }
  };

  const toggleBackupTableSelection = (tableId) => {
    setSelectedTablesToBackup(prev =>
      prev.includes(tableId) ? prev.filter(id => id !== tableId) : [...prev, tableId]
    );
  };

  const toggleRestoreTableSelection = (tableId) => {
    setTablesToRestore(prev =>
      prev.includes(tableId) ? prev.filter(id => id !== tableId) : [...prev, tableId]
    );
  };

  const triggerDownloadSql = () => {
    window.open('http://localhost:5000/api/backup/download', '_blank');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            <Database className="text-primary-600" size={24} /> DB Backup & Restoration Center
          </h2>
          <p className="text-gray-500 mt-1 text-sm">
            Maintain database health by taking selective snapshots and reverting individual tables to past states securely.
          </p>
        </div>
        <button
          onClick={triggerDownloadSql}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl border border-blue-200 transition"
        >
          <UploadCloud size={16} /> Download Full SQL Dump
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Panel: Create Backup Form */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5 self-start">
          <h3 className="text-md font-bold text-gray-900 flex items-center gap-1.5 border-b border-gray-100 pb-3">
            <UploadCloud size={18} className="text-primary-500" /> Create Database Backup
          </h3>

          <form onSubmit={handleCreateBackup} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Backup Description / Notes</label>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="e.g. Before importing subscriber list"
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-2">Select Tables to Include</label>
              <div className="space-y-1.5 border border-gray-200 rounded-xl p-3 bg-gray-50/30">
                {DEFAULT_TABLES.map(t => (
                  <label key={t.id} className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer p-1 hover:bg-white rounded">
                    <input
                      type="checkbox"
                      checked={selectedTablesToBackup.includes(t.id)}
                      onChange={() => toggleBackupTableSelection(t.id)}
                      className="rounded text-primary-600 focus:ring-primary-500 w-4 h-4"
                    />
                    <span>{t.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={creating || !description.trim() || selectedTablesToBackup.length === 0}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-2.5 rounded-xl transition disabled:opacity-50 text-xs mt-4"
            >
              {creating ? 'Creating Snapshot...' : 'Create Backup Snapshot'}
            </button>
          </form>
        </div>

        {/* Right Panel: Backup History Table */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[480px]">
          <div className="p-4 border-b border-gray-100 bg-gray-50/40 flex justify-between items-center">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Database size={16} className="text-gray-400" /> Backup Snapshots History
            </h3>
            <button
              onClick={fetchBackups}
              className="p-1.5 hover:bg-gray-150 rounded-lg text-gray-500 transition"
              title="Refresh"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="overflow-y-auto flex-1">
            <table className="w-full text-left text-xs text-gray-600">
              <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-200 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Timestamp / Date</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Included Tables</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading && backups.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-4 py-12 text-center text-gray-400">Loading backup history...</td>
                  </tr>
                ) : backups.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-4 py-12 text-center text-gray-400 font-semibold">No backup snapshots registered yet.</td>
                  </tr>
                ) : (
                  backups.map(b => (
                    <tr key={b.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-semibold text-gray-950">
                        {new Date(b.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-700">{b.description}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(b.tables_included || '').split(',').map(tbl => (
                            <span key={tbl} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-bold">
                              {tbl}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => startRevert(b)}
                          className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-lg border border-red-200 transition text-[11px] flex items-center gap-1.5 ml-auto"
                        >
                          <Play size={10} /> Revert / Restore
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

      {/* Reversion Setup Modal */}
      {revertBackupItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-gray-200 p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-2 text-red-600 border-b border-gray-100 pb-3">
              <AlertTriangle size={24} />
              <h3 className="text-lg font-bold text-gray-900">Revert Database Snapshot</h3>
            </div>

            <div className="space-y-3">
              <div className="bg-red-50/50 border border-red-100 rounded-xl p-3 text-xs text-red-700 leading-relaxed font-semibold">
                WARNING: You are about to revert database tables to a past state ({new Date(revertBackupItem.created_at).toLocaleString()}). Selected tables will be completely overwritten!
              </div>

              <div>
                <span className="block text-xs font-bold text-gray-600 mb-1">Backup description:</span>
                <span className="text-xs text-gray-900 font-bold bg-gray-50 px-2.5 py-1.5 rounded-lg border border-gray-200 block">
                  {revertBackupItem.description}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">
                  Select Tables to Revert / Restore (Task 8)
                </label>
                <div className="space-y-1.5 max-h-40 overflow-y-auto border border-gray-200 rounded-xl p-3 bg-gray-50/30">
                  {(revertBackupItem.tables_included || '').split(',').map(tableId => {
                    const tableObj = DEFAULT_TABLES.find(t => t.id === tableId);
                    const displayName = tableObj ? tableObj.name : tableId;
                    return (
                      <label key={tableId} className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer p-1 hover:bg-white rounded">
                        <input
                          type="checkbox"
                          checked={tablesToRestore.includes(tableId)}
                          onChange={() => toggleRestoreTableSelection(tableId)}
                          className="rounded text-red-600 focus:ring-red-500 w-4 h-4"
                        />
                        <span>{displayName}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="pt-3 flex gap-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setRevertBackupItem(null)}
                className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={reverting || tablesToRestore.length === 0}
                onClick={handleRevertBackup}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow transition"
              >
                {reverting ? 'Reverting...' : 'Revert Selected'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
