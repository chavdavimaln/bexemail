import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Database, UploadCloud, RefreshCw, CheckCircle2, AlertTriangle, Play, 
  Trash2, ShieldCheck, Download, Calendar, Filter, Search, Clock, 
  Settings, Workflow, Megaphone, Users, History, FileText, Check, Plus, Bell,
  Upload, Lock, ExternalLink, Code
} from 'lucide-react';
import { useModal } from '../context/ModalContext';
import { Link } from 'react-router-dom';

const MODULE_OPTIONS = [
  { id: 'all', name: 'All System Backup', icon: <Database className="text-primary-600" size={20} />, color: 'bg-primary-50 text-primary-700 border-primary-200', desc: 'Full snapshot for ALL components, database tables, programming & UI configs.' },
  { id: 'database', name: 'Database Backup', icon: <Database className="text-blue-600" size={20} />, color: 'bg-blue-50 text-blue-700 border-blue-200', desc: 'Complete database dump with download, export & import capabilities.' },
  { id: 'contacts', name: 'Contacts Backup', icon: <Users className="text-emerald-600" size={20} />, color: 'bg-emerald-50 text-emerald-700 border-emerald-200', desc: 'Subscribers directory, lists & senders. (Admin access only)' },
  { id: 'automations', name: 'Automations Backup', icon: <Workflow className="text-indigo-600" size={20} />, color: 'bg-indigo-50 text-indigo-700 border-indigo-200', desc: 'Automation rules, steps and workflow configurations.' },
  { id: 'campaigns', name: 'Campaigns Backup', icon: <Megaphone className="text-amber-600" size={20} />, color: 'bg-amber-50 text-amber-700 border-amber-200', desc: 'Email campaigns, design templates, and analytics stats.' }
];

const MODULE_COMPONENTS = {
  all: [
    { id: 'subscribers', name: 'Subscribers Directory & Origins' },
    { id: 'lists', name: 'Target Lists & Associations' },
    { id: 'senders', name: 'SMTP Senders & Configs' },
    { id: 'campaigns', name: 'Email Campaigns Data' },
    { id: 'templates', name: 'Email Design Templates' },
    { id: 'automations', name: 'Automation Workflows & Rules' },
    { id: 'automation_steps', name: 'Automation Steps & Actions' },
    { id: 'settings', name: 'System Settings & Configs' },
    { id: 'admin_users', name: 'User Profiles & Permissions' },
    { id: 'ui_programming', name: 'UI & System Programming Configurations' }
  ],
  database: [
    { id: 'subscribers', name: 'Subscribers Table' },
    { id: 'lists', name: 'Target Lists Table' },
    { id: 'senders', name: 'SMTP Senders Table' },
    { id: 'campaigns', name: 'Campaigns Table' },
    { id: 'templates', name: 'Templates Table' },
    { id: 'automations', name: 'Automations Table' },
    { id: 'automation_steps', name: 'Automation Steps Table' },
    { id: 'settings', name: 'System Settings Table' },
    { id: 'admin_users', name: 'Admin Users Table' }
  ],
  contacts: [
    { id: 'subscribers', name: 'Subscribers Directory' },
    { id: 'lists', name: 'Target Lists & Associations' },
    { id: 'senders', name: 'SMTP Senders List' },
    { id: 'subscriber_origins', name: 'Subscriber Origins & Tracking' },
    { id: 'contact_import_logs', name: 'Contact Import Logs' },
    { id: 'contacts_ui_config', name: 'Contacts UI & Form Settings Config' }
  ],
  automations: [
    { id: 'automations', name: 'Automation Workflows' },
    { id: 'automation_steps', name: 'Automation Steps & Actions' },
    { id: 'automation_subscribers', name: 'Active Automation Subscribers' },
    { id: 'automation_products', name: 'Automation Products Catalog' },
    { id: 'automation_generation_history', name: 'AI Generation History' },
    { id: 'automations_ui_config', name: 'Automations UI & Builder Config' }
  ],
  campaigns: [
    { id: 'campaigns', name: 'Email Campaigns Data' },
    { id: 'templates', name: 'Email Design Templates' },
    { id: 'campaign_opens', name: 'Campaign Open Analytics' },
    { id: 'campaign_clicks', name: 'Campaign Click Analytics' },
    { id: 'campaigns_ui_config', name: 'Campaigns UI & Designer Config' }
  ]
};

export default function BackupsAndHistory({ initialTab = 'management' }) {
  const { confirm, alert: customAlert } = useModal();
  const [activeTab, setActiveTab] = useState(initialTab); // 'management', 'schedules', 'history'

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Logged in user info
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userRole = currentUser.role;
  const userPermissions = currentUser.permissions || {};
  const isAdmin = userRole === 'Super Admin' || userRole === 'Admin' || userRole === 'Sub Admin';
  const hasContactsBackupAccess = isAdmin || userPermissions.contacts_backup === true;
  const hasAllSystemAccess = isAdmin || userPermissions.all_system_backup === true;
  const hasDatabaseAccess = isAdmin || userPermissions.database_backup === true;

  // Backups State
  const [backups, setBackups] = useState([]);
  const [loadingBackups, setLoadingBackups] = useState(false);

  // Filters State
  const [filterModule, setFilterModule] = useState('All');
  const [filterPreset, setFilterPreset] = useState('all'); // all, today, yesterday, 7days, month, year, custom
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Create Backup Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState('all');
  const [description, setDescription] = useState('');
  const [selectedComponents, setSelectedComponents] = useState([]);
  const [creating, setCreating] = useState(false);

  // Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importContent, setImportContent] = useState('');
  const [importing, setImporting] = useState(false);

  // Restore Modal State
  const [revertItem, setRevertItem] = useState(null);
  const [tablesToRestore, setTablesToRestore] = useState([]);
  const [reverting, setReverting] = useState(false);

  // Auto Schedule & Reminder State
  const [schedules, setSchedules] = useState([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [scheduleModule, setScheduleModule] = useState('all');
  const [scheduleComponents, setScheduleComponents] = useState(MODULE_COMPONENTS.all.map(c => c.id));
  const [scheduleFrequency, setScheduleFrequency] = useState('weekly');
  const [scheduleStatus, setScheduleStatus] = useState('active');
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderEmail, setReminderEmail] = useState('');
  const [savingSchedule, setSavingSchedule] = useState(false);

  // History Logs State
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [historyAction, setHistoryAction] = useState('All');
  const [historyModule, setHistoryModule] = useState('All');
  const [historySearch, setHistorySearch] = useState('');

  useEffect(() => {
    fetchBackups();
    fetchSchedules();
    fetchHistoryLogs();
  }, []);

  const fetchBackups = async () => {
    try {
      setLoadingBackups(true);
      const res = await axios.get('/api/backup/list');
      setBackups(res.data || []);
    } catch (err) {
      console.error('Fetch backups error:', err);
    } finally {
      setLoadingBackups(false);
    }
  };

  const fetchSchedules = async () => {
    try {
      setLoadingSchedules(true);
      const res = await axios.get('/api/backup/schedules');
      setSchedules(res.data || []);
      if (res.data && res.data.length > 0) {
        const first = res.data[0];
        const mod = first.module_type || 'all';
        setScheduleModule(mod);
        setScheduleComponents((MODULE_COMPONENTS[mod] || MODULE_COMPONENTS.all).map(c => c.id));
        setScheduleFrequency(first.frequency || 'weekly');
        setScheduleStatus(first.status || 'active');
        setReminderEnabled(first.reminder_enabled === 1 || first.reminder_enabled === true);
        setReminderEmail(first.reminder_email || '');
      }
    } catch (err) {
      console.error('Fetch schedules error:', err);
    } finally {
      setLoadingSchedules(false);
    }
  };

  const fetchHistoryLogs = async () => {
    try {
      setLoadingLogs(true);
      const res = await axios.get('/api/history');
      setLogs(res.data || []);
    } catch (err) {
      console.error('Fetch logs error:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  // Open Create Backup Modal
  const handleOpenCreateModal = (moduleKey = 'all') => {
    if (moduleKey === 'contacts' && !hasContactsBackupAccess) {
      customAlert({ title: 'Access Restricted', message: 'Contacts Backup is available for Admin users only.', type: 'warning' });
      return;
    }
    if (moduleKey === 'all' && !hasAllSystemAccess) {
      customAlert({ title: 'Access Restricted', message: 'You do not have permission to execute All System Backup.', type: 'warning' });
      return;
    }
    if (moduleKey === 'database' && !hasDatabaseAccess) {
      customAlert({ title: 'Access Restricted', message: 'You do not have permission to execute Database Backup.', type: 'warning' });
      return;
    }

    setSelectedModule(moduleKey);
    setDescription(`Manual ${moduleKey.toUpperCase()} Backup - ${new Date().toLocaleDateString()}`);
    const availableComps = (MODULE_COMPONENTS[moduleKey] || MODULE_COMPONENTS.all).map(c => c.id);
    setSelectedComponents(availableComps);
    setIsCreateModalOpen(true);
  };

  const handleCreateBackupSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) {
      customAlert({ title: 'Validation Error', message: 'Please enter a description for the backup.', type: 'warning' });
      return;
    }
    try {
      setCreating(true);
      await axios.post('/api/backup/create', {
        description: description.trim(),
        module_type: selectedModule,
        tables: selectedComponents
      });
      setIsCreateModalOpen(false);
      customAlert({ title: 'Success', message: `Backup snapshot created successfully for ${selectedModule.toUpperCase()}!`, type: 'success' });
      fetchBackups();
    } catch (err) {
      console.error(err);
      customAlert({ title: 'Error', message: err.response?.data?.error || 'Failed to create backup.', type: 'danger' });
    } finally {
      setCreating(false);
    }
  };

  // Import Backup Handlers
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImportFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setImportContent(event.target.result);
    };
    reader.readAsText(file);
  };

  const handleImportSubmit = async (e) => {
    e.preventDefault();
    if (!importContent) {
      customAlert({ title: 'Validation Error', message: 'Please select a valid .sql or .json backup file to import.', type: 'warning' });
      return;
    }
    const isOk = await confirm({
      title: 'CRITICAL: Import Database Backup?',
      message: `Warning: Importing "${importFile?.name || 'backup file'}" will overwrite or append database tables. Are you sure you want to proceed?`,
      confirmText: 'Yes, Import Now',
      type: 'danger'
    });
    if (!isOk) return;

    try {
      setImporting(true);
      await axios.post('/api/backup/import', {
        fileContent: importContent,
        description: `Imported Backup (${importFile?.name || 'file'}) - ${new Date().toLocaleDateString()}`,
        module_type: 'database'
      });
      setIsImportModalOpen(false);
      setImportFile(null);
      setImportContent('');
      customAlert({ title: 'Import Successful', message: 'Backup file imported and database restored successfully!', type: 'success' });
      fetchBackups();
    } catch (err) {
      console.error(err);
      customAlert({ title: 'Error', message: err.response?.data?.error || 'Failed to import backup.', type: 'danger' });
    } finally {
      setImporting(false);
    }
  };

  // Restore Backup
  const startRevert = (item) => {
    setRevertItem(item);
    const included = (item.tables_included || '').split(',').filter(Boolean);
    setTablesToRestore(included);
  };

  const handleRevertSubmit = async () => {
    if (tablesToRestore.length === 0) {
      customAlert({ title: 'Validation Error', message: 'Please select at least one component to restore.', type: 'warning' });
      return;
    }
    const isOk = await confirm({
      title: 'CRITICAL: Revert Backup Snapshot?',
      message: `Warning: This action will overwrite existing records for selected items (${tablesToRestore.join(', ')}). Are you sure you want to proceed?`,
      confirmText: 'Yes, Revert Now',
      type: 'danger'
    });
    if (!isOk) return;

    try {
      setReverting(true);
      await axios.post(`/api/backup/${revertItem.id}/restore`, { tablesToRestore });
      setRevertItem(null);
      customAlert({ title: 'Restored', message: 'Backup snapshot restored successfully!', type: 'success' });
    } catch (err) {
      console.error(err);
      customAlert({ title: 'Error', message: err.response?.data?.error || 'Failed to restore backup.', type: 'danger' });
    } finally {
      setReverting(false);
    }
  };

  // Delete Backup Permanently
  const handleDeletePermanently = async (id) => {
    const isOk = await confirm({
      title: 'Delete Backup Permanently?',
      message: 'This backup snapshot file will be permanently removed from storage. This action CANNOT be undone.',
      confirmText: 'Delete Permanently',
      type: 'danger'
    });
    if (!isOk) return;

    try {
      try {
        await axios.delete(`/api/backup/${id}`);
      } catch (_) {
        await axios.post('/api/backup/delete', { id });
      }
      customAlert({ title: 'Deleted', message: 'Backup snapshot deleted permanently.', type: 'success' });
      fetchBackups();
    } catch (err) {
      console.error('Delete error:', err);
      customAlert({ title: 'Error', message: err.response?.data?.error || 'Failed to delete backup.', type: 'danger' });
    }
  };

  // Download Specific Snapshot SQL File
  const handleDownloadSnapshotSql = async (id) => {
    try {
      const response = await axios.get(`/api/backup/download?id=${id}&type=sql`, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/sql' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `bexemail_backup_db_#${id}.sql`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download snapshot SQL error:', err);
      let errMsg = 'Failed to download SQL snapshot.';
      if (err.response && err.response.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const json = JSON.parse(text);
          errMsg = json.error || errMsg;
        } catch (_) {}
      } else if (err.response?.data?.error) {
        errMsg = err.response.data.error;
      }
      customAlert({ title: 'Download Failed', message: errMsg, type: 'danger' });
    }
  };

  // Download Specific Snapshot Code & UI Package
  const handleDownloadSnapshotCodeUi = async (id) => {
    try {
      const response = await axios.get(`/api/backup/download?id=${id}&type=code_ui`, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `bexemail_code_ui_#${id}.json`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download snapshot Code & UI error:', err);
      let errMsg = 'Failed to download Code & UI package.';
      if (err.response && err.response.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const json = JSON.parse(text);
          errMsg = json.error || errMsg;
        } catch (_) {}
      } else if (err.response?.data?.error) {
        errMsg = err.response.data.error;
      }
      customAlert({ title: 'Download Failed', message: errMsg, type: 'danger' });
    }
  };

  // Download Full Live DB Dump
  const triggerDownloadFullSql = async () => {
    try {
      const response = await axios.get('/api/backup/download', { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/sql' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `bexemail_full_db_dump_${Date.now()}.sql`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download live SQL error:', err);
      let errMsg = 'Failed to download database dump.';
      if (err.response && err.response.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const json = JSON.parse(text);
          errMsg = json.error || errMsg;
        } catch (_) {}
      } else if (err.response?.data?.error) {
        errMsg = err.response.data.error;
      }
      customAlert({ title: 'Download Failed', message: errMsg, type: 'danger' });
    }
  };

  // Download Live Code & UI System Package
  const triggerDownloadCodeUi = async () => {
    try {
      const response = await axios.get('/api/backup/download-code-ui', { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `bexemail_code_ui_system_${Date.now()}.json`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download Code & UI error:', err);
      let errMsg = 'Failed to download Code & UI system package.';
      if (err.response && err.response.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const json = JSON.parse(text);
          errMsg = json.error || errMsg;
        } catch (_) {}
      } else if (err.response?.data?.error) {
        errMsg = err.response.data.error;
      }
      customAlert({ title: 'Download Failed', message: errMsg, type: 'danger' });
    }
  };

  // Save Schedule & Reminder
  const handleSaveSchedule = async (e) => {
    e.preventDefault();
    try {
      setSavingSchedule(true);
      await axios.post('/api/backup/schedules', {
        module_type: scheduleModule,
        frequency: scheduleFrequency,
        status: scheduleStatus,
        reminder_enabled: reminderEnabled ? 1 : 0,
        reminder_email: reminderEmail.trim(),
        components: scheduleComponents
      });
      customAlert({ title: 'Settings Saved', message: 'Automated backup schedule and reminders saved successfully!', type: 'success' });
      fetchSchedules();
    } catch (err) {
      console.error(err);
      customAlert({ title: 'Error', message: err.response?.data?.error || 'Failed to save schedule.', type: 'danger' });
    } finally {
      setSavingSchedule(false);
    }
  };

  // Quick Restore from Audit History
  const handleQuickRestoreHistory = async (historyId) => {
    const isOk = await confirm({
      title: 'Quick Restore Audit Entry?',
      message: 'Revert this specific database record change back to its prior state?',
      confirmText: 'Yes, Restore Record',
      type: 'warning'
    });
    if (!isOk) return;

    try {
      await axios.post(`/api/history/${historyId}/restore`);
      customAlert({ title: 'Record Restored', message: 'Historical log entry restored successfully.', type: 'success' });
      fetchHistoryLogs();
    } catch (err) {
      console.error(err);
      customAlert({ title: 'Restore Failed', message: err.response?.data?.error || 'Could not restore audit record.', type: 'danger' });
    }
  };

  // Filter Backups List
  const filteredBackups = backups.filter(b => {
    // Module Filter
    const modMatch = filterModule === 'All' || (b.module_type || 'all').toLowerCase() === filterModule.toLowerCase();
    if (!modMatch) return false;

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchDesc = (b.description || '').toLowerCase().includes(q);
      const matchMod = (b.module_type || '').toLowerCase().includes(q);
      const matchTbl = (b.tables_included || '').toLowerCase().includes(q);
      if (!matchDesc && !matchMod && !matchTbl) return false;
    }

    // Date Presets
    const date = new Date(b.created_at);
    const now = new Date();

    if (filterPreset === 'today') {
      return date.toDateString() === now.toDateString();
    }
    if (filterPreset === 'yesterday') {
      const yest = new Date(now);
      yest.setDate(yest.getDate() - 1);
      return date.toDateString() === yest.toDateString();
    }
    if (filterPreset === '7days') {
      const past7 = new Date(now);
      past7.setDate(past7.getDate() - 7);
      return date >= past7;
    }
    if (filterPreset === 'month') {
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }
    if (filterPreset === 'year') {
      return date.getFullYear() === now.getFullYear();
    }
    if (filterPreset === 'custom') {
      if (startDate && new Date(b.created_at) < new Date(`${startDate}T00:00:00`)) return false;
      if (endDate && new Date(b.created_at) > new Date(`${endDate}T23:59:59`)) return false;
    }

    return true;
  });

  // Filter History Logs
  const filteredHistoryLogs = logs.filter(l => {
    if (historyAction !== 'All' && l.action.toLowerCase() !== historyAction.toLowerCase()) return false;
    if (historyModule !== 'All' && l.table_name.toLowerCase() !== historyModule.toLowerCase()) return false;
    if (historySearch.trim()) {
      const q = historySearch.toLowerCase();
      const matchTable = (l.table_name || '').toLowerCase().includes(q);
      const matchUser = (l.changed_by || '').toLowerCase().includes(q);
      const matchAction = (l.action || '').toLowerCase().includes(q);
      if (!matchTable && !matchUser && !matchAction) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      
      {/* Dynamic Top Banner Header per page */}
      {activeTab === 'management' && (
        <div className="flex flex-col md:flex-row md:items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-gray-200/60 gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2.5">
              <Database className="text-primary-600" size={26} /> Backups Management
            </h2>
            <p className="text-gray-500 mt-1 text-sm">
              Centralized backup snapshots, database SQL dumps, system code & UI config packages.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => handleOpenCreateModal('all')}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold shadow transition"
            >
              <Plus size={15} /> Take Full Backup
            </button>
            
            <button
              onClick={triggerDownloadFullSql}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow transition"
              title="Download SQL Database Dump"
            >
              <Download size={15} /> Download DB SQL
            </button>

            <button
              onClick={triggerDownloadCodeUi}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow transition"
              title="Download System Code & UI Config Package"
            >
              <Code size={15} /> Download Code & UI
            </button>
          </div>
        </div>
      )}

      {activeTab === 'schedules' && (
        <div className="flex flex-col md:flex-row md:items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-gray-200/60 gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2.5">
              <Clock className="text-emerald-600" size={26} /> Auto Backup & Reminders
            </h2>
            <p className="text-gray-500 mt-1 text-sm">
              Automated backup frequency schedules, target module components, and email notification reminders.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-3.5 py-2 rounded-xl text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs">
              <CheckCircle2 size={15} className="mr-1.5 text-emerald-600" /> Auto Backup Engine Active
            </span>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="flex flex-col md:flex-row md:items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-gray-200/60 gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2.5">
              <History className="text-indigo-600" size={26} /> History & Audit Logs
            </h2>
            <p className="text-gray-500 mt-1 text-sm">
              Comprehensive audit trail and activity log of system events, database updates, and backup operations.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchHistoryLogs}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition shadow-xs"
            >
              <RefreshCw size={15} className={loadingLogs ? "animate-spin text-primary-600" : ""} /> Refresh Logs
            </button>
          </div>
        </div>
      )}

      {/* Primary Navigation Pills */}
      <div className="flex items-center gap-2 border-b border-gray-200 bg-white px-4 rounded-2xl shadow-sm">
        <Link
          to="/backups"
          className={`flex items-center gap-2 py-4 px-5 text-xs font-bold border-b-2 transition ${
            activeTab === 'management'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Database size={16} /> Backups Management
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-primary-100 text-primary-800 font-extrabold">
            {backups.length}
          </span>
        </Link>

        <Link
          to="/backups/schedules"
          className={`flex items-center gap-2 py-4 px-5 text-xs font-bold border-b-2 transition ${
            activeTab === 'schedules'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Clock size={16} /> Auto Backup & Reminders
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-extrabold">
            Active
          </span>
        </Link>

        <Link
          to="/history"
          className={`flex items-center gap-2 py-4 px-5 text-xs font-bold border-b-2 transition ${
            activeTab === 'history'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <History size={16} /> History & Audit Logs
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-gray-100 font-extrabold text-gray-700">
            {logs.length}
          </span>
        </Link>
      </div>

      {/* TAB 1: BACKUPS MANAGEMENT */}
      {activeTab === 'management' && (
        <div className="space-y-6">
          
          {/* Quick Module Backup Cards (5 Categories) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {MODULE_OPTIONS.map(mod => {
              const count = backups.filter(b => (b.module_type || 'all').toLowerCase() === mod.id).length;
              const isContactsCard = mod.id === 'contacts';
              const isDatabaseCard = mod.id === 'database';
              const isDisabled = isContactsCard && !hasContactsBackupAccess;

              return (
                <div key={mod.id} className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between hover:border-gray-300 transition">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className={`p-2 rounded-xl border ${mod.color}`}>
                        {mod.icon}
                      </div>
                      <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
                        {count} Snapshots
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <h3 className="text-xs font-bold text-gray-900">{mod.name}</h3>
                      {isContactsCard && (
                        <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[9px] font-black rounded uppercase">
                          Admin Only
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1 leading-snug">{mod.desc}</p>
                  </div>

                  <div className="mt-3 space-y-1.5">
                    {/* Database Backup Card Action Options (Backup, Download, Export, Import) */}
                    {isDatabaseCard ? (
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          onClick={() => handleOpenCreateModal('database')}
                          className="py-1.5 bg-primary-600 hover:bg-primary-700 text-white font-bold text-[10px] rounded-lg transition"
                        >
                          + Backup DB
                        </button>
                        <button
                          onClick={triggerDownloadFullSql}
                          className="py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[10px] rounded-lg border border-blue-200 transition"
                        >
                          Download
                        </button>
                        <button
                          onClick={triggerDownloadCodeUi}
                          className="py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[10px] rounded-lg border border-indigo-200 transition"
                        >
                          Code & UI
                        </button>
                        <button
                          onClick={() => setIsImportModalOpen(true)}
                          className="py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[10px] rounded-lg border border-emerald-200 transition"
                        >
                          Import
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleOpenCreateModal(mod.id)}
                        disabled={isDisabled}
                        className={`w-full py-2 font-bold text-xs rounded-xl border transition flex items-center justify-center gap-1.5 ${
                          isDisabled
                            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                            : 'bg-gray-50 hover:bg-primary-50 text-gray-700 hover:text-primary-700 border-gray-200 hover:border-primary-200'
                        }`}
                      >
                        {isDisabled ? (
                          <> <Lock size={12} /> Restricted </>
                        ) : (
                          <> <Plus size={14} /> Backup {mod.id.toUpperCase()} </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
            
            {/* Left: Module Filter & Search */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Module Selector */}
              <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-3 py-2 rounded-xl">
                <Filter size={14} className="text-gray-500" />
                <span className="text-xs font-semibold text-gray-600">Module:</span>
                <select
                  value={filterModule}
                  onChange={e => setFilterModule(e.target.value)}
                  className="bg-transparent text-xs font-bold text-gray-800 outline-none cursor-pointer"
                >
                  <option value="All">All Modules</option>
                  <option value="all">Full System</option>
                  <option value="database">Database</option>
                  <option value="contacts">Contacts Backup</option>
                  <option value="automations">Automations</option>
                  <option value="campaigns">Campaigns</option>
                </select>
              </div>

              {/* Search Box */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search backups..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-primary-500 w-48"
                />
              </div>
            </div>

            {/* Right: Date / Day / Month / Year Filter Options */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-gray-500 flex items-center gap-1">
                <Calendar size={14} /> Time:
              </span>
              {[
                { id: 'all', label: 'All Time' },
                { id: 'today', label: 'Today (Day)' },
                { id: 'yesterday', label: 'Yesterday' },
                { id: '7days', label: 'Past 7 Days' },
                { id: 'month', label: 'This Month' },
                { id: 'year', label: 'This Year' },
                { id: 'custom', label: 'Custom Date' }
              ].map(preset => (
                <button
                  key={preset.id}
                  onClick={() => setFilterPreset(preset.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    filterPreset === preset.id
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  {preset.label}
                </button>
              ))}

              {filterPreset === 'custom' && (
                <div className="flex items-center gap-1.5 ml-2">
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none"
                  />
                  <span className="text-xs text-gray-400">to</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none"
                  />
                </div>
              )}

              <button
                onClick={fetchBackups}
                className="p-2 hover:bg-gray-100 text-gray-500 rounded-xl transition"
                title="Refresh List"
              >
                <RefreshCw size={15} className={loadingBackups ? 'animate-spin' : ''} />
              </button>
            </div>

          </div>

          {/* Backup Snapshots Table */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden min-h-[400px] flex flex-col">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-700 flex items-center gap-2">
                <Database size={15} className="text-primary-600" /> Registered Backup Snapshots ({filteredBackups.length})
              </h3>
            </div>

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left text-xs text-gray-600">
                <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-200 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3.5">ID / Timestamp</th>
                    <th className="px-4 py-3.5">Module Category</th>
                    <th className="px-4 py-3.5">Description</th>
                    <th className="px-4 py-3.5">Included Content</th>
                    <th className="px-4 py-3.5 text-right">Actions (Restore, SQL, Code & UI, Delete)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loadingBackups && backups.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-4 py-12 text-center text-gray-400 font-medium">Loading backup history...</td>
                    </tr>
                  ) : filteredBackups.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-4 py-12 text-center text-gray-400 font-semibold">No backup snapshots match your selected filters.</td>
                    </tr>
                  ) : (
                    filteredBackups.map(b => {
                      const modTag = (b.module_type || 'all').toLowerCase();
                      const badgeColor = modTag === 'contacts' || modTag === 'db'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                        : modTag === 'database'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : modTag === 'automations' 
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        : modTag === 'campaigns'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-primary-50 text-primary-700 border-primary-200';

                      return (
                        <tr key={b.id} className="hover:bg-gray-50/70 transition">
                          <td className="px-4 py-3.5 font-semibold text-gray-900">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-bold">#{b.id}</span>
                              <span>{new Date(b.created_at).toLocaleString()}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={`px-2 py-1 rounded-lg border text-[11px] font-extrabold uppercase tracking-wide ${badgeColor}`}>
                              {b.module_type || 'ALL SYSTEM'}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 font-medium text-gray-800">{b.description}</td>
                          <td className="px-4 py-3.5">
                            <div className="flex flex-wrap gap-1">
                              {(b.tables_included || '').split(',').map(tbl => (
                                <span key={tbl} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-bold">
                                  {tbl}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => startRevert(b)}
                                className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl border border-emerald-200 transition text-[11px] flex items-center gap-1"
                                title="Revert/Restore Snapshot"
                              >
                                <Play size={12} /> Restore
                              </button>
                              
                              <button
                                onClick={() => handleDownloadSnapshotSql(b.id)}
                                className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl border border-blue-200 transition text-[11px] flex items-center gap-1"
                                title="Download SQL Database Dump (.sql)"
                              >
                                <Download size={12} /> SQL
                              </button>

                              <button
                                onClick={() => handleDownloadSnapshotCodeUi(b.id)}
                                className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl border border-indigo-200 transition text-[11px] flex items-center gap-1"
                                title="Download System Code & UI Package (.json)"
                              >
                                <Code size={12} /> Code & UI
                              </button>

                              <button
                                onClick={() => handleDeletePermanently(b.id)}
                                className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl border border-red-200 transition text-[11px] flex items-center gap-1"
                                title="Delete Permanently"
                              >
                                <Trash2 size={12} /> Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: AUTOMATED BACKUP SCHEDULES & REMINDERS */}
      {activeTab === 'schedules' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Schedule Settings Form */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5 lg:col-span-2">
            <div className="border-b border-gray-100 pb-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Clock className="text-primary-600" size={20} /> Automated Backup Frequency & Reminders
              </h3>
              <p className="text-gray-500 text-xs mt-1">
                Configure background auto-backups for Daily, Weekly, Monthly, or Yearly execution and set up instant email reminders.
              </p>
            </div>

            <form onSubmit={handleSaveSchedule} className="space-y-5">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Target Module</label>
                  <select
                    value={scheduleModule}
                    onChange={e => {
                      const mod = e.target.value;
                      setScheduleModule(mod);
                      setScheduleComponents((MODULE_COMPONENTS[mod] || MODULE_COMPONENTS.all).map(c => c.id));
                    }}
                    className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="all">All System (Full Database & Programming UI Config)</option>
                    <option value="database">Database (SQL Dump)</option>
                    <option value="contacts">Contacts Backup (Admin Access Only)</option>
                    <option value="automations">Automations (Workflows & Steps)</option>
                    <option value="campaigns">Campaigns (Campaigns & Analytics)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Backup Frequency</label>
                  <select
                    value={scheduleFrequency}
                    onChange={e => setScheduleFrequency(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="daily">Daily (Every 24 hours)</option>
                    <option value="weekly">Weekly (Every 7 days)</option>
                    <option value="monthly">Monthly (Every 30 days)</option>
                    <option value="yearly">Yearly (Every 365 days)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Select Module Components for Auto-Backup</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 border border-gray-200 rounded-xl p-3 bg-gray-50/50 max-h-36 overflow-y-auto">
                  {(MODULE_COMPONENTS[scheduleModule] || MODULE_COMPONENTS.all).map(comp => (
                    <label key={comp.id} className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer p-1 hover:bg-white rounded font-medium">
                      <input
                        type="checkbox"
                        checked={scheduleComponents.includes(comp.id)}
                        onChange={() => {
                          setScheduleComponents(prev => 
                            prev.includes(comp.id) ? prev.filter(x => x !== comp.id) : [...prev, comp.id]
                          );
                        }}
                        className="rounded text-primary-600 focus:ring-primary-500 w-3.5 h-3.5"
                      />
                      <span>{comp.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Schedule Status</label>
                  <div className="flex items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setScheduleStatus('active')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold border transition ${
                        scheduleStatus === 'active'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-2 ring-emerald-200'
                          : 'bg-gray-50 text-gray-600 border-gray-200'
                      }`}
                    >
                      Active & Scheduled
                    </button>
                    <button
                      type="button"
                      onClick={() => setScheduleStatus('paused')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold border transition ${
                        scheduleStatus === 'paused'
                          ? 'bg-amber-50 text-amber-700 border-amber-300 ring-2 ring-amber-200'
                          : 'bg-gray-50 text-gray-600 border-gray-200'
                      }`}
                    >
                      Paused
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Reminder Notifications</label>
                  <label className="flex items-center gap-2 cursor-pointer pt-2">
                    <input
                      type="checkbox"
                      checked={reminderEnabled}
                      onChange={e => setReminderEnabled(e.target.checked)}
                      className="rounded text-primary-600 focus:ring-primary-500 w-4 h-4"
                    />
                    <span className="text-xs font-semibold text-gray-700">Send reminder email upon backup completion</span>
                  </label>
                </div>
              </div>

              {reminderEnabled && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Reminder Recipient Email</label>
                  <input
                    type="email"
                    value={reminderEmail}
                    onChange={e => setReminderEmail(e.target.value)}
                    placeholder="admin@bexemail.com"
                    className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={savingSchedule}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 rounded-xl transition disabled:opacity-50 text-xs shadow mt-2"
              >
                {savingSchedule ? 'Saving Settings...' : 'Save Automated Backup Schedule'}
              </button>
            </form>
          </div>

          {/* Status Info Sidebar */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
              <Bell size={16} className="text-primary-600" /> Active Schedule Status
            </h3>

            <div className="space-y-3">
              {schedules.length === 0 ? (
                <p className="text-xs text-gray-400 font-medium">No auto-backup schedules registered yet. Set your preferred frequency on the left.</p>
              ) : (
                schedules.map(s => (
                  <div key={s.id} className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold uppercase text-gray-900">
                        {s.module_type} Backup
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        s.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {s.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">
                      Frequency: <strong className="capitalize text-gray-900">{s.frequency}</strong>
                    </p>
                    {s.reminder_email && (
                      <p className="text-[11px] text-gray-500 truncate">
                        Alert: {s.reminder_email}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}

      {/* TAB 3: HISTORY LOGS */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          
          {/* Top History Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            <div className="flex flex-wrap items-center gap-3">
              {/* Action Filter */}
              <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-3 py-2 rounded-xl">
                <Filter size={14} className="text-gray-500" />
                <span className="text-xs font-semibold text-gray-600">Action:</span>
                <select
                  value={historyAction}
                  onChange={e => setHistoryAction(e.target.value)}
                  className="bg-transparent text-xs font-bold text-gray-800 outline-none cursor-pointer capitalize"
                >
                  <option value="All">All Actions</option>
                  <option value="add">Add / Create</option>
                  <option value="edit">Edit / Update</option>
                  <option value="delete">Delete / Remove</option>
                  <option value="restore">Restore</option>
                </select>
              </div>

              {/* Module Filter */}
              <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-3 py-2 rounded-xl">
                <span className="text-xs font-semibold text-gray-600">Module Table:</span>
                <select
                  value={historyModule}
                  onChange={e => setHistoryModule(e.target.value)}
                  className="bg-transparent text-xs font-bold text-gray-800 outline-none cursor-pointer"
                >
                  <option value="All">All Tables</option>
                  <option value="subscribers">Subscribers</option>
                  <option value="lists">Lists</option>
                  <option value="campaigns">Campaigns</option>
                  <option value="templates">Templates</option>
                  <option value="automations">Automations</option>
                  <option value="senders">Senders</option>
                  <option value="settings">Settings</option>
                  <option value="admin_users">Users</option>
                </select>
              </div>

              {/* Search Box */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search history logs..."
                  value={historySearch}
                  onChange={e => setHistorySearch(e.target.value)}
                  className="pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-primary-500 w-52"
                />
              </div>
            </div>

            <button
              onClick={fetchHistoryLogs}
              className="p-2 hover:bg-gray-100 text-gray-500 rounded-xl transition self-end md:self-auto"
              title="Refresh History Logs"
            >
              <RefreshCw size={15} className={loadingLogs ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Audit Logs Table */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden min-h-[400px] flex flex-col">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-700 flex items-center gap-2">
                <History size={15} className="text-primary-600" /> System History Audit Log Trail ({filteredHistoryLogs.length})
              </h3>
            </div>

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left text-xs text-gray-600">
                <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-200 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3.5">Timestamp</th>
                    <th className="px-4 py-3.5">Action</th>
                    <th className="px-4 py-3.5">Target Module</th>
                    <th className="px-4 py-3.5">Record ID</th>
                    <th className="px-4 py-3.5">Changed By</th>
                    <th className="px-4 py-3.5 text-right">Quick Restore</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loadingLogs && logs.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-4 py-12 text-center text-gray-400">Loading audit history logs...</td>
                    </tr>
                  ) : filteredHistoryLogs.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-4 py-12 text-center text-gray-400 font-semibold">No audit logs found matching criteria.</td>
                    </tr>
                  ) : (
                    filteredHistoryLogs.map(log => {
                      const actionBadge = log.action === 'delete'
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : log.action === 'add'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : log.action === 'edit'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-purple-50 text-purple-700 border-purple-200';

                      return (
                        <tr key={log.id} className="hover:bg-gray-50/70 transition">
                          <td className="px-4 py-3 font-semibold text-gray-900">{new Date(log.timestamp).toLocaleString()}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded border text-[10px] font-extrabold uppercase ${actionBadge}`}>
                              {log.action}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-bold text-gray-800">{log.table_name}</td>
                          <td className="px-4 py-3 font-mono font-bold text-gray-600">#{log.record_id}</td>
                          <td className="px-4 py-3 font-medium text-gray-700">{log.changed_by || 'System'}</td>
                          <td className="px-4 py-3 text-right">
                            {log.action === 'delete' && (
                              <button
                                onClick={() => handleQuickRestoreHistory(log.id)}
                                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg border border-emerald-200 transition text-[11px] ml-auto inline-flex items-center gap-1"
                              >
                                Quick Restore
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* CREATE / DOWNLOAD / EXPORT BACKUP MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-gray-200 p-6 space-y-4 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-md font-bold text-gray-900 flex items-center gap-2">
                <UploadCloud size={20} className="text-primary-600" /> Take New Backup ({selectedModule.toUpperCase()})
              </h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-lg font-bold">×</button>
            </div>

            <form onSubmit={handleCreateBackupSubmit} className="space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-800 font-medium">
                {selectedModule === 'all' && 'Creates a full snapshot for ALL components, database tables, and programming/UI configs.'}
                {selectedModule === 'database' && 'Creates a complete database snapshot dump with download, export & import capabilities.'}
                {selectedModule === 'contacts' && 'Creates a backup for Contacts (subscribers, lists, senders, import logs & UI config). Admin Access Only.'}
                {selectedModule === 'automations' && 'Creates a backup for Automations (workflows, step rules, products & builder config).'}
                {selectedModule === 'campaigns' && 'Creates a backup for Campaigns (email campaigns, templates, analytics & designer config).'}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Description / Note</label>
                <input
                  type="text"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder={`e.g. ${selectedModule.toUpperCase()} snapshot`}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary-500 font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">Select Components to Backup</label>
                <div className="space-y-1.5 max-h-48 overflow-y-auto border border-gray-200 rounded-xl p-3 bg-gray-50/50">
                  {(MODULE_COMPONENTS[selectedModule] || MODULE_COMPONENTS.all).map(comp => (
                    <label key={comp.id} className="flex items-center gap-2.5 text-xs text-gray-800 cursor-pointer p-1.5 hover:bg-white rounded-lg transition font-medium">
                      <input
                        type="checkbox"
                        checked={selectedComponents.includes(comp.id)}
                        onChange={() => {
                          setSelectedComponents(prev => 
                            prev.includes(comp.id) ? prev.filter(x => x !== comp.id) : [...prev, comp.id]
                          );
                        }}
                        className="rounded text-primary-600 focus:ring-primary-500 w-4 h-4 cursor-pointer"
                      />
                      <span>{comp.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="submit"
                  disabled={creating || selectedComponents.length === 0}
                  className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-xl shadow transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Plus size={16} /> {creating ? 'Creating Snapshot...' : `Create ${selectedModule.toUpperCase()} Snapshot`}
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={triggerDownloadFullSql}
                    className="py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5"
                    title="Download Database SQL Dump"
                  >
                    <Download size={14} /> Download SQL
                  </button>

                  <button
                    type="button"
                    onClick={triggerDownloadCodeUi}
                    className="py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5"
                    title="Download Code & UI System Package"
                  >
                    <Code size={14} /> Code & UI System
                  </button>
                </div>
              </div>

              <div className="pt-1 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="w-full py-2 border border-gray-200 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-50 transition"
                >
                  Close
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IMPORT BACKUP MODAL */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-gray-200 p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-md font-bold text-gray-900 flex items-center gap-2">
                <Upload size={20} className="text-emerald-600" /> Import Backup File (SQL or Code & UI JSON)
              </h3>
              <button onClick={() => setIsImportModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-lg font-bold">×</button>
            </div>

            <form onSubmit={handleImportSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Select Backup File (.sql or .json)</label>
                <input
                  type="file"
                  accept=".sql,.json,.txt"
                  onChange={handleFileSelect}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs outline-none bg-gray-50"
                  required
                />
              </div>

              {importFile && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
                  <p className="font-bold">File loaded: {importFile.name}</p>
                  <p className="text-[11px] text-emerald-600 mt-0.5">Size: {(importFile.size / 1024).toFixed(1)} KB</p>
                </div>
              )}

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={importing || !importContent}
                  className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow transition disabled:opacity-50"
                >
                  {importing ? 'Importing...' : 'Import & Restore'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REVERT BACKUP MODAL */}
      {revertItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-gray-200 p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-md font-bold text-gray-900 flex items-center gap-2">
                <Play size={20} className="text-emerald-600" /> Revert Backup Snapshot (#{revertItem.id})
              </h3>
              <button onClick={() => setRevertItem(null)} className="text-gray-400 hover:text-gray-600 text-lg font-bold">×</button>
            </div>

            <div className="space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                <p className="font-bold">Module: {(revertItem.module_type || 'all').toUpperCase()}</p>
                <p className="mt-0.5">{revertItem.description}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">Select Items to Restore</label>
                <div className="space-y-1.5 max-h-40 overflow-y-auto border border-gray-200 rounded-xl p-3 bg-gray-50">
                  {(revertItem.tables_included || '').split(',').filter(Boolean).map(item => (
                    <label key={item} className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer p-1 hover:bg-white rounded font-medium">
                      <input
                        type="checkbox"
                        checked={tablesToRestore.includes(item)}
                        onChange={() => setTablesToRestore(prev => prev.includes(item) ? prev.filter(x => x !== item) : [...prev, item])}
                        className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                      />
                      <span>{item}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setRevertItem(null)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRevertSubmit}
                  disabled={reverting || tablesToRestore.length === 0}
                  className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow transition disabled:opacity-50"
                >
                  {reverting ? 'Reverting...' : 'Revert Selected Items'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
