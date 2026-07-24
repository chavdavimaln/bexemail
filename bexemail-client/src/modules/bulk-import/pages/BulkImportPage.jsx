import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Upload, Mail, Globe, List, CheckCircle, AlertTriangle, FileText, Trash } from 'lucide-react';
import { useNotification } from '../../../components/NotificationContext';
import ConflictResolverModal from '../components/ConflictResolverModal';

export default function BulkImportPage() {
  const { success, error, warning } = useNotification();
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [originSite, setOriginSite] = useState('');
  const [selectedListIds, setSelectedListIds] = useState([]);
  const [emailsRaw, setEmailsRaw] = useState('');
  const [fileName, setFileName] = useState('');
  const [isDragActive, setIsDragActive] = useState(false);

  // Conflict Resolution State
  const [conflictData, setConflictData] = useState(null); // { newContacts, conflicts, originSite }
  const [showResolver, setShowResolver] = useState(false);

  useEffect(() => {
    fetchLists();
    // Pre-populate with current origin
    setOriginSite(window.location.hostname || 'domain1.com');
  }, []);

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
    const validTypes = ['text/plain', 'text/csv', 'application/vnd.ms-excel'];
    if (!validTypes.includes(file.type) && !file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      warning('Please upload a valid CSV or TXT file.');
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
      const res = await axios.post('http://localhost:5000/api/bulk-import/parse', {
        emailsRaw,
        originSite: originSite.trim()
      });

      const { newContacts, conflicts } = res.data;

      if (conflicts.length > 0) {
        setConflictData({
          newContacts,
          conflicts,
          originSite: originSite.trim()
        });
        setShowResolver(true);
      } else {
        // No conflicts, import directly
        const contactsToImport = newContacts.map(c => ({
          email: c.email,
          name: '',
          conflictAction: null
        }));
        await executeImport(contactsToImport);
      }
    } catch (err) {
      console.error(err);
      error(err.response?.data?.error || 'Failed to parse contacts.');
    } finally {
      setLoading(false);
    }
  };

  const executeImport = async (contacts) => {
    try {
      setLoading(true);
      await axios.post('http://localhost:5000/api/bulk-import/confirm', {
        originSite: originSite.trim(),
        importType: fileName ? 'csv' : 'manual',
        filename: fileName || 'Direct Text Input',
        listIds: selectedListIds,
        contacts
      });

      success(`Successfully imported ${contacts.length} contacts!`);
      // Reset form
      setEmailsRaw('');
      setFileName('');
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
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Bulk Import Contacts</h2>
        <p className="text-gray-500 mt-1 text-sm">
          Import contacts with origin site segregation and automated conflict resolution.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Form Panel */}
        <div className="md:col-span-2 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
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

            {/* Selection & Drag Drop Area */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                <FileText size={16} className="text-primary-500" />
                Import Source (CSV/TXT File or Raw Emails) *
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
                  <span className="text-xs text-gray-400 mt-1">Supports CSV, TXT files</span>
                  <input 
                    id="file-upload"
                    type="file"
                    accept=".csv,.txt"
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
        <div className="md:col-span-1 space-y-6">
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
              <li>Upload a CSV or TXT file containing a clean list of email addresses.</li>
              <li>Or simply type/paste email addresses separated by commas or newlines.</li>
              <li>Entering an **Origin Site** tags the contacts. Same email IDs can exist under different sites without conflict.</li>
              <li>If conflicts are found, you will be prompted to Merge or Keep them Separate.</li>
            </ul>
          </div>
        </div>
      </div>

      {showResolver && conflictData && (
        <ConflictResolverModal 
          conflictData={conflictData}
          onClose={() => setShowResolver(false)}
          onConfirm={executeImport}
        />
      )}
    </div>
  );
}
