import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Edit2, Trash2, List as ListIcon, Plus } from 'lucide-react';
import { useModal } from '../context/ModalContext';

const TargetLists = () => {
  const { confirm, alert: customAlert } = useModal();
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const currentUserRole = currentUser.role;
  const hasListsPermission = currentUserRole === 'Super Admin' || currentUser.permissions?.lists === true;

  if (currentUserRole === 'User' && !hasListsPermission) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-6 text-center">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 max-w-md mx-auto shadow-sm">
          <h2 className="text-xl font-bold text-red-700 mb-2">Access Denied</h2>
          <p className="text-gray-600 text-sm">
            You do not have permission to view or manage Target Lists.
          </p>
        </div>
      </div>
    );
  }

  const [lists, setLists] = useState([]);
  const [adminUsers, setAdminUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listForm, setListForm] = useState({ 
    id: null, 
    name: '', 
    description: '', 
    admin_id: !hasListsPermission ? String(currentUser.id || '') : '' 
  });

  useEffect(() => {
    fetchLists();
  }, []);

  const fetchLists = async () => {
    try {
      setLoading(true);
      const [listsRes, adminsRes] = await Promise.all([
        axios.get('http://localhost:5000/api/lists'),
        axios.get('http://localhost:5000/api/admins').catch(() => ({ data: [] }))
      ]);
      
      let fetchedLists = listsRes.data || [];
      if (currentUserRole !== 'Super Admin') {
        fetchedLists = fetchedLists.filter(list => Number(list.admin_id) === Number(currentUser.id));
      }
      setLists(fetchedLists);
      setAdminUsers(adminsRes.data || []);
    } catch (error) {
      console.error('Failed to fetch lists:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveList = async (e) => {
    e.preventDefault();
    if (!listForm.name) return;
    try {
      const payload = {
        name: listForm.name.trim(),
        description: listForm.description.trim(),
        admin_id: currentUserRole === 'Super Admin'
          ? (listForm.admin_id !== '' && listForm.admin_id !== null && listForm.admin_id !== undefined ? Number(listForm.admin_id) : null)
          : currentUser.id
      };

      if (listForm.id) {
        await axios.put(`http://localhost:5000/api/lists/${listForm.id}`, payload, { headers: { 'x-user-role': currentUserRole } });
      } else {
        await axios.post('http://localhost:5000/api/lists', payload, { headers: { 'x-user-role': currentUserRole } });
      }
      setListForm({ id: null, name: '', description: '', admin_id: !hasListsPermission ? String(currentUser.id || '') : '' });
      fetchLists();
    } catch (error) {
      customAlert({
        title: 'Error',
        message: 'Failed to save list: ' + (error.response?.data?.error || error.message),
        type: 'danger'
      });
    }
  };

  const handleDeleteList = async (id) => {
    const isOk = await confirm({
      title: 'Delete Audience List',
      message: 'Are you sure you want to delete this list? Subscriber data will be preserved.',
      confirmText: 'Delete List',
      type: 'danger'
    });
    if (!isOk) return;
    try {
      await axios.delete(`http://localhost:5000/api/lists/${id}`, { headers: { 'x-user-role': currentUserRole } });
      fetchLists();
    } catch (error) {
      customAlert({
        title: 'Error',
        message: 'Failed to delete list: ' + (error.response?.data?.error || error.message),
        type: 'danger'
      });
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Target Lists Management</h2>
          <p className="text-gray-500 mt-1">Create and manage lists to organize your subscribers.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel: Add/Edit Form */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
            <h3 className="font-bold text-gray-900 mb-4">{listForm.id ? 'Edit List' : 'Create New List'}</h3>
            <form onSubmit={handleSaveList} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">List Name *</label>
                <input 
                  type="text" 
                  required
                  value={listForm.name}
                  onChange={e => setListForm({...listForm, name: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                  placeholder="e.g. VIP Customers"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                <textarea 
                  rows="3"
                  value={listForm.description}
                  onChange={e => setListForm({...listForm, description: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm resize-none"
                  placeholder="Optional details about this list..."
                />
              </div>

              {hasListsPermission && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Assign to Subscriber/User Profile</label>
                  <select
                    value={listForm.admin_id !== null && listForm.admin_id !== undefined ? String(listForm.admin_id) : ''}
                    onChange={e => setListForm({...listForm, admin_id: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm bg-white"
                  >
                    <option value="">Unassigned</option>
                    <option value="0">Global</option>
                    {adminUsers.map(u => (
                      <option key={u.id} value={u.id}>{u.email}</option>
                    ))}
                  </select>
                </div>
              )}
              
              <div className="pt-2 flex space-x-3">
                <button 
                  type="submit"
                  disabled={!listForm.name}
                  className="flex-1 bg-primary-600 text-white font-semibold py-2.5 rounded-xl hover:bg-primary-700 transition-all disabled:opacity-50 flex justify-center items-center text-sm"
                >
                  {listForm.id ? 'Update List' : <><Plus size={18} className="mr-2"/> Create List</>}
                </button>
                {listForm.id && (
                  <button 
                    type="button" 
                    onClick={() => setListForm({ id: null, name: '', description: '', admin_id: !hasListsPermission ? String(currentUser.id || '') : '' })} 
                    className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors text-sm"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Right Panel: Lists Table */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-full">
            <div className="p-5 border-b border-gray-100 bg-white flex justify-between items-center">
              <h3 className="font-bold text-gray-900 flex items-center">
                <ListIcon size={18} className="mr-2 text-primary-600"/>
                All Target Lists
              </h3>
              <span className="bg-gray-100 text-gray-600 px-3 py-1 text-xs font-semibold rounded-lg">
                {lists.length} Lists
              </span>
            </div>
            
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50/50 text-gray-500 font-semibold border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4">Description</th>
                    <th className="px-6 py-4">Associated Admin</th>
                    <th className="px-6 py-4">List Created By</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                        <div className="animate-pulse flex flex-col items-center">
                          <div className="h-8 w-8 bg-gray-200 rounded-full mb-4"></div>
                        </div>
                      </td>
                    </tr>
                  ) : lists.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center text-gray-500 font-medium">No target lists found.</td>
                    </tr>
                  ) : (
                    lists.map(list => {
                      const owner = adminUsers.find(u => Number(u.id) === Number(list.admin_id));
                      return (
                        <tr key={list.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="px-6 py-4 font-medium text-gray-900">{list.name}</td>
                          <td className="px-6 py-4 text-gray-500">{list.description || '-'}</td>
                          <td className="px-6 py-4 text-gray-500 text-xs">
                            {list.admin_id !== null && list.admin_id !== undefined && Number(list.admin_id) === 0 ? (
                              <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-bold">Global</span>
                            ) : list.admin_id !== null && list.admin_id !== undefined && Number(list.admin_id) === Number(currentUser.id) ? (
                              <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-bold">self</span>
                            ) : list.admin_id !== null && list.admin_id !== undefined ? (
                              list.admin_email || `User #${list.admin_id}`
                            ) : (
                              <span className="text-gray-400 italic">Unassigned</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-gray-500 text-xs">
                            {list.admin_id !== null && list.admin_id !== undefined && Number(list.admin_id) !== 0 ? (
                              list.admin_username && list.admin_email ? (
                                <span>{list.admin_username} ({list.admin_email})</span>
                              ) : (
                                <span>User #{list.admin_id}</span>
                              )
                            ) : (
                              <span className="text-gray-400 italic">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button onClick={() => setListForm({ ...list, admin_id: list.admin_id !== null && list.admin_id !== undefined ? String(list.admin_id) : '' })} className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors mr-2" title="Edit">
                              <Edit2 size={16} />
                            </button>
                          <button onClick={() => handleDeleteList(list.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                            <Trash2 size={16} />
                          </button>
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
      </div>
    </div>
  );
};

export default TargetLists;
