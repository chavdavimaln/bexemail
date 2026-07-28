import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Users, Plus, Mail, User, Edit2, Trash2, List as ListIcon, Check, X, Upload, Settings2, Search, Tag, RefreshCw, Layers, CheckSquare, Square, FolderPlus, UserPlus, Filter, CheckCircle2, SlidersHorizontal, CheckSquare2, Sparkles, Globe } from 'lucide-react';
import { useModal } from '../context/ModalContext';

const Contacts = () => {
  const { confirm, alert: customAlert } = useModal();
  const [subscribers, setSubscribers] = useState([]);
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);

  // Main Page View Mode: 'directory' or 'list_manager'
  const [viewMode, setViewMode] = useState('directory');
  
  // Add Contact Modal state
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [addMode, setAddMode] = useState('single'); // 'single' or 'bulk_file'

  // Directory Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [listFilter, setListFilter] = useState('all');

  // Single Add Form State
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [selectedListIds, setSelectedListIds] = useState([]);
  const [adding, setAdding] = useState(false);
  
  // Inline Edit State
  const [editingId, setEditingId] = useState(null);
  const [editEmail, setEditEmail] = useState('');
  const [editName, setEditName] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editListIds, setEditListIds] = useState([]);

  // Quick List Assign Popover State
  const [quickAssignSubId, setQuickAssignSubId] = useState(null);
  const [quickAssignListIds, setQuickAssignListIds] = useState([]);
  const [savingQuickAssign, setSavingQuickAssign] = useState(false);

  // Target List Manager State (Tab 2)
  const [selectedTargetListId, setSelectedTargetListId] = useState('all_lists'); // 'all_lists' or numeric list ID
  const [managerSearchTerm, setManagerSearchTerm] = useState('');
  const [selectedSubIds, setSelectedSubIds] = useState([]);
  const [newListName, setNewListName] = useState('');
  const [newListDesc, setNewListDesc] = useState('');
  const [showCreateListModal, setShowCreateListModal] = useState(false);
  const [creatingList, setCreatingList] = useState(false);
  const [processingBulk, setProcessingBulk] = useState(false);

  // New admin/user associations states
  const [adminUsers, setAdminUsers] = useState([]);
  const [newContactAdminId, setNewContactAdminId] = useState('');
  const [newListAdminId, setNewListAdminId] = useState('');

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
      const fetchedSubs = subsRes.data.data || [];
      const fetchedLists = listsRes.data || [];
      const fetchedAdmins = adminsRes.data || [];
      
      setSubscribers(fetchedSubs);
      setLists(fetchedLists);
      setAdminUsers(fetchedAdmins);

      if (fetchedLists.length > 0 && selectedListIds.length === 0) {
        setSelectedListIds([fetchedLists[0].id]);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper to extract assigned list IDs from a subscriber object
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

  // Check if a subscriber is assigned to ALL target lists in the system
  const isAssignedToAllLists = (sub) => {
    if (!sub || lists.length === 0) return false;
    const assignedIds = getSubListIds(sub);
    return lists.every(l => assignedIds.includes(Number(l.id)));
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
        adminId: newContactAdminId ? Number(newContactAdminId) : null,
        contacts: [{
          email: newEmail.trim(),
          name: newName.trim(),
          conflictAction: 'merge'
        }]
      });

      setNewEmail('');
      setNewName('');
      setNewContactAdminId('');
      setShowAddContactModal(false);
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

  // Toggle subscriber assignment for a specific target list
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

  // Toggle single contact assignment to ALL target lists in system
  const toggleAssignSubToAllLists = async (sub) => {
    const isAll = isAssignedToAllLists(sub);
    const targetListIds = isAll ? [] : lists.map(l => Number(l.id));

    try {
      await axios.put(`http://localhost:5000/api/contacts/${sub.id}/update`, {
        email: sub.email,
        first_name: sub.first_name || '',
        status: sub.status || 'subscribed',
        list_ids: targetListIds
      });
      await fetchData();
      customAlert({
        title: 'Success',
        message: isAll ? `Removed ${sub.email} from all target lists.` : `Assigned ${sub.email} to ALL ${lists.length} target lists!`,
        type: 'success'
      });
    } catch (error) {
      console.error(error);
      customAlert({
        title: 'Error',
        message: 'Failed to update list assignment.',
        type: 'danger'
      });
    }
  };

  // Bulk Action: Assign selected contacts to current target list or all lists
  const bulkAssignToCurrentList = async () => {
    if (selectedSubIds.length === 0) return;
    try {
      setProcessingBulk(true);

      for (const subId of selectedSubIds) {
        const sub = subscribers.find(s => s.id === subId);
        if (sub) {
          let updatedListIds;
          if (selectedTargetListId === 'all_lists') {
            updatedListIds = lists.map(l => Number(l.id));
          } else {
            const targetIdNum = Number(selectedTargetListId);
            const currentListIds = getSubListIds(sub);
            updatedListIds = Array.from(new Set([...currentListIds, targetIdNum]));
          }

          await axios.put(`http://localhost:5000/api/contacts/${sub.id}/update`, {
            email: sub.email,
            first_name: sub.first_name || '',
            status: sub.status || 'subscribed',
            list_ids: updatedListIds
          });
        }
      }
      setSelectedSubIds([]);
      await fetchData();
      customAlert({
        title: 'Success',
        message: `Successfully updated ${selectedSubIds.length} contacts!`,
        type: 'success'
      });
    } catch (error) {
      console.error(error);
      customAlert({
        title: 'Error',
        message: 'Bulk assign failed.',
        type: 'danger'
      });
    } finally {
      setProcessingBulk(false);
    }
  };

  // Bulk Action: Remove selected contacts
  const bulkRemoveFromCurrentList = async () => {
    if (selectedSubIds.length === 0) return;
    try {
      setProcessingBulk(true);

      for (const subId of selectedSubIds) {
        const sub = subscribers.find(s => s.id === subId);
        if (sub) {
          let updatedListIds;
          if (selectedTargetListId === 'all_lists') {
            updatedListIds = [];
          } else {
            const targetIdNum = Number(selectedTargetListId);
            const currentListIds = getSubListIds(sub);
            updatedListIds = currentListIds.filter(id => id !== targetIdNum);
          }

          await axios.put(`http://localhost:5000/api/contacts/${sub.id}/update`, {
            email: sub.email,
            first_name: sub.first_name || '',
            status: sub.status || 'subscribed',
            list_ids: updatedListIds
          });
        }
      }
      setSelectedSubIds([]);
      await fetchData();
      customAlert({
        title: 'Success',
        message: `Successfully updated membership for ${selectedSubIds.length} contacts!`,
        type: 'success'
      });
    } catch (error) {
      console.error(error);
      customAlert({
        title: 'Error',
        message: 'Bulk remove failed.',
        type: 'danger'
      });
    } finally {
      setProcessingBulk(false);
    }
  };

  // Bulk Action: Assign selected contacts to ALL target lists
  const bulkAssignToAllLists = async () => {
    if (selectedSubIds.length === 0) return;
    try {
      setProcessingBulk(true);
      const allListIds = lists.map(l => Number(l.id));

      for (const subId of selectedSubIds) {
        const sub = subscribers.find(s => s.id === subId);
        if (sub) {
          await axios.put(`http://localhost:5000/api/contacts/${sub.id}/update`, {
            email: sub.email,
            first_name: sub.first_name || '',
            status: sub.status || 'subscribed',
            list_ids: allListIds
          });
        }
      }
      setSelectedSubIds([]);
      await fetchData();
      customAlert({
        title: 'Success',
        message: `Successfully assigned ${selectedSubIds.length} contacts to ALL target lists!`,
        type: 'success'
      });
    } catch (error) {
      console.error(error);
      customAlert({
        title: 'Error',
        message: 'Bulk assign to all failed.',
        type: 'danger'
      });
    } finally {
      setProcessingBulk(false);
    }
  };

  const handleCreateList = async (e) => {
    e.preventDefault();
    if (!newListName.trim()) return;
    try {
      setCreatingList(true);
      const res = await axios.post('http://localhost:5000/api/lists', {
        name: newListName.trim(),
        description: newListDesc.trim(),
        admin_id: newListAdminId ? Number(newListAdminId) : null
      }, { headers: { 'x-user-role': 'Super Admin' } });

      setNewListName('');
      setNewListDesc('');
      setNewListAdminId('');
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

  // Filtered subscribers for Target List Membership Manager
  const managerFilteredSubscribers = subscribers.filter(sub => {
    return (sub.email || '').toLowerCase().includes(managerSearchTerm.toLowerCase()) ||
           (sub.first_name || '').toLowerCase().includes(managerSearchTerm.toLowerCase());
  });

  const selectedTargetListObj = selectedTargetListId === 'all_lists' 
    ? { id: 'all_lists', name: 'All Target Lists', description: `Global view of all ${lists.length} target audience lists in the system.` }
    : lists.find(l => Number(l.id) === Number(selectedTargetListId));

  const isAllManagerSelected = managerFilteredSubscribers.length > 0 && 
    managerFilteredSubscribers.every(sub => selectedSubIds.includes(sub.id));

  const toggleSelectAllManager = () => {
    if (isAllManagerSelected) {
      setSelectedSubIds([]);
    } else {
      setSelectedSubIds(managerFilteredSubscribers.map(sub => sub.id));
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      
      {/* Top Header Control Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap items-center justify-between gap-4">
        
        {/* Module View Tabs */}
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

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setAddMode('single'); setShowAddContactModal(true); }}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs rounded-xl shadow-sm shadow-primary-200 transition"
          >
            <UserPlus size={15} />
            + Add Contact
          </button>

          <Link
            to="/contacts/bulk-import"
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs rounded-xl border border-blue-200 transition"
          >
            <Upload size={14} />
            Bulk Import File
          </Link>

          <button
            onClick={() => setShowCreateListModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-green-50 hover:bg-green-100 text-green-700 font-semibold text-xs rounded-xl border border-green-200 transition"
          >
            <FolderPlus size={14} />
            + New Target List
          </button>
        </div>
      </div>

      {/* VIEW MODE 1: FULL-WIDTH SINGLE COLUMN DIRECTORY TABLE */}
      {viewMode === 'directory' && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col w-full">
          
          {/* Table Control & Filter Header */}
          <div className="p-4 border-b border-gray-100 bg-gray-50/40 flex flex-col md:flex-row md:items-center justify-between gap-3">
            
            {/* Live Search Input */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search by email address or name..."
                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary-500 shadow-sm"
              />
            </div>

            {/* Target List & Status Filters */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-white border border-gray-300 rounded-xl px-2 py-1 shadow-sm">
                <Filter size={13} className="text-gray-400" />
                <select
                  value={listFilter}
                  onChange={e => setListFilter(e.target.value)}
                  className="bg-transparent text-xs text-gray-700 outline-none font-semibold pr-1"
                >
                  <option value="all">All Target Lists</option>
                  {lists.map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>

              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs text-gray-700 outline-none focus:ring-2 focus:ring-primary-500 font-semibold shadow-sm"
              >
                <option value="all">All Status</option>
                <option value="subscribed">Subscribed</option>
                <option value="unsubscribed">Unsubscribed</option>
              </select>

              <button
                onClick={fetchData}
                disabled={loading}
                className="p-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-600 rounded-xl transition shadow-sm"
                title="Refresh Directory"
              >
                <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>

          </div>
          
          {/* Spacious Full-Width Table */}
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50/80 text-gray-500 font-bold border-b border-gray-200 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Email Address</th>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Target Lists</th>
                  <th className="px-6 py-4 text-right">Actions</th>
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
                  filteredSubscribers.map(sub => {
                    const isAll = isAssignedToAllLists(sub);

                    return (
                      <tr key={sub.id} className={`hover:bg-gray-50/80 transition-colors ${editingId === sub.id ? 'bg-primary-50/20' : ''}`}>
                        
                        {/* Email Address + Origin Tags */}
                        <td className="px-6 py-4">
                          {editingId === sub.id ? (
                            <input 
                              type="email" 
                              value={editEmail} 
                              onChange={(e)=>setEditEmail(e.target.value)}
                              className="w-full px-3 py-1.5 border border-primary-300 rounded-lg text-xs outline-none focus:ring-1 focus:ring-primary-500"
                            />
                          ) : (
                            <div>
                              <span className="font-bold text-gray-950 text-sm">{sub.email}</span>
                              {sub.origins && sub.origins.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {sub.origins.map(origin => (
                                    <span key={origin.origin_site} className="px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-100 text-[10px] font-bold rounded-full">
                                      {origin.origin_site}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Name */}
                        <td className="px-6 py-4 text-xs font-medium">
                          {editingId === sub.id ? (
                            <input 
                              type="text" 
                              value={editName} 
                              onChange={(e)=>setEditName(e.target.value)}
                              className="w-full px-3 py-1.5 border border-primary-300 rounded-lg text-xs outline-none focus:ring-1 focus:ring-primary-500"
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
                        <td className="px-6 py-4">
                          {editingId === sub.id ? (
                            <select 
                              value={editStatus} 
                              onChange={(e)=>setEditStatus(e.target.value)}
                              className="w-full px-2 py-1.5 border border-primary-300 rounded-lg text-xs outline-none bg-white font-semibold"
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
                            <span className={`px-2.5 py-1 text-[11px] font-bold rounded-full ${sub.status === 'subscribed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {sub.status}
                            </span>
                          )}
                        </td>

                        {/* Target Lists */}
                        <td className="px-6 py-4 relative">
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
                              
                              {/* Displayed List Badges - Includes Special 'Assigned To All Lists' Tag */}
                              <div className="flex flex-col gap-1 items-start">
                                {isAll ? (
                                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-extrabold rounded-lg flex items-center gap-1.5 shadow-sm">
                                    <Sparkles size={13} className="text-emerald-600" />
                                    Assigned To All Lists ({lists.length})
                                  </span>
                                ) : sub.all_lists && sub.all_lists.length > 0 ? (
                                  sub.all_lists.map(l => (
                                    <span key={l.id} className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold rounded-lg flex items-center gap-1">
                                      <Tag size={11} className="text-blue-500" />
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
                                className="text-[11px] font-bold text-primary-600 hover:text-primary-700 flex items-center gap-0.5 hover:underline mt-0.5"
                              >
                                <Plus size={11} /> Change Lists
                              </button>

                              {/* Quick Assign Popover */}
                              {quickAssignSubId === sub.id && (
                                <div className="absolute left-6 top-12 z-30 bg-white border border-gray-200 rounded-xl shadow-xl p-3 w-56 space-y-2 animate-in fade-in-50">
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
                        <td className="px-6 py-4 text-right">
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
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: ENHANCED TARGET LIST MEMBERSHIP MANAGER WITH ALL TARGET LISTS OPTION */}
      {viewMode === 'list_manager' && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden p-6 space-y-6">
          
          {/* Header Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
            <div>
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Layers className="text-primary-600" size={20} /> Target List Membership Manager
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Select an individual target list or pick "All Target Lists" to view global membership and batch assign.
              </p>
            </div>

            {/* Select Target List Dropdown - INCLUDES 'All Target Lists' Option */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-gray-600 shrink-0">Select Target List:</label>
                <select
                  value={selectedTargetListId}
                  onChange={e => {
                    const val = e.target.value;
                    setSelectedTargetListId(val === 'all_lists' ? 'all_lists' : Number(val));
                    setSelectedSubIds([]);
                  }}
                  className="px-3.5 py-2 bg-primary-50/50 border border-primary-300 rounded-xl text-xs font-extrabold text-primary-900 outline-none focus:ring-2 focus:ring-primary-500 shadow-sm"
                >
                  <option value="all_lists">★ All Target Lists (Global View)</option>
                  {lists.map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>

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
              
              {/* Target List Info Card */}
              <div className="bg-primary-50/50 border border-primary-100 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="font-extrabold text-base text-primary-900 flex items-center gap-2">
                    {selectedTargetListId === 'all_lists' ? (
                      <Globe size={18} className="text-primary-600" />
                    ) : (
                      <Tag size={16} className="text-primary-600" />
                    )} 
                    {selectedTargetListObj.name}
                  </h4>
                  <p className="text-xs text-primary-700 mt-0.5">{selectedTargetListObj.description}</p>
                </div>
                <span className="px-3.5 py-1.5 bg-primary-600 text-white font-extrabold text-xs rounded-full shadow-sm">
                  {selectedTargetListId === 'all_lists' 
                    ? `${subscribers.filter(s => isAssignedToAllLists(s)).length} / ${subscribers.length} Contacts Assigned to ALL Lists`
                    : `${subscribers.filter(s => getSubListIds(s).includes(Number(selectedTargetListId))).length} Assigned Contacts`
                  }
                </span>
              </div>

              {/* Toolbar: Search & Select All Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/60 p-3 rounded-xl border border-gray-200">
                
                {/* Checkbox Select All + Search */}
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-700 bg-white px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition shadow-sm">
                    <input
                      type="checkbox"
                      checked={isAllManagerSelected}
                      onChange={toggleSelectAllManager}
                      className="rounded text-primary-600 focus:ring-primary-500 w-4 h-4 cursor-pointer"
                    />
                    <span>Select All ({managerFilteredSubscribers.length})</span>
                  </label>

                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                    <input
                      type="text"
                      value={managerSearchTerm}
                      onChange={e => setManagerSearchTerm(e.target.value)}
                      placeholder="Search contacts..."
                      className="pl-8 pr-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary-500 shadow-sm"
                    />
                  </div>
                </div>

                {/* Bulk Actions Menu (When 1+ contacts selected) */}
                {selectedSubIds.length > 0 && (
                  <div className="flex items-center gap-2 animate-in fade-in-50">
                    <span className="text-xs font-bold text-primary-700 bg-primary-50 px-2.5 py-1 rounded-lg">
                      {selectedSubIds.length} Selected
                    </span>

                    <button
                      type="button"
                      disabled={processingBulk}
                      onClick={bulkAssignToCurrentList}
                      className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition disabled:opacity-50 flex items-center gap-1 shadow-sm"
                    >
                      <Check size={13} /> 
                      {selectedTargetListId === 'all_lists' ? 'Assign Selected to ALL Lists' : `Assign to "${selectedTargetListObj.name}"`}
                    </button>

                    {selectedTargetListId !== 'all_lists' && (
                      <button
                        type="button"
                        disabled={processingBulk}
                        onClick={bulkAssignToAllLists}
                        className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-lg transition disabled:opacity-50 flex items-center gap-1 shadow-sm"
                      >
                        <Sparkles size={13} /> Assign Selected to ALL Target Lists
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={processingBulk}
                      onClick={bulkRemoveFromCurrentList}
                      className="px-2.5 py-1.5 bg-white border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold rounded-lg transition disabled:opacity-50"
                    >
                      Remove Selected
                    </button>
                  </div>
                )}

              </div>

              {/* Contacts Membership List */}
              <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100 bg-white">
                {managerFilteredSubscribers.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 font-medium text-xs">
                    No contacts found matching your search.
                  </div>
                ) : (
                  managerFilteredSubscribers.map(sub => {
                    const isAll = isAssignedToAllLists(sub);
                    const isAssigned = selectedTargetListId === 'all_lists'
                      ? isAll
                      : getSubListIds(sub).includes(Number(selectedTargetListId));

                    const isChecked = selectedSubIds.includes(sub.id);

                    return (
                      <div 
                        key={sub.id} 
                        className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                          isChecked ? 'bg-primary-50/30' : isAll ? 'bg-emerald-50/20' : isAssigned ? 'bg-blue-50/20' : 'hover:bg-gray-50/60'
                        }`}
                      >
                        {/* Checkbox + Email Details */}
                        <div className="flex items-center gap-3">
                          <input 
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              setSelectedSubIds(prev => 
                                prev.includes(sub.id) ? prev.filter(id => id !== sub.id) : [...prev, sub.id]
                              );
                            }}
                            className="rounded text-primary-600 focus:ring-primary-500 w-4 h-4 cursor-pointer"
                          />
                          <div>
                            <p className="font-bold text-sm text-gray-900">{sub.email}</p>
                            <p className="text-xs text-gray-400">{sub.first_name || 'No name'} • Status: {sub.status}</p>
                          </div>
                        </div>

                        {/* Action Buttons for Individual Contact */}
                        <div className="flex flex-wrap items-center gap-2">
                          
                          {/* Assigned Tag Badge */}
                          {isAll ? (
                            <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-extrabold rounded-full border border-emerald-300 flex items-center gap-1.5 shadow-sm">
                              <Sparkles size={12} className="text-emerald-600" />
                              Assigned To All Lists ({lists.length})
                            </span>
                          ) : isAssigned ? (
                            <span className="px-2.5 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-full border border-blue-200 flex items-center gap-1">
                              <Check size={12} /> Assigned to {selectedTargetListObj.name}
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 bg-gray-100 text-gray-500 text-xs font-semibold rounded-full border border-gray-200">
                              Not Assigned
                            </span>
                          )}

                          {/* 1-Click Toggle for Selected List */}
                          {selectedTargetListId !== 'all_lists' && (
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
                          )}

                          {/* 1-Click Toggle for ALL Target Lists */}
                          <button
                            type="button"
                            onClick={() => toggleAssignSubToAllLists(sub)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition flex items-center gap-1 ${
                              isAll 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200' 
                                : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200'
                            }`}
                            title="Toggle assignment across all target lists"
                          >
                            <Sparkles size={12} className={isAll ? 'text-emerald-600' : 'text-gray-400'} /> 
                            {isAll ? 'Assigned to ALL Lists ✓' : 'Assign to ALL Lists'}
                          </button>

                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Please select a target list above to manage members.</p>
          )}
        </div>
      )}

      {/* ADD CONTACT MODAL */}
      {showAddContactModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 max-w-lg w-full p-6 space-y-5 animate-in fade-in-50">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <UserPlus size={18} className="text-primary-600" /> Add New Contacts
              </h3>
              <button onClick={() => setShowAddContactModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            {/* Sub-Mode Selector */}
            <div className="flex bg-gray-100 p-1 rounded-xl">
              <button
                onClick={() => setAddMode('single')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  addMode === 'single' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <User size={14} /> Single Add Form
              </button>
              <button
                onClick={() => setAddMode('bulk_file')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  addMode === 'bulk_file' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Upload size={14} /> Bulk Import File (CSV/TXT)
              </button>
            </div>

            {addMode === 'single' ? (
              <form onSubmit={handleAddContact} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Email Address *</label>
                  <input 
                    type="email" 
                    required
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">First Name</label>
                  <input 
                    type="text" 
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="Optional name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Assign to Admin/User Profile</label>
                  <select
                    value={newContactAdminId}
                    onChange={e => setNewContactAdminId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                  >
                    <option value="">Global / Unassigned</option>
                    {adminUsers.map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-bold text-gray-700">Assign Target Lists *</label>
                    <div className="flex gap-2 text-[11px]">
                      <button 
                        type="button" 
                        onClick={() => setSelectedListIds(lists.map(l => l.id))}
                        className="text-primary-600 hover:underline font-bold"
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
                      <label key={list.id} className="flex items-center space-x-2 text-xs text-gray-700 cursor-pointer hover:bg-gray-100 p-1.5 rounded-lg transition-colors">
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
                        <span className="font-semibold">{list.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddContactModal(false)}
                    className="px-4 py-2 border border-gray-200 text-gray-600 text-xs font-semibold rounded-xl hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={adding}
                    className="px-4 py-2 bg-primary-600 text-white text-xs font-bold rounded-xl hover:bg-primary-700 transition disabled:opacity-50 shadow-sm"
                  >
                    {adding ? 'Saving...' : 'Add Contact & Assign'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center py-6 space-y-4">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto">
                  <Upload size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-gray-900">Bulk Import via CSV or TXT File</h4>
                  <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                    Upload your CSV/TXT contacts list with drag-and-drop support, auto site tag separation, and list allocation.
                  </p>
                </div>
                <Link
                  to="/contacts/bulk-import"
                  onClick={() => setShowAddContactModal(false)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs rounded-xl shadow-md transition"
                >
                  <Upload size={15} /> Launch Bulk File Importer &rarr;
                </Link>
              </div>
            )}

          </div>
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

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Assign to Admin/User Profile</label>
                <select
                  value={newListAdminId}
                  onChange={e => setNewListAdminId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                >
                  <option value="">Global / Unassigned</option>
                  {adminUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                  ))}
                </select>
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
