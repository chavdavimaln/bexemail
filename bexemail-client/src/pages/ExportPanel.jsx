import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Download, Filter, Search, Tag, Users, CheckSquare, Square, Layers, ShieldCheck, Mail } from 'lucide-react';
import { useModal } from '../context/ModalContext';

export default function ExportPanel() {
  const { alert: customAlert } = useModal();
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const currentUserRole = currentUser.role;

  const [activeTab, setActiveTab] = useState('contacts');
  const [subscribers, setSubscribers] = useState([]);
  const [lists, setLists] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);

  // Contacts Export State
  const [contactsSearch, setContactsSearch] = useState('');
  const [contactsStatus, setContactsStatus] = useState('all');
  const [contactsList, setContactsList] = useState('all');
  const [selectedContactIds, setSelectedContactIds] = useState([]);
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [contactsFormat, setContactsFormat] = useState('csv');

  // Lists Export State
  const [listsSearch, setListsSearch] = useState('');
  const [listsAdminFilter, setListsAdminFilter] = useState('all');
  const [selectedListIds, setSelectedListIds] = useState([]);
  const [listsFormat, setListsFormat] = useState('csv');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [subsRes, listsRes, adminsRes] = await Promise.all([
        axios.get('http://localhost:5000/api/bulk-import/subscribers'),
        axios.get('http://localhost:5000/api/lists'),
        axios.get('http://localhost:5000/api/admins').catch(() => ({ data: [] }))
      ]);

      let fetchedSubs = subsRes.data.data || (Array.isArray(subsRes.data) ? subsRes.data : []);
      let fetchedLists = Array.isArray(listsRes.data) ? listsRes.data : [];

      setSubscribers(fetchedSubs);
      setLists(fetchedLists);
      setAdmins(adminsRes.data || []);
      
      setSelectedContactIds(fetchedSubs.map(s => s.id));
      setSelectedListIds(fetchedLists.map(l => l.id));
    } catch (err) {
      console.error(err);
      customAlert({ title: 'Error', message: 'Failed to load data for export', type: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  const getSubListIds = (sub) => {
    if (!sub) return [];
    if (sub.all_lists && Array.isArray(sub.all_lists) && sub.all_lists.length > 0) {
      return sub.all_lists.map(l => Number(l.id || l.list_id)).filter(Boolean);
    }
    if (sub.list_ids) {
      return String(sub.list_ids).split(',').map(Number).filter(Boolean);
    }
    return [];
  };

  const filteredContacts = subscribers.filter(sub => {
    const matchesSearch = (sub.email || '').toLowerCase().includes(contactsSearch.toLowerCase()) ||
                          (sub.first_name || '').toLowerCase().includes(contactsSearch.toLowerCase());
    const matchesStatus = contactsStatus === 'all' || sub.status === contactsStatus;
    
    let matchesList = true;
    if (contactsList !== 'all') {
      const listId = Number(contactsList);
      matchesList = getSubListIds(sub).includes(listId);
    }
    return matchesSearch && matchesStatus && matchesList;
  });

  const filteredLists = lists.filter(list => {
    const matchesSearch = (list.name || '').toLowerCase().includes(listsSearch.toLowerCase()) ||
                          (list.description || '').toLowerCase().includes(listsSearch.toLowerCase());
    
    let matchesAdmin = true;
    if (listsAdminFilter !== 'all') {
      if (listsAdminFilter === 'unassigned') {
        matchesAdmin = list.admin_id === null || list.admin_id === undefined;
      } else if (listsAdminFilter === 'global') {
        matchesAdmin = Number(list.admin_id) === 0;
      } else {
        matchesAdmin = Number(list.admin_id) === Number(listsAdminFilter);
      }
    }
    return matchesSearch && matchesAdmin;
  });

  const toggleSelectAllContacts = () => {
    if (selectedContactIds.length === filteredContacts.length) {
      setSelectedContactIds([]);
    } else {
      setSelectedContactIds(filteredContacts.map(c => c.id));
    }
  };

  const toggleContactSelection = (id) => {
    setSelectedContactIds(prev =>
      prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
    );
  };

  const toggleSelectAllLists = () => {
    if (selectedListIds.length === filteredLists.length) {
      setSelectedListIds([]);
    } else {
      setSelectedListIds(filteredLists.map(l => l.id));
    }
  };

  const toggleListSelection = (id) => {
    setSelectedListIds(prev =>
      prev.includes(id) ? prev.filter(lId => lId !== id) : [...prev, id]
    );
  };

  const exportContacts = () => {
    const selectedContacts = subscribers.filter(c => selectedContactIds.includes(c.id));
    if (selectedContacts.length === 0) {
      customAlert({ title: 'Validation Error', message: 'Please select at least one contact to export.', type: 'warning' });
      return;
    }

    const dataToExport = selectedContacts.map(c => {
      const record = {
        id: c.id,
        email: c.email,
        name: c.first_name || '',
        status: c.status
      };
      if (includeMetadata) {
        let listNames = '';
        if (c.all_lists && Array.isArray(c.all_lists)) {
          listNames = c.all_lists.map(l => l.name).join('; ');
        } else if (c.list_names) {
          listNames = c.list_names;
        }
        record.target_lists = listNames || 'None';
      }
      return record;
    });

    if (contactsFormat === 'json') {
      downloadFile(JSON.stringify(dataToExport, null, 2), `contacts_export_${Date.now()}.json`, 'application/json');
    } else {
      const headers = ['id', 'email', 'name', 'status'];
      if (includeMetadata) headers.push('target_lists');

      const csvRows = [headers.join(',')];
      for (const row of dataToExport) {
        const values = headers.map(header => {
          const val = row[header];
          return `"${String(val).replace(/"/g, '""')}"`;
        });
        csvRows.push(values.join(','));
      }
      downloadFile(csvRows.join('\n'), `contacts_export_${Date.now()}.csv`, 'text/csv');
    }
  };

  const exportLists = () => {
    const selectedLists = lists.filter(l => selectedListIds.includes(l.id));
    if (selectedLists.length === 0) {
      customAlert({ title: 'Validation Error', message: 'Please select at least one target list to export.', type: 'warning' });
      return;
    }

    const dataToExport = selectedLists.map(l => {
      const adminOwner = admins.find(u => Number(u.id) === Number(l.admin_id));
      let createdBy = 'System';
      if (Number(l.admin_id) === Number(currentUser.id)) {
        createdBy = 'self';
      } else if (adminOwner) {
        createdBy = `${adminOwner.username} (${adminOwner.email})`;
      } else if (l.admin_email) {
        createdBy = l.admin_email;
      }
      
      return {
        id: l.id,
        name: l.name,
        description: l.description || '',
        associated_admin_id: l.admin_id || 0,
        created_by: createdBy
      };
    });

    if (listsFormat === 'json') {
      downloadFile(JSON.stringify(dataToExport, null, 2), `target_lists_export_${Date.now()}.json`, 'application/json');
    } else {
      const headers = ['id', 'name', 'description', 'associated_admin_id', 'created_by'];
      const csvRows = [headers.join(',')];
      for (const row of dataToExport) {
        const values = headers.map(header => `"${String(row[header]).replace(/"/g, '""')}"`);
        csvRows.push(values.join(','));
      }
      downloadFile(csvRows.join('\n'), `target_lists_export_${Date.now()}.csv`, 'text/csv');
    }
  };

  const downloadFile = (content, filename, contentType) => {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
          <Download className="text-primary-600" size={24} /> Export Data Center
        </h2>
        <p className="text-gray-500 mt-1 text-sm">
          Selectively export subscribers, target list configurations, and membership mappings to CSV or JSON formats.
        </p>
      </div>

      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('contacts')}
          className={`px-6 py-3.5 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'contacts'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Users size={16} /> Export Subscribers Directory
        </button>
        <button
          onClick={() => setActiveTab('lists')}
          className={`px-6 py-3.5 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'lists'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Layers size={16} /> Export Target Lists Configuration
        </button>
      </div>

      {activeTab === 'contacts' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6 self-start">
            <h3 className="text-md font-bold text-gray-900 flex items-center gap-1.5 border-b border-gray-100 pb-3">
              <Filter size={16} className="text-primary-500" /> Export Filter Parameters
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Live Search (Name/Email)</label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={contactsSearch}
                    onChange={e => setContactsSearch(e.target.value)}
                    placeholder="Search query..."
                    className="w-full pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Filter by Status</label>
                <select
                  value={contactsStatus}
                  onChange={e => setContactsStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary-500 font-semibold text-gray-700"
                >
                  <option value="all">All Statuses</option>
                  <option value="subscribed">Subscribed</option>
                  <option value="unsubscribed">Unsubscribed</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Filter by Target List</label>
                <select
                  value={contactsList}
                  onChange={e => setContactsList(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary-500 font-semibold text-gray-700"
                >
                  <option value="all">All Target Lists</option>
                  {lists.map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer pt-2">
                <input
                  type="checkbox"
                  checked={includeMetadata}
                  onChange={() => setIncludeMetadata(!includeMetadata)}
                  className="rounded text-primary-600 focus:ring-primary-500 w-4 h-4"
                />
                <span>Include Target Lists Metadata (Task 3)</span>
              </label>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Format Choice</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-1.5 text-xs text-gray-700 font-semibold cursor-pointer">
                    <input type="radio" checked={contactsFormat === 'csv'} onChange={() => setContactsFormat('csv')} className="text-primary-600 focus:ring-primary-500" />
                    <span>CSV Format</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-gray-700 font-semibold cursor-pointer">
                    <input type="radio" checked={contactsFormat === 'json'} onChange={() => setContactsFormat('json')} className="text-primary-600 focus:ring-primary-500" />
                    <span>JSON Format</span>
                  </label>
                </div>
              </div>
            </div>

            <button
              onClick={exportContacts}
              disabled={loading || selectedContactIds.length === 0}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-2.5 rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2 text-xs mt-6"
            >
              <Download size={15} /> Export Selected ({selectedContactIds.length} Contacts)
            </button>
          </div>

          <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[480px]">
            <div className="p-4 border-b border-gray-100 bg-gray-50/40 flex justify-between items-center">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Users size={16} className="text-gray-400" /> Directory Checklist
              </h3>
              <label className="flex items-center gap-1.5 text-xs font-bold text-primary-600 hover:text-primary-700 cursor-pointer">
                <input 
                  type="checkbox"
                  checked={filteredContacts.length > 0 && selectedContactIds.length === filteredContacts.length}
                  onChange={toggleSelectAllContacts}
                  className="rounded text-primary-600 focus:ring-primary-500 w-4 h-4 cursor-pointer"
                />
                <span>Select All</span>
              </label>
            </div>
            
            <div className="overflow-y-auto flex-1 max-h-[500px]">
              <table className="w-full text-left text-xs text-gray-600">
                <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-200 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 w-10">Select</th>
                    <th className="px-4 py-3">Email Address</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan="4" className="px-4 py-12 text-center text-gray-400">Loading directory...</td>
                    </tr>
                  ) : filteredContacts.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-4 py-12 text-center text-gray-400">No contacts match filter settings.</td>
                    </tr>
                  ) : (
                    filteredContacts.map(c => (
                      <tr key={c.id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-2">
                          <button
                            type="button"
                            onClick={() => toggleContactSelection(c.id)}
                            className="text-gray-400 hover:text-primary-600"
                          >
                            {selectedContactIds.includes(c.id) ? (
                              <CheckSquare size={16} className="text-primary-600" />
                            ) : (
                              <Square size={16} />
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-2 font-bold text-gray-900">{c.email}</td>
                        <td className="px-4 py-2">{c.first_name || '-'}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${c.status === 'subscribed' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                            {c.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {activeTab === 'lists' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6 self-start">
            <h3 className="text-md font-bold text-gray-900 flex items-center gap-1.5 border-b border-gray-100 pb-3">
              <Filter size={16} className="text-primary-500" /> Export Filter Parameters
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Live Search (Name/Desc)</label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={listsSearch}
                    onChange={e => setListsSearch(e.target.value)}
                    placeholder="Search target lists..."
                    className="w-full pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              {currentUserRole === 'Super Admin' && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Filter by Assigned Admin (Task 5)</label>
                  <select
                    value={listsAdminFilter}
                    onChange={e => setListsAdminFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary-500 font-semibold text-gray-700"
                  >
                    <option value="all">All Owners</option>
                    <option value="unassigned">Unassigned</option>
                    <option value="global">Global (0)</option>
                    {admins.map(a => (
                      <option key={a.id} value={a.id}>{a.email}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Format Choice</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-1.5 text-xs text-gray-700 font-semibold cursor-pointer">
                    <input type="radio" checked={listsFormat === 'csv'} onChange={() => setListsFormat('csv')} className="text-primary-600 focus:ring-primary-500" />
                    <span>CSV Format</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-gray-700 font-semibold cursor-pointer">
                    <input type="radio" checked={listsFormat === 'json'} onChange={() => setListsFormat('json')} className="text-primary-600 focus:ring-primary-500" />
                    <span>JSON Format</span>
                  </label>
                </div>
              </div>
            </div>

            <button
              onClick={exportLists}
              disabled={loading || selectedListIds.length === 0}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-2.5 rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2 text-xs mt-6"
            >
              <Download size={15} /> Export Selected ({selectedListIds.length} Target Lists)
            </button>
          </div>

          <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[480px]">
            <div className="p-4 border-b border-gray-100 bg-gray-50/40 flex justify-between items-center">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Layers size={16} className="text-gray-400" /> Target Lists Checklist
              </h3>
              <label className="flex items-center gap-1.5 text-xs font-bold text-primary-600 hover:text-primary-700 cursor-pointer">
                <input 
                  type="checkbox"
                  checked={filteredLists.length > 0 && selectedListIds.length === filteredLists.length}
                  onChange={toggleSelectAllLists}
                  className="rounded text-primary-600 focus:ring-primary-500 w-4 h-4 cursor-pointer"
                />
                <span>Select All</span>
              </label>
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
                  {loading ? (
                    <tr>
                      <td colSpan="4" className="px-4 py-12 text-center text-gray-400">Loading lists...</td>
                    </tr>
                  ) : filteredLists.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-4 py-12 text-center text-gray-400">No target lists match filter settings.</td>
                    </tr>
                  ) : (
                    filteredLists.map(l => {
                      const adminOwner = admins.find(u => Number(u.id) === Number(l.admin_id));
                      let ownerLabel = '-';
                      if (Number(l.admin_id) === 0) ownerLabel = 'Global';
                      else if (Number(l.admin_id) === Number(currentUser.id)) ownerLabel = 'self';
                      else if (adminOwner) ownerLabel = adminOwner.email;
                      else if (l.admin_email) ownerLabel = l.admin_email;

                      return (
                        <tr key={l.id} className="hover:bg-gray-50/50">
                          <td className="px-4 py-2">
                            <button
                              type="button"
                              onClick={() => toggleListSelection(l.id)}
                              className="text-gray-400 hover:text-primary-600"
                            >
                              {selectedListIds.includes(l.id) ? (
                                <CheckSquare size={16} className="text-primary-600" />
                              ) : (
                                <Square size={16} />
                              )}
                            </button>
                          </td>
                          <td className="px-4 py-2 font-bold text-gray-900">{l.name}</td>
                          <td className="px-4 py-2">{l.description || '-'}</td>
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

    </div>
  );
}
