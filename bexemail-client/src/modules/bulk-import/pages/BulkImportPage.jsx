import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Upload, Mail, Globe, List, CheckCircle, AlertTriangle, FileText, Trash, Users } from 'lucide-react';
import { useNotification } from '../../../components/NotificationContext';
import { useModal } from '../../../context/ModalContext';
import ConflictResolverModal from '../components/ConflictResolverModal';

export default function BulkImportPage() {
  const { success, error, warning } = useNotification();
  const { confirm, alert: customAlert } = useModal();
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const currentUserRole = currentUser.role;

  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('directory'); // 'directory' or 'lists'

  // Target Lists Config Import State
  const [listConfigFile, setListConfigFile] = useState('');
  const [listConfigRaw, setListConfigRaw] = useState('');
  const [parsedListsToImport, setParsedListsToImport] = useState([]);
  const [selectedListImportIndices, setSelectedListImportIndices] = useState([]);
  const [importingLists, setImportingLists] = useState(false);
  
  // Form State
  const [originSite, setOriginSite] = useState('');
  const [selectedListIds, setSelectedListIds] = useState([]);
  const [emailsRaw, setEmailsRaw] = useState('');
  const [fileName, setFileName] = useState('');
  const [isDragActive, setIsDragActive] = useState(false);
  const [adminUsers, setAdminUsers] = useState([]);
  const [targetAdminId, setTargetAdminId] = useState('');

  // Conflict Resolution State
  const [conflictData, setConflictData] = useState(null); // { newContacts, conflicts, originSite }
  const [showResolver, setShowResolver] = useState(false);

  useEffect(() => {
    fetchLists();
    if (currentUserRole === 'Super Admin' || currentUserRole === 'Admin') {
      fetchAdmins();
    }
    // Pre-populate with current origin
    setOriginSite(window.location.hostname || 'domain1.com');
  }, []);

  const fetchAdmins = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/admins', {
        headers: { 'x-user-role': currentUserRole || 'Admin', 'x-user-id': currentUser.id || 1 }
      }).catch(() => ({ data: [] }));
      setAdminUsers(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLists = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/lists');
      setLists(res.data || []);
      if (res.data && res.data.length > 0) {
        setSelectedListIds([res.data[0].id]);
      }
    } catch (err) {
      console.error(err);
      error('Failed to load target lists.');
    }
  };

  const handleListConfigFile = (file) => {
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.json')) {
      warning('Please upload a valid CSV or JSON list configuration file.');
      return;
    }
    setListConfigFile(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      setListConfigRaw(e.target.result || '');
      parseListConfiguration(e.target.result || '', file.name);
    };
    reader.readAsText(file);
  };

  const parseListConfiguration = (rawText, filename) => {
    let parsed = [];
    if (filename.endsWith('.json')) {
      try {
        const data = JSON.parse(rawText);
        if (Array.isArray(data)) {
          parsed = data.map((item, idx) => ({
            index: idx,
            name: item.name || item.list_name || '',
            description: item.description || '',
            admin_id: item.associated_admin_id || item.admin_id || null
          })).filter(item => item.name);
        }
      } catch (err) {
        error('Invalid JSON configuration format.');
        return;
      }
    } else {
      const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      if (lines.length > 1) {
        const headers = lines[0].split(',').map(h => h.replace(/^["']|["']$/g, '').trim().toLowerCase());
        const nameIdx = headers.indexOf('name') !== -1 ? headers.indexOf('name') : headers.indexOf('list_name');
        const descIdx = headers.indexOf('description');
        const adminIdx = headers.indexOf('associated_admin_id') !== -1 ? headers.indexOf('associated_admin_id') : headers.indexOf('admin_id');

        if (nameIdx !== -1) {
          parsed = lines.slice(1).map((line, idx) => {
            const columns = [];
            let current = '';
            let inQuotes = false;
            for (let i = 0; i < line.length; i++) {
              const char = line[i];
              if (char === '"') inQuotes = !inQuotes;
              else if (char === ',' && !inQuotes) {
                columns.push(current.trim().replace(/^["']|["']$/g, ''));
                current = '';
              } else {
                current += char;
              }
            }
            columns.push(current.trim().replace(/^["']|["']$/g, ''));

            return {
              index: idx,
              name: columns[nameIdx] || '',
              description: descIdx !== -1 ? columns[descIdx] : '',
              admin_id: adminIdx !== -1 ? (columns[adminIdx] ? Number(columns[adminIdx]) : null) : null
            };
          }).filter(item => item.name);
        }
      }
    }

    if (parsed.length === 0) {
      warning('No valid list configurations found in the file.');
      return;
    }

    setParsedListsToImport(parsed);
    setSelectedListImportIndices(parsed.map(p => p.index));
    success(`Successfully parsed ${parsed.length} target list configurations!`);
  };

  const handleImportListsSubmit = async () => {
    const selectedLists = parsedListsToImport.filter(p => selectedListImportIndices.includes(p.index));
    if (selectedLists.length === 0) {
      warning('Please select at least one configuration to import.');
      return;
    }

    try {
      setImportingLists(true);
      const mergedNames = [];
      const createdNames = [];

      for (const item of selectedLists) {
        const targetAdminId = currentUserRole === 'Super Admin' ? item.admin_id : currentUser.id;

        const res = await axios.post('http://localhost:5000/api/lists', {
          name: item.name,
          description: item.description,
          admin_id: targetAdminId
        }, { headers: { 'x-user-role': currentUserRole } });

        if (res.data && res.data.merged) {
          mergedNames.push(res.data.name);
        } else {
          createdNames.push(item.name);
        }
      }

      setParsedListsToImport([]);
      setSelectedListImportIndices([]);
      setListConfigFile('');
      setListConfigRaw('');
      await fetchLists();

      if (mergedNames.length > 0) {
        customAlert({
          title: 'Target Lists Processed',
          message: `Processed ${selectedLists.length} list configuration(s).\n\n${createdNames.length} list(s) created.\n\nThe following ${mergedNames.length} target list(s) already existed and were merged with existing lists:\n\n• ${mergedNames.join('\n• ')}`,
          type: 'info'
        });
      } else {
        success(`Successfully imported ${selectedLists.length} target lists!`);
      }
    } catch (err) {
      console.error(err);
      error('Failed to import target lists configuration.');
    } finally {
      setImportingLists(false);
    }
  };

  // Handle drag and drop events
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file) => {
    const validTypes = ['text/plain', 'text/csv', 'application/json', 'application/vnd.ms-excel'];
    if (!validTypes.includes(file.type) && !file.name.endsWith('.csv') && !file.name.endsWith('.txt') && !file.name.endsWith('.json')) {
      warning('Please upload a valid CSV, JSON, or TXT file.');
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      setEmailsRaw(e.target.result || '');
      success(`Loaded file: ${file.name}`);
    };
    reader.readAsText(file);
  };

  const clearFile = () => {
    setFileName('');
    setEmailsRaw('');
  };

  const handleParse = async (e) => {
    e.preventDefault();
    if (!originSite.trim()) {
      warning('Please enter an origin site/group name.');
      return;
    }
    if (selectedListIds.length === 0) {
      warning('Please select at least one target list.');
      return;
    }
    if (!emailsRaw.trim()) {
      warning('Please enter emails or drag & drop a file first.');
      return;
    }

    try {
      setLoading(true);

      // Task 4 Check: Parse list names from CSV or JSON file
      let parsedTargetLists = [];
      if (fileName.endsWith('.json')) {
        try {
          const parsed = JSON.parse(emailsRaw);
          if (Array.isArray(parsed)) {
            parsedTargetLists = Array.from(new Set(parsed.flatMap(c => {
              if (typeof c.target_lists === 'string') return c.target_lists.split(';').map(s => s.trim()).filter(Boolean);
              if (Array.isArray(c.target_lists)) return c.target_lists.map(s => String(s).trim()).filter(Boolean);
              return [];
            })));
          }
        } catch (_) {}
      } else if (fileName.endsWith('.csv') || fileName.endsWith('.xls')) {
        const lines = emailsRaw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        if (lines.length > 1) {
          const headers = lines[0].split(',').map(h => h.replace(/^["']|["']$/g, '').trim().toLowerCase());
          const listsIdx = headers.indexOf('target_lists') !== -1 ? headers.indexOf('target_lists') : headers.indexOf('list_names');
          if (listsIdx !== -1) {
            lines.slice(1).forEach(line => {
              const columns = [];
              let current = '';
              let inQuotes = false;
              for (let i = 0; i < line.length; i++) {
                const char = line[i];
                if (char === '"') inQuotes = !inQuotes;
                else if (char === ',' && !inQuotes) {
                  columns.push(current.trim().replace(/^["']|["']$/g, ''));
                  current = '';
                } else {
                  current += char;
                }
              }
              columns.push(current.trim().replace(/^["']|["']$/g, ''));
              const listCell = columns[listsIdx];
              if (listCell) {
                listCell.split(';').map(s => s.trim()).filter(Boolean).forEach(name => {
                  parsedTargetLists.push(name);
                });
              }
            });
            parsedTargetLists = Array.from(new Set(parsedTargetLists));
          }
        }
      }

      // Check which parsed lists do not exist in lists state
      const missingLists = parsedTargetLists.filter(name => 
        name.toLowerCase() !== 'none' && 
        !lists.some(l => l.name.toLowerCase() === name.toLowerCase())
      );

      let finalSelectedListIds = [...selectedListIds];

      if (missingLists.length > 0) {
        setLoading(false); // Stop loader to show confirm modal
        const confirmCreate = await confirm({
          title: 'Missing Target Lists Found (Task 4)',
          message: `The import file references target lists that do not exist: [${missingLists.join(', ')}]. Would you like to automatically create them?`,
          confirmText: 'Create Lists & Continue',
          type: 'warning'
        });

        if (confirmCreate) {
          setLoading(true);
          const newCreatedIds = [];
          for (const listName of missingLists) {
            const createRes = await axios.post('http://localhost:5000/api/lists', {
              name: listName,
              description: 'Created during bulk import',
              admin_id: currentUserRole === 'Super Admin' ? null : currentUser.id
            }, { headers: { 'x-user-role': currentUserRole } });
            if (createRes.data && createRes.data.id) {
              newCreatedIds.push(createRes.data.id);
            }
          }
          await fetchLists();
          finalSelectedListIds = Array.from(new Set([...finalSelectedListIds, ...newCreatedIds]));
        } else {
          return;
        }
      }

      const res = await axios.post('http://localhost:5000/api/bulk-import/parse', {
        emailsRaw,
        originSite: originSite.trim()
      });

      const { newContacts, conflicts } = res.data;

      if (conflicts.length > 0) {
        setConflictData({
          newContacts,
          conflicts,
          originSite: originSite.trim(),
          resolvedListIds: finalSelectedListIds
        });
        setShowResolver(true);
      } else {
        const contactsToImport = newContacts.map(c => ({
          email: c.email,
          name: '',
          conflictAction: null
        }));
        await executeImport(contactsToImport, finalSelectedListIds);
      }
    } catch (err) {
      console.error(err);
      error(err.response?.data?.error || 'Failed to parse contacts.');
    } finally {
      setLoading(false);
    }
  };

  const executeImport = async (contacts, importListIds = selectedListIds) => {
    try {
      setLoading(true);
      const res = await axios.post('http://localhost:5000/api/bulk-import/confirm', {
        originSite: originSite.trim(),
        importType: fileName ? (fileName.endsWith('.json') ? 'json' : 'csv') : 'manual',
        filename: fileName || 'Direct Text Input',
        listIds: importListIds,
        adminId: currentUserRole === 'Super Admin'
          ? (targetAdminId !== '' && targetAdminId !== null && targetAdminId !== undefined ? Number(targetAdminId) : null)
          : currentUser.id,
        contacts
      });

      const alreadyExisting = res.data?.alreadyExistingEmails || [];
      const importedCount = res.data?.importedCount ?? contacts.length;

      setEmailsRaw('');
      setFileName('');

      if (alreadyExisting.length > 0) {
        customAlert({
          title: 'Duplicate Email Addresses Found',
          message: `Import Summary:\n\n• ${importedCount} new contact(s) imported.\n\nThe following ${alreadyExisting.length} Email ID(s) are already added in the database and were NOT re-added as duplicate contacts:\n\n• ${alreadyExisting.join('\n• ')}`,
          type: 'warning'
        });
      } else {
        success(`Successfully imported ${importedCount} contacts!`);
      }
    } catch (err) {
      console.error(err);
      error('Failed to confirm and import contacts.');
    } finally {
      setLoading(false);
      setShowResolver(false);
      setConflictData(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Top Title Block */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
          <Upload className="text-primary-600" size={24} /> Import Data Center
        </h2>
        <p className="text-gray-500 mt-1 text-sm">
          Import contacts directory or load target list config definitions into the database using CSV or JSON formats.
        </p>
      </div>

      {/* Tabs Control */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('directory')}
          className={`px-6 py-3.5 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'directory'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Users size={16} /> Import Directory (Contacts)
        </button>
        <button
          onClick={() => setActiveTab('lists')}
          className={`px-6 py-3.5 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'lists'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <List size={16} /> Import Target Lists Configuration
        </button>
      </div>

      {/* Tab Content 1: Directory Import */}
      {activeTab === 'directory' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Form Panel */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
            <form onSubmit={handleParse} className="space-y-6">
              
              {/* Origin Site Selector */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <Globe size={16} className="text-primary-500" />
                  Origin Site / Domain / Group *
                </label>
                <input 
                  type="text"
                  required
                  value={originSite}
                  onChange={e => setOriginSite(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm transition-shadow"
                  placeholder="e.g. site1.com, newsletter-list"
                />
                <p className="text-xs text-gray-400 mt-1.5">
                  Helps differentiate contacts imported from different sources or website plan domains.
                </p>
              </div>

              {/* Assign to Subscriber/User Profile (Admin only) */}
              {currentUserRole === 'Super Admin' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                    <Users size={16} className="text-primary-500" />
                    Assign to Subscriber/User Profile
                  </label>
                  <select
                    value={targetAdminId}
                    onChange={e => setTargetAdminId(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm bg-white"
                  >
                    <option value="">Unassigned</option>
                    <option value="0">Global</option>
                    {adminUsers.map(u => (
                      <option key={u.id} value={u.id}>{u.email}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-1.5">
                    Assigning this batch to a specific admin or user profile restricts view/edit rights to them.
                  </p>
                </div>
              )}

              {/* Selection & Drag Drop Area */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                  <FileText size={16} className="text-primary-500" />
                  Import Source (CSV, JSON, TXT File or Raw Emails) *
                </label>
                
                {!fileName ? (
                  <div 
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors ${
                      isDragActive ? 'border-primary-500 bg-primary-50/30' : 'border-gray-300 hover:border-primary-400 bg-gray-50/50'
                    }`}
                    onClick={() => document.getElementById('file-upload').click()}
                  >
                    <Upload size={32} className="text-gray-400 mb-3" />
                    <span className="text-sm font-medium text-gray-700">Drag & Drop file here or Click to select</span>
                    <span className="text-xs text-gray-400 mt-1">Supports CSV, JSON, TXT files</span>
                    <input 
                      id="file-upload"
                      type="file"
                      accept=".csv,.txt,.json"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-4 bg-primary-50/30 border border-primary-200 rounded-xl">
                    <div className="flex items-center gap-2.5">
                      <FileText size={20} className="text-primary-600" />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{fileName}</p>
                        <p className="text-xs text-gray-400">File loaded successfully</p>
                      </div>
                    </div>
                    <button 
                      type="button" 
                      onClick={clearFile}
                      className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                    >
                      <Trash size={18} />
                    </button>
                  </div>
                )}

                {/* Comma-separated Text Box */}
                {!fileName && (
                  <div className="mt-4">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">Or enter emails manually</span>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3.5 text-gray-400" size={16} />
                      <textarea 
                        value={emailsRaw}
                        onChange={e => setEmailsRaw(e.target.value)}
                        rows={4}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm transition-shadow resize-none"
                        placeholder="user1@example.com, user2@domain.com&#10;user3@other.com..."
                      />
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 rounded-xl transition shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? 'Processing...' : <><CheckCircle size={18} /> Parse & Import</>}
              </button>
            </form>
          </div>

          {/* Right Info Panel */}
          <div className="space-y-6">
            {/* Target List Selection */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                <List size={16} className="text-primary-500" />
                Target Lists
              </h3>
              <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1 bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                {lists.map(list => (
                  <label key={list.id} className="flex items-center space-x-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-100/80 p-1.5 rounded-lg transition-colors">
                    <input 
                      type="checkbox" 
                      checked={selectedListIds.includes(list.id)}
                      onChange={() => {
                        setSelectedListIds(prev => 
                          prev.includes(list.id) ? prev.filter(id => id !== list.id) : [...prev, list.id]
                        );
                      }}
                      className="rounded text-primary-600 focus:ring-primary-500 w-4 h-4"
                    />
                    <span className="font-medium truncate">{list.name}</span>
                  </label>
                ))}
                {lists.length === 0 && (
                  <p className="text-xs text-gray-400">No lists available. Please create a list first.</p>
                )}
              </div>
            </div>

            {/* Guidelines */}
            <div className="bg-amber-50/40 border border-amber-200/60 p-5 rounded-2xl space-y-3">
              <h3 className="text-sm font-bold text-amber-800 flex items-center gap-1.5">
                <AlertTriangle size={16} />
                Import Instructions
              </h3>
              <ul className="text-xs text-amber-700 space-y-2 list-disc pl-4 leading-relaxed">
                <li>Upload a CSV or JSON/TXT file containing a clean list of email addresses.</li>
                <li>Or type email addresses separated by commas or newlines.</li>
                <li>Entering an **Origin Site** tags the contacts. Same email IDs can exist under different sites without conflict.</li>
                <li>If conflicts are found, you will be prompted to Merge or Keep them Separate.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content 2: Lists Config Import */}
      {activeTab === 'lists' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left panel: Upload file */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6 self-start">
            <h3 className="text-md font-bold text-gray-900 flex items-center gap-1.5 border-b border-gray-100 pb-3">
              <Upload size={18} className="text-primary-500" /> Upload Configuration File
            </h3>

            <div className="space-y-4">
              {!listConfigFile ? (
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDragActive(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleListConfigFile(e.dataTransfer.files[0]);
                    }
                  }}
                  className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors ${
                    isDragActive ? 'border-primary-500 bg-primary-50/30' : 'border-gray-300 hover:border-primary-400 bg-gray-50/50'
                  }`}
                  onClick={() => document.getElementById('list-config-upload').click()}
                >
                  <Upload size={32} className="text-gray-400 mb-3" />
                  <span className="text-sm font-medium text-gray-700">Drag & Drop file here or Click</span>
                  <span className="text-xs text-gray-400 mt-1">Supports CSV, JSON files</span>
                  <input
                    id="list-config-upload"
                    type="file"
                    accept=".csv,.json"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleListConfigFile(e.target.files[0]);
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="flex items-center justify-between p-4 bg-primary-50/30 border border-primary-200 rounded-xl">
                  <div className="flex items-center gap-2.5">
                    <FileText size={20} className="text-primary-600" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{listConfigFile}</p>
                      <p className="text-xs text-gray-400">Configuration loaded</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setListConfigFile('');
                      setListConfigRaw('');
                      setParsedListsToImport([]);
                      setSelectedListImportIndices([]);
                    }}
                    className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                  >
                    <Trash size={18} />
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={handleImportListsSubmit}
              disabled={importingLists || parsedListsToImport.length === 0 || selectedListImportIndices.length === 0}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-2.5 rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2 text-xs"
            >
              {importingLists ? 'Importing...' : <><CheckCircle size={15} /> Import Selected ({selectedListImportIndices.length} Lists)</>}
            </button>
          </div>

          {/* Right panel: Preview List Table */}
          <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[480px]">
            <div className="p-4 border-b border-gray-100 bg-gray-50/40 flex justify-between items-center">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <List size={16} className="text-gray-400" /> Configuration Preview
              </h3>
              {parsedListsToImport.length > 0 && (
                <label className="flex items-center gap-1.5 text-xs font-bold text-primary-600 hover:text-primary-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={parsedListsToImport.length > 0 && selectedListImportIndices.length === parsedListsToImport.length}
                    onChange={() => {
                      const allSelected = parsedListsToImport.length > 0 && selectedListImportIndices.length === parsedListsToImport.length;
                      if (allSelected) {
                        setSelectedListImportIndices([]);
                      } else {
                        setSelectedListImportIndices(parsedListsToImport.map(p => p.index));
                      }
                    }}
                    className="rounded text-primary-600 focus:ring-primary-500 w-4 h-4 cursor-pointer"
                  />
                  <span>Select All</span>
                </label>
              )}
            </div>

            <div className="overflow-y-auto flex-1 max-h-[500px]">
              <table className="w-full text-left text-xs text-gray-600">
                <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-200 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 w-10">Select</th>
                    <th className="px-4 py-3">List Name</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3">Associated Owner</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {parsedListsToImport.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-4 py-12 text-center text-gray-400 font-semibold animate-pulse">
                        No configurations loaded. Upload a JSON or CSV file to preview list targets.
                      </td>
                    </tr>
                  ) : (
                    parsedListsToImport.map(item => {
                      const adminOwner = adminUsers.find(u => Number(u.id) === Number(item.admin_id));
                      let ownerLabel = '-';
                      if (currentUserRole !== 'Super Admin') {
                        ownerLabel = 'self';
                      } else if (Number(item.admin_id) === 0) {
                        ownerLabel = 'Global';
                      } else if (adminOwner) {
                        ownerLabel = adminOwner.email;
                      }

                      return (
                        <tr key={item.index} className="hover:bg-gray-50/50">
                          <td className="px-4 py-2">
                            <input
                              type="checkbox"
                              checked={selectedListImportIndices.includes(item.index)}
                              onChange={() => {
                                setSelectedListImportIndices(prev =>
                                  prev.includes(item.index) ? prev.filter(i => i !== item.index) : [...prev, item.index]
                                );
                              }}
                              className="rounded text-primary-600 focus:ring-primary-500 w-4 h-4 cursor-pointer"
                            />
                          </td>
                          <td className="px-4 py-2 font-bold text-gray-900">{item.name}</td>
                          <td className="px-4 py-2">{item.description || '-'}</td>
                          <td className="px-4 py-2 font-medium text-gray-500">{ownerLabel}</td>
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

      {showResolver && conflictData && (
        <ConflictResolverModal 
          conflictData={conflictData}
          onClose={() => setShowResolver(false)}
          onConfirm={(contacts) => executeImport(contacts, conflictData.resolvedListIds)}
        />
      )}
    </div>
  );
}
