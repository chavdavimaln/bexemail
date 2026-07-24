import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Users, Plus, Mail, User, Edit2, Trash2, List as ListIcon, Check, X, Upload, Settings2, Search, Tag, RefreshCw, Layers, CheckSquare, Square, FolderPlus } from 'lucide-react';
import { useModal } from '../context/ModalContext';

const Contacts = () => {
  const { confirm, alert: customAlert } = useModal();
  const [subscribers, setSubscribers] = useState([]);
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);

  // Main Page View Mode
  const [viewMode, setViewMode] = useState('directory'); // 'directory', 'list_manager', 'bulk_import'
  
  // Directory Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [listFilter, setListFilter] = useState('all');

  // Single Add State
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [selectedListIds, setSelectedListIds] = useState([]);
  const [adding, setAdding] = useState(false);

  // Bulk Add State
  const [activeAddTab, setActiveAddTab] = useState('single'); // 'single' or 'bulk'
  const [bulkEmails, setBulkEmails] = useState('');
  
  // Inline Edit State
  const [editingId, setEditingId] = useState(null);
  const [editEmail, setEditEmail] = useState('');
  const [editName, setEditName] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editListIds, setEditListIds] = useState([]);

  // Quick List Assign Popover State (row sub ID)
  const [quickAssignSubId, setQuickAssignSubId] = useState(null);
  const [quickAssignListIds, setQuickAssignListIds] = useState([]);
  const [savingQuickAssign, setSavingQuickAssign] = useState(false);

  // Target List Manager State (Tab 2)
  const [selectedTargetListId, setSelectedTargetListId] = useState(null);
  const [newListName, setNewListName] = useState('');
  const [newListDesc, setNewListDesc] = useState('');
  const [showCreateListModal, setShowCreateListModal] = useState(false);
  const [creatingList, setCreatingList] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [subsRes, listsRes] = await Promise.all([
        axios.get('http://localhost:5000/api/bulk-import/subscribers'),
        axios.get('http://localhost:5000/api/lists')
      ]);
      const fetchedSubs = subsRes.data.data || [];
      const fetchedLists = listsRes.data || [];
      
      setSubscribers(fetchedSubs);
      setLists(fetchedLists);

      if (fetchedLists.length > 0) {
        if (selectedListIds.length === 0) setSelectedListIds([fetchedLists[0].id]);
        if (!selectedTargetListId) setSelectedTargetListId(fetchedLists[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddContact = async (e) => {
    e.preventDefault();
    if (!newEmail || selectedListIds.length === 0) {
      customAlert({
        title: 'Validation Error',
        message: 'Please enter an email address and select at least one target list.',
        type: 'warning'
      });
      return;
    }

    try {
      setAdding(true);
      await axios.post('http://localhost:5000/api/bulk-import/confirm', {
        originSite: window.location.hostname || 'localhost',
        importType: 'manual',
        filename: 'Single Add',
        listIds: selectedListIds.map(Number),
        contacts: [{
          email: newEmail.trim(),
          name: newName.trim(),
          conflictAction: 'merge'
        }]
      });

      setNewEmail('');
      setNewName('');
      await fetchData(); 
      customAlert({
        title: 'Success',
        message: 'Contact and target lists assigned successfully!',
        type: 'success'
      });
    } catch (error) {
      console.error(error);
      customAlert({
        title: 'Error',
        message: error.response?.data?.error || 'Failed to add contact.',
        type: 'danger'
      });
    } finally {
      setAdding(false);
    }
  };

  const handleBulkAdd = async (e) => {
    e.preventDefault();
    if (!bulkEmails.trim() || selectedListIds.length === 0) {
      customAlert({
        title: 'Validation Error',
        message: 'Please enter emails and select at least one list.',
        type: 'warning'
      });
      return;
    }

    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emails = Array.from(new Set((bulkEmails || '').match(emailRegex) || [])).map(e => e.toLowerCase().trim());

    if (emails.length === 0) {
      customAlert({
        title: 'Validation Error',
        message: 'No valid email addresses found.',
        type: 'warning'
      });
      return;
    }

    try {
      setAdding(true);
      const contactsToImport = emails.map(e => ({
        email: e,
        name: '',
        conflictAction: 'merge'
      }));

      await axios.post('http://localhost:5000/api/bulk-import/confirm', {
        originSite: window.location.hostname || 'Directory',
        importType: 'manual',
        filename: 'Directory Bulk Add',
        listIds: selectedListIds.map(Number),
        contacts: contactsToImport
      });

      setBulkEmails('');
      await fetchData(); 
      customAlert({
        title: 'Success',
        message: `Successfully processed ${emails.length} contacts and assigned lists!`,
        type: 'success'
      });
    } catch (error) {
      console.error(error);
      customAlert({
        title: 'Error',
        message: error.response?.data?.error || 'Failed to bulk add contacts.',
        type: 'danger'
      });
    } finally {
      setAdding(false);
    }
  };

  // Robust Helper to extract assigned list IDs from a subscriber object
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

  const startEdit = (sub) => {
    setEditingId(sub.id);
    setEditEmail(sub.email);
    setEditName(sub.first_name || '');
    setEditStatus(sub.status || 'subscribed');
    setEditListIds(getSubListIds(sub));
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async (id) => {
    try {
      await axios.put(`http://localhost:5000/api/contacts/${id}/update`, {
        email: editEmail,
        first_name: editName,
        status: editStatus,
        list_ids: editListIds.map(Number)
      });
      setEditingId(null);
      await fetchData();
    } catch (error) {
      console.error('saveEdit error:', error.response?.data || error.message);
      customAlert({
        title: 'Update Failed',
        message: error.response?.data?.error || 'Failed to update contact. Please try again.',
        type: 'danger'
      });
    }
  };

  const handleDelete = async (id) => {
    const isOk = await confirm({
      title: 'Delete Contact',
      message: 'Are you sure you want to delete this contact?',
      confirmText: 'Delete Contact',
      type: 'danger'
    });
    if (!isOk) return;
    try {
      await axios.delete(`http://localhost:5000/api/subscribers/${id}`);
      fetchData();
    } catch (error) {
      customAlert({
        title: 'Error',
        message: 'Failed to delete contact.',
        type: 'danger'
      });
    }
  };

  // Quick Target List Assignment handler
  const openQuickAssign = (sub) => {
    setQuickAssignSubId(sub.id);
    setQuickAssignListIds(getSubListIds(sub));
  };

  const saveQuickAssign = async (sub) => {
    try {
      setSavingQuickAssign(true);
      await axios.put(`http://localhost:5000/api/contacts/${sub.id}/update`, {
        email: sub.email,
        first_name: sub.first_name || '',
        status: sub.status || 'subscribed',
        list_ids: quickAssignListIds.map(Number)
      });
      setQuickAssignSubId(null);
      await fetchData();
    } catch (error) {
      console.error(error);
      customAlert({
        title: 'Error',
        message: 'Failed to update target lists.',
        type: 'danger'
      });
    } finally {
      setSavingQuickAssign(false);
    }
  };

  // Toggle subscriber assignment for a specific target list in List Manager Tab
  const toggleSubscriberInTargetList = async (sub, targetListId) => {
    const targetIdNum = Number(targetListId);
    const currentListIds = getSubListIds(sub);

    const updatedListIds = currentListIds.includes(targetIdNum)
      ? currentListIds.filter(id => id !== targetIdNum)
      : [...currentListIds, targetIdNum];

    try {
      await axios.put(`http://localhost:5000/api/contacts/${sub.id}/update`, {
        email: sub.email,
        first_name: sub.first_name || '',
        status: sub.status || 'subscribed',
        list_ids: updatedListIds
      });
      await fetchData();
    } catch (error) {
      console.error(error);
      customAlert({
        title: 'Error',
        message: 'Failed to update list membership.',
        type: 'danger'
      });
    }
  };

  // Create New Target List
  const handleCreateList = async (e) => {
    e.preventDefault();
    if (!newListName.trim()) return;
    try {
      setCreatingList(true);
      const res = await axios.post('http://localhost:5000/api/lists', {
        name: newListName.trim(),
        description: newListDesc.trim()
      }, { headers: { 'x-user-role': 'Super Admin' } });

      setNewListName('');
      setNewListDesc('');
      setShowCreateListModal(false);
      await fetchData();
      if (res.data.id) {
        setSelectedTargetListId(res.data.id);
      }
      customAlert({
        title: 'Success',
        message: 'Target list created successfully!',
        type: 'success'
      });
    } catch (error) {
      console.error(error);
      customAlert({
        title: 'Error',
        message: error.response?.data?.error || 'Failed to create target list.',
        type: 'danger'
      });
    } finally {
      setCreatingList(false);
    }
  };

  // Filtering Logic for Directory
  const filteredSubscribers = subscribers.filter(sub => {
    const matchesSearch = (sub.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (sub.first_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;
    
    let matchesList = true;
    if (listFilter !== 'all') {
      const targetListId = Number(listFilter);
      const subListIds = getSubListIds(sub);
      matchesList = subListIds.includes(targetListId);
    }

    return matchesSearch && matchesStatus && matchesList;
  });

  const selectedTargetListObj = lists.find(l => Number(l.id) === Number(selectedTargetListId));

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      
      {/* Module Navigation Tabs */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('directory')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
              viewMode === 'directory' 
                ? 'bg-primary-600 text-white shadow-md shadow-primary-200' 
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Users size={16} />
            Subscribers Directory ({subscribers.length})
          </button>

          <button
            onClick={() => setViewMode('list_manager')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
              viewMode === 'list_manager' 
                ? 'bg-primary-600 text-white shadow-md shadow-primary-200' 
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Layers size={16} />
            Target List Assignment Manager
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/contacts/bulk-import"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs rounded-xl border border-blue-200 transition"
          >
            <Upload size={14} />
            Bulk Import File
          </Link>
          <button
            onClick={() => setShowCreateListModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-green-50 hover:bg-green-100 text-green-700 font-semibold text-xs rounded-xl border border-green-200 transition"
          >
            <FolderPlus size={14} />
            + New Target List
          </button>
        </div>
      </div>

      {/* VIEW MODE 1: DIRECTORY & ADD CONTACT */}
      {viewMode === 'directory' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Panel: Add Contact Card */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm lg:col-span-1 h-max overflow-hidden">
            <div className="flex border-b border-gray-100">
              <button 
                onClick={() => setActiveAddTab('single')}
                className={`flex-1 py-3.5 text-sm font-semibold transition-colors ${activeAddTab === 'single' ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50/30' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
              >
                Single Add
              </button>
              <button 
                onClick={() => setActiveAddTab('bulk')}
                className={`flex-1 py-3.5 text-sm font-semibold transition-colors ${activeAddTab === 'bulk' ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50/30' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
              >
                Quick Bulk Add
              </button>
            </div>
            
            <div className="p-6">
              {activeAddTab === 'single' ? (
                <form onSubmit={handleAddContact} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address *</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <input 
                        type="email" 
                        required
                        value={newEmail}
                        onChange={e => setNewEmail(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm transition-shadow"
                        placeholder="name@example.com"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">First Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <input 
                        type="text" 
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm transition-shadow"
                        placeholder="Optional name"
                      />
                    </div>
                  </div>

                  {/* Target Lists Selection */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-sm font-semibold text-gray-700">Assign Target Lists *</label>
                      <div className="flex gap-2 text-xs">
                        <button 
                          type="button" 
                          onClick={() => setSelectedListIds(lists.map(l => l.id))}
                          className="text-primary-600 hover:underline font-medium"
                        >
                          All
                        </button>
                        <span className="text-gray-300">|</span>
                        <button 
                          type="button" 
                          onClick={() => setSelectedListIds([])}
                          className="text-gray-500 hover:underline font-medium"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto p-2.5 border border-gray-300 rounded-xl bg-gray-50/50">
                      {lists.map(list => (
                        <label key={list.id} className="flex items-center space-x-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-100 p-1.5 rounded-lg transition-colors">
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
                          <span className="font-medium text-xs">{list.name}</span>
                        </label>
                      ))}
                      {lists.length === 0 && (
                        <p className="text-xs text-gray-400 p-1">No lists found. Please create a target list first.</p>
                      )}
                    </div>
                  </div>

                  <button 
                    type="submit"
                    disabled={adding}
                    className="w-full mt-2 bg-primary-600 text-white font-semibold py-2.5 rounded-xl hover:bg-primary-700 transition-all shadow-sm shadow-primary-200 disabled:opacity-50 flex justify-center items-center gap-2"
                  >
                    {adding ? 'Saving...' : <><Plus size={16} /> Add Contact & Assign Lists</>}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleBulkAdd} className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-sm font-semibold text-gray-700">Email Addresses *</label>
                      <Link to="/contacts/bulk-import" className="text-xs text-primary-600 hover:underline font-semibold">
                        Drag & Drop CSV/TXT &rarr;
                      </Link>
                    </div>
                    <textarea 
                      required
                      rows="5"
                      value={bulkEmails}
                      onChange={e => setBulkEmails(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-xs transition-shadow resize-none"
                      placeholder="user1@example.com, user2@gmail.com&#10;user3@domain.com..."
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-sm font-semibold text-gray-700">Assign Target Lists *</label>
                    </div>
                    <div className="space-y-1.5 max-h-32 overflow-y-auto p-2.5 border border-gray-300 rounded-xl bg-gray-50/50">
                      {lists.map(list => (
                        <label key={list.id} className="flex items-center space-x-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-100 p-1 rounded-lg transition-colors">
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
                          <span className="font-medium text-xs">{list.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <button 
                    type="submit"
                    disabled={adding}
                    className="w-full mt-2 bg-primary-600 text-white font-semibold py-2.5 rounded-xl hover:bg-primary-700 transition-all shadow-sm shadow-primary-200 disabled:opacity-50 flex justify-center items-center gap-2"
                  >
                    {adding ? 'Importing...' : <><Upload size={16} /> Import Contacts</>}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Right Panel: Contacts Table & Search/Filter */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm lg:col-span-2 overflow-hidden flex flex-col">
            
            {/* Table Control Header */}
            <div className="p-4 border-b border-gray-100 bg-gray-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              
              {/* Search Input */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Search email or name..."
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Target List & Status Filters */}
              <div className="flex items-center gap-2">
                <select
                  value={listFilter}
                  onChange={e => setListFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-gray-300 rounded-xl text-xs text-gray-700 outline-none focus:ring-2 focus:ring-primary-500 font-medium"
                >
                  <option value="all">All Lists</option>
                  {lists.map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>

                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-gray-300 rounded-xl text-xs text-gray-700 outline-none focus:ring-2 focus:ring-primary-500 font-medium"
                >
                  <option value="all">All Status</option>
                  <option value="subscribed">Subscribed</option>
                  <option value="unsubscribed">Unsubscribed</option>
                </select>

                <button
                  onClick={fetchData}
                  disabled={loading}
                  className="p-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-600 rounded-xl transition"
                  title="Refresh"
                >
                  <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>

            </div>
            
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50/80 text-gray-500 font-semibold border-b border-gray-200 text-xs">
                  <tr>
                    <th className="px-5 py-3.5">Email Address</th>
                    <th className="px-5 py-3.5">Name</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Target Lists</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                        <div className="animate-pulse flex flex-col items-center">
                          <div className="h-8 w-8 bg-gray-200 rounded-full mb-3"></div>
                          <div className="h-4 w-32 bg-gray-200 rounded"></div>
                        </div>
                      </td>
                    </tr>
                  ) : filteredSubscribers.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center text-gray-400 font-medium">
                        No contacts match your filters.
                      </td>
                    </tr>
                  ) : (
                    filteredSubscribers.map(sub => (
                      <tr key={sub.id} className={`hover:bg-gray-50/80 transition-colors ${editingId === sub.id ? 'bg-primary-50/20' : ''}`}>
                        
                        {/* Email Address + Origin Tags */}
                        <td className="px-5 py-3.5">
                          {editingId === sub.id ? (
                            <input 
                              type="email" 
                              value={editEmail} 
                              onChange={(e)=>setEditEmail(e.target.value)}
                              className="w-full px-2 py-1 border border-primary-300 rounded-lg text-xs outline-none focus:ring-1 focus:ring-primary-500"
                            />
                          ) : (
                            <div>
                              <span className="font-semibold text-gray-950">{sub.email}</span>
                              {sub.origins && sub.origins.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {sub.origins.map(origin => (
                                    <span key={origin.origin_site} className="px-1.5 py-0.5 bg-blue-50 text-blue-600 border border-blue-100 text-[10px] font-bold rounded-full">
                                      {origin.origin_site}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Name */}
                        <td className="px-5 py-3.5 text-xs">
                          {editingId === sub.id ? (
                            <input 
                              type="text" 
                              value={editName} 
                              onChange={(e)=>setEditName(e.target.value)}
                              className="w-full px-2 py-1 border border-primary-300 rounded-lg text-xs outline-none focus:ring-1 focus:ring-primary-500"
                            />
                          ) : sub.origins && sub.origins.length > 1 ? (
                            <div className="space-y-1">
                              {sub.origins.map(origin => (
                                <div key={origin.origin_site} className="text-gray-600">
                                  <span className="text-gray-400 font-semibold">{origin.origin_site}:</span> {origin.name || '-'}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-600">{sub.first_name || '-'}</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-5 py-3.5">
                          {editingId === sub.id ? (
                            <select 
                              value={editStatus} 
                              onChange={(e)=>setEditStatus(e.target.value)}
                              className="w-full px-2 py-1 border border-primary-300 rounded-lg text-xs outline-none bg-white"
                            >
                              <option value="subscribed">Subscribed</option>
                              <option value="unsubscribed">Unsubscribed</option>
                            </select>
                          ) : sub.origins && sub.origins.length > 1 ? (
                            <div className="space-y-1">
                              {sub.origins.map(origin => (
                                <div key={origin.origin_site} className="flex items-center gap-1">
                                  <span className="text-[10px] text-gray-400 font-semibold">{origin.origin_site}:</span>
                                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${origin.status === 'subscribed' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                                    {origin.status}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className={`px-2.5 py-0.5 text-[11px] font-bold rounded-full ${sub.status === 'subscribed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {sub.status}
                            </span>
                          )}
                        </td>

                        {/* Target Lists - Interactive & Instant Change */}
                        <td className="px-5 py-3.5 relative">
                          {editingId === sub.id ? (
                            <div className="space-y-1 max-h-24 overflow-y-auto p-1.5 border border-primary-300 rounded-lg bg-white">
                              {lists.map(list => (
                                <label key={list.id} className="flex items-center space-x-2 text-xs text-gray-700 cursor-pointer hover:bg-gray-50 p-1 rounded">
                                  <input 
                                    type="checkbox" 
                                    checked={editListIds.includes(list.id)}
                                    onChange={() => {
                                      setEditListIds(prev => 
                                        prev.includes(list.id) ? prev.filter(id => id !== list.id) : [...prev, list.id]
                                      );
                                    }}
                                    className="rounded text-primary-600 focus:ring-primary-500"
                                  />
                                  <span>{list.name}</span>
                                </label>
                              ))}
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1.5 items-start">
                              
                              {/* Displayed List Badges */}
                              <div className="flex flex-wrap gap-1 max-w-[220px]">
                                {sub.all_lists && sub.all_lists.length > 0 ? (
                                  sub.all_lists.map(l => (
                                    <span key={l.id} className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-semibold rounded-md flex items-center gap-1">
                                      <Tag size={10} className="text-blue-500" />
                                      {l.name}
                                    </span>
                                  ))
                                ) : sub.list_names ? (
                                  <span className="text-gray-700 text-xs font-semibold">{sub.list_names}</span>
                                ) : (
                                  <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded text-[11px] font-semibold italic border border-amber-200">Unassigned</span>
                                )}
                              </div>

                              {/* Direct Quick Assign Button */}
                              <button
                                type="button"
                                onClick={() => quickAssignSubId === sub.id ? setQuickAssignSubId(null) : openQuickAssign(sub)}
                                className="text-[10px] font-bold text-primary-600 hover:text-primary-700 flex items-center gap-0.5 hover:underline"
                              >
                                <Plus size={10} /> Change Lists
                              </button>

                              {/* Quick Assign Popover */}
                              {quickAssignSubId === sub.id && (
                                <div className="absolute left-5 top-12 z-30 bg-white border border-gray-200 rounded-xl shadow-xl p-3 w-56 space-y-2 animate-in fade-in-50">
                                  <div className="flex items-center justify-between border-b border-gray-100 pb-1.5">
                                    <span className="text-xs font-bold text-gray-900">Assign Target Lists</span>
                                    <button onClick={() => setQuickAssignSubId(null)} className="text-gray-400 hover:text-gray-600">
                                      <X size={14} />
                                    </button>
                                  </div>
                                  <div className="space-y-1 max-h-32 overflow-y-auto">
                                    {lists.map(l => (
                                      <label key={l.id} className="flex items-center gap-2 text-xs text-gray-700 p-1 hover:bg-gray-50 rounded cursor-pointer">
                                        <input 
                                          type="checkbox"
                                          checked={quickAssignListIds.includes(l.id)}
                                          onChange={() => {
                                            setQuickAssignListIds(prev => 
                                              prev.includes(l.id) ? prev.filter(id => id !== l.id) : [...prev, l.id]
                                            );
                                          }}
                                          className="rounded text-primary-600 focus:ring-primary-500 w-3.5 h-3.5"
                                        />
                                        <span className="truncate">{l.name}</span>
                                      </label>
                                    ))}
                                  </div>
                                  <div className="pt-1 flex gap-2 border-t border-gray-100">
                                    <button
                                      type="button"
                                      disabled={savingQuickAssign}
                                      onClick={() => saveQuickAssign(sub)}
                                      className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-1 text-xs rounded-lg transition disabled:opacity-50"
                                    >
                                      {savingQuickAssign ? 'Saving...' : 'Save Lists'}
                                    </button>
                                  </div>
                                </div>
                              )}

                            </div>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-3.5 text-right">
                          {editingId === sub.id ? (
                            <div className="flex justify-end space-x-2">
                              <button onClick={() => saveEdit(sub.id)} className="p-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors" title="Save"><Check size={14}/></button>
                              <button onClick={cancelEdit} className="p-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors" title="Cancel"><X size={14}/></button>
                            </div>
                          ) : (
                            <div className="flex justify-end space-x-1">
                              <button onClick={() => startEdit(sub)} className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors" title="Edit Contact">
                                <Edit2 size={15} />
                              </button>
                              <button onClick={() => handleDelete(sub.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete Contact">
                                <Trash2 size={15} />
                              </button>
                            </div>
                          )}
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

      {/* VIEW MODE 2: INDIVIDUAL TARGET LIST ASSIGNMENT MANAGER */}
      {viewMode === 'list_manager' && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Target List Membership Manager</h3>
              <p className="text-xs text-gray-500 mt-1">
                Select an individual target list to assign or remove contacts with 1-click toggles.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-gray-600 shrink-0">Select Target List:</label>
              <select
                value={selectedTargetListId || ''}
                onChange={e => setSelectedTargetListId(Number(e.target.value))}
                className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold text-gray-800 outline-none focus:ring-2 focus:ring-primary-500"
              >
                {lists.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>

              <button
                onClick={() => setShowCreateListModal(true)}
                className="px-3.5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
              >
                + New List
              </button>
            </div>
          </div>

          {selectedTargetListObj ? (
            <div className="space-y-4">
              <div className="bg-primary-50/40 border border-primary-100 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-sm text-primary-900">{selectedTargetListObj.name}</h4>
                  <p className="text-xs text-primary-700 mt-0.5">{selectedTargetListObj.description || 'No description provided.'}</p>
                </div>
                <span className="px-3 py-1 bg-primary-600 text-white font-bold text-xs rounded-full">
                  {subscribers.filter(sub => {
                    return getSubListIds(sub).includes(Number(selectedTargetListId));
                  }).length} Assigned Contacts
                </span>
              </div>

              {/* Contacts Toggle List */}
              <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
                {subscribers.map(sub => {
                  const isAssigned = getSubListIds(sub).includes(Number(selectedTargetListId));

                  return (
                    <div 
                      key={sub.id} 
                      className={`p-4 flex items-center justify-between transition-colors ${
                        isAssigned ? 'bg-blue-50/20' : 'hover:bg-gray-50/60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => toggleSubscriberInTargetList(sub, Number(selectedTargetListId))}
                          className={`p-1 rounded-lg transition-colors ${
                            isAssigned ? 'text-primary-600' : 'text-gray-300 hover:text-gray-500'
                          }`}
                        >
                          {isAssigned ? <CheckSquare size={20} /> : <Square size={20} />}
                        </button>
                        <div>
                          <p className="font-bold text-sm text-gray-900">{sub.email}</p>
                          <p className="text-xs text-gray-400">{sub.first_name || 'No name'} • Status: {sub.status}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isAssigned ? (
                          <span className="px-2.5 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-full border border-green-200 flex items-center gap-1">
                            <Check size={12} /> Assigned to {selectedTargetListObj.name}
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-gray-100 text-gray-500 text-xs font-semibold rounded-full border border-gray-200">
                            Not Assigned
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => toggleSubscriberInTargetList(sub, Number(selectedTargetListId))}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                            isAssigned 
                              ? 'border-red-200 text-red-600 hover:bg-red-50' 
                              : 'border-primary-200 text-primary-600 hover:bg-primary-50'
                          }`}
                        >
                          {isAssigned ? 'Remove' : 'Assign Contact'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Please select a target list above to manage members.</p>
          )}
        </div>
      )}

      {/* CREATE TARGET LIST MODAL */}
      {showCreateListModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-bold text-gray-900">Create Target Audience List</h3>
              <button onClick={() => setShowCreateListModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateList} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">List Name *</label>
                <input 
                  type="text"
                  required
                  value={newListName}
                  onChange={e => setNewListName(e.target.value)}
                  placeholder="e.g. Newsletter Subscribers, VIP Customers"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Description</label>
                <textarea 
                  rows={3}
                  value={newListDesc}
                  onChange={e => setNewListDesc(e.target.value)}
                  placeholder="Optional list description..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateListModal(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-600 text-xs font-semibold rounded-xl hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingList}
                  className="px-4 py-2 bg-primary-600 text-white text-xs font-bold rounded-xl hover:bg-primary-700 transition disabled:opacity-50 shadow-sm"
                >
                  {creatingList ? 'Creating...' : 'Create List'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Contacts;
