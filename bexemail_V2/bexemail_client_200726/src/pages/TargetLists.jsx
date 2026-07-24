import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Edit2, Trash2, List as ListIcon, Plus } from 'lucide-react';

const TargetLists = () => {
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listForm, setListForm] = useState({ id: null, name: '', description: '' });

  useEffect(() => {
    fetchLists();
  }, []);

  const fetchLists = async () => {
    try {
      setLoading(true);
      const res = await axios.get('http://localhost:5000/api/lists');
      setLists(res.data || []);
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
      if (listForm.id) {
        await axios.put(`http://localhost:5000/api/lists/${listForm.id}`, listForm, { headers: { 'x-user-role': 'Super Admin' } });
      } else {
        await axios.post('http://localhost:5000/api/lists', listForm, { headers: { 'x-user-role': 'Super Admin' } });
      }
      setListForm({ id: null, name: '', description: '' });
      fetchLists();
    } catch (error) {
      alert('Failed to save list: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleDeleteList = async (id) => {
    if (!window.confirm('Are you sure you want to delete this list? Subscriber data will be preserved.')) return;
    try {
      await axios.delete(`http://localhost:5000/api/lists/${id}`, { headers: { 'x-user-role': 'Super Admin' } });
      fetchLists();
    } catch (error) {
      alert('Failed to delete list: ' + (error.response?.data?.error || error.message));
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
              
              <div className="pt-2 flex space-x-3">
                <button 
                  type="submit"
                  disabled={!listForm.name}
                  className="flex-1 bg-primary-600 text-white font-semibold py-2.5 rounded-xl hover:bg-primary-700 transition-all disabled:opacity-50 flex justify-center items-center"
                >
                  {listForm.id ? 'Update List' : <><Plus size={18} className="mr-2"/> Create List</>}
                </button>
                {listForm.id && (
                  <button 
                    type="button" 
                    onClick={() => setListForm({ id: null, name: '', description: '' })} 
                    className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors"
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
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan="3" className="px-6 py-12 text-center text-gray-500">
                        <div className="animate-pulse flex flex-col items-center">
                          <div className="h-8 w-8 bg-gray-200 rounded-full mb-4"></div>
                        </div>
                      </td>
                    </tr>
                  ) : lists.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="px-6 py-12 text-center text-gray-500 font-medium">No target lists found.</td>
                    </tr>
                  ) : (
                    lists.map(list => (
                      <tr key={list.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-6 py-4 font-medium text-gray-900">{list.name}</td>
                        <td className="px-6 py-4 text-gray-500">{list.description || '-'}</td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => setListForm(list)} className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors mr-2" title="Edit">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => handleDeleteList(list.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                            <Trash2 size={16} />
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
      </div>
    </div>
  );
};

export default TargetLists;
