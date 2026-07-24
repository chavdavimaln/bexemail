import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Users, Plus, Mail, User, Edit2, Trash2, List as ListIcon, Check, X, Upload, Settings2 } from 'lucide-react';

const Contacts = () => {
  const [subscribers, setSubscribers] = useState([]);
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Single Add State
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [selectedListIds, setSelectedListIds] = useState([]);
  const [adding, setAdding] = useState(false);

  // Bulk Add State
  const [activeTab, setActiveTab] = useState('single'); // 'single' or 'bulk'
  const [bulkEmails, setBulkEmails] = useState('');
  
  // Edit State
  const [editingId, setEditingId] = useState(null);
  const [editEmail, setEditEmail] = useState('');
  const [editName, setEditName] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editListIds, setEditListIds] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [subsRes, listsRes] = await Promise.all([
        axios.get('http://localhost:5000/api/subscribers?limit=50'), // Increased limit for demo
        axios.get('http://localhost:5000/api/lists')
      ]);
      setSubscribers(subsRes.data.data || []);
      setLists(listsRes.data || []);
      if (listsRes.data && listsRes.data.length > 0) {
        setSelectedListIds([listsRes.data[0].id]);
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
      alert("Please enter email and select at least one list.");
      return;
    }

    try {
      setAdding(true);
      const subRes = await axios.post('http://localhost:5000/api/subscribers', {
        email: newEmail,
        first_name: newName,
        status: 'subscribed'
      });

      const subId = subRes.data.id;
      if (subId) {
        await axios.put('http://localhost:5000/api/lists/sync', {
          subscriber_id: subId,
          list_ids: selectedListIds.map(Number)
        });
      }

      setNewEmail('');
      setNewName('');
      fetchData(); 
      alert('Contact added successfully!');
    } catch (error) {
      console.error(error);
      alert('Failed to add contact.');
    } finally {
      setAdding(false);
    }
  };

  const handleBulkAdd = async (e) => {
    e.preventDefault();
    if (!bulkEmails.trim() || selectedListIds.length === 0) {
      alert("Please enter emails and select at least one list.");
      return;
    }

    // Split by comma or newline and filter empty
    const emails = bulkEmails.split(/[,\\n]+/).map(e => e.trim()).filter(e => e !== '');
    if (emails.length === 0) return;

    try {
      setAdding(true);
      
      // Since our API currently accepts one at a time for creation, we'll loop it for the demo
      // In a real production app, you'd add a bulk insert endpoint.
      let addedIds = [];
      for (const email of emails) {
        if (!email.includes('@')) continue; // skip invalid formats broadly
        const subRes = await axios.post('http://localhost:5000/api/subscribers', {
          email: email,
          first_name: '',
          status: 'subscribed'
        });
        if (subRes.data.id) addedIds.push(subRes.data.id);
      }

      if (addedIds.length > 0) {
        for (const subId of addedIds) {
          await axios.put('http://localhost:5000/api/lists/sync', {
            subscriber_id: subId,
            list_ids: selectedListIds.map(Number)
          });
        }
      }

      setBulkEmails('');
      fetchData(); 
      alert(`Successfully added ${addedIds.length} contacts!`);
    } catch (error) {
      console.error(error);
      alert('Failed to bulk add contacts.');
    } finally {
      setAdding(false);
    }
  };

  const startEdit = (sub) => {
    setEditingId(sub.id);
    setEditEmail(sub.email);
    setEditName(sub.first_name || '');
    setEditStatus(sub.status || 'subscribed');
    setEditListIds(sub.list_ids ? sub.list_ids.split(',').map(Number) : []);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async (id) => {
    try {
      await axios.post('http://localhost:5000/api/subscribers', {
        email: editEmail,
        first_name: editName,
        status: editStatus
      });
      
      await axios.put('http://localhost:5000/api/lists/sync', {
        subscriber_id: id,
        list_ids: editListIds.map(Number)
      });
      
      setEditingId(null);
      fetchData();
    } catch (error) {
      alert('Failed to update contact.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this contact?')) return;
    try {
      await axios.delete(`http://localhost:5000/api/subscribers/${id}`);
      fetchData();
    } catch (error) {
      alert('Failed to delete contact.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Contacts Management</h2>
          <p className="text-gray-500 mt-1 text-sm">Add, edit, and organize your subscribers across different lists.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Panel: Add Contact */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm lg:col-span-1 h-max overflow-hidden">
          <div className="flex border-b border-gray-100">
            <button 
              onClick={() => setActiveTab('single')}
              className={`flex-1 py-3.5 text-sm font-semibold transition-colors ${activeTab === 'single' ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50/30' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
            >
              Single Add
            </button>
            <button 
              onClick={() => setActiveTab('bulk')}
              className={`flex-1 py-3.5 text-sm font-semibold transition-colors ${activeTab === 'bulk' ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50/30' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
            >
              Bulk Import
            </button>
          </div>
          
          <div className="p-6">
            {activeTab === 'single' ? (
              <form onSubmit={handleAddContact} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address *</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">First Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input 
                      type="text" 
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm transition-shadow"
                      placeholder="Optional"
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-sm font-medium text-gray-700">Target Lists *</label>
                    <Link to="/lists" className="text-xs text-primary-600 hover:text-primary-700 flex items-center">
                      <Settings2 size={14} className="mr-1"/> Manage Lists
                    </Link>
                  </div>
                  <div className="space-y-2 max-h-32 overflow-y-auto p-2.5 border border-gray-300 rounded-xl bg-gray-50/50">
                    {lists.map(list => (
                      <label key={list.id} className="flex items-center space-x-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-100 p-1.5 rounded transition-colors">
                        <input 
                          type="checkbox" 
                          checked={selectedListIds.includes(list.id)}
                          onChange={() => {
                            setSelectedListIds(prev => 
                              prev.includes(list.id) ? prev.filter(id => id !== list.id) : [...prev, list.id]
                            );
                          }}
                          className="rounded text-primary-600 focus:ring-primary-500"
                        />
                        <span>{list.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <button 
                  type="submit"
                  disabled={adding}
                  className="w-full mt-2 bg-primary-600 text-white font-semibold py-2.5 rounded-xl hover:bg-primary-700 transition-all shadow-sm shadow-primary-200 disabled:opacity-50 flex justify-center items-center"
                >
                  {adding ? 'Saving...' : <><Plus size={18} className="mr-2"/> Add Contact</>}
                </button>
              </form>
            ) : (
              <form onSubmit={handleBulkAdd} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Addresses (comma separated) *</label>
                  <textarea 
                    required
                    rows="5"
                    value={bulkEmails}
                    onChange={e => setBulkEmails(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm transition-shadow resize-none"
                    placeholder="user1@example.com, user2@gmail.com, ..."
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-sm font-medium text-gray-700">Target Lists *</label>
                    <button type="button" onClick={() => setShowListModal(true)} className="text-xs text-primary-600 hover:text-primary-700 flex items-center">
                      <Settings2 size={14} className="mr-1"/> Manage Lists
                    </button>
                  </div>
                  <div className="space-y-2 max-h-32 overflow-y-auto p-2.5 border border-gray-300 rounded-xl bg-gray-50/50">
                    {lists.map(list => (
                      <label key={list.id} className="flex items-center space-x-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-100 p-1.5 rounded transition-colors">
                        <input 
                          type="checkbox" 
                          checked={selectedListIds.includes(list.id)}
                          onChange={() => {
                            setSelectedListIds(prev => 
                              prev.includes(list.id) ? prev.filter(id => id !== list.id) : [...prev, list.id]
                            );
                          }}
                          className="rounded text-primary-600 focus:ring-primary-500"
                        />
                        <span>{list.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <button 
                  type="submit"
                  disabled={adding}
                  className="w-full mt-2 bg-primary-600 text-white font-semibold py-2.5 rounded-xl hover:bg-primary-700 transition-all shadow-sm shadow-primary-200 disabled:opacity-50 flex justify-center items-center"
                >
                  {adding ? 'Importing...' : <><Upload size={18} className="mr-2"/> Import Contacts</>}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Right Panel: Contacts Table */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm lg:col-span-2 overflow-hidden flex flex-col">
          <div className="p-5 border-b border-gray-100 bg-white flex justify-between items-center">
            <h3 className="font-bold text-gray-900 flex items-center">
              <Users size={18} className="mr-2 text-primary-600"/>
              Subscribers Directory
            </h3>
            <span className="bg-gray-100 text-gray-600 px-3 py-1 text-xs font-semibold rounded-lg">
              {subscribers.length} Contacts
            </span>
          </div>
          
          <div className="overflow-x-auto flex-1">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50/50 text-gray-500 font-semibold border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 rounded-tl-xl">Email Address</th>
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Target List</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                       <div className="animate-pulse flex flex-col items-center">
                        <div className="h-8 w-8 bg-gray-200 rounded-full mb-4"></div>
                        <div className="h-4 w-32 bg-gray-200 rounded"></div>
                      </div>
                    </td>
                  </tr>
                ) : subscribers.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500 font-medium">No contacts found in the directory.</td>
                  </tr>
                ) : (
                  subscribers.map(sub => (
                    <tr key={sub.id} className={`hover:bg-gray-50/80 transition-colors ${editingId === sub.id ? 'bg-primary-50/20' : ''}`}>
                      <td className="px-6 py-3.5">
                        {editingId === sub.id ? (
                          <input 
                            type="email" 
                            value={editEmail} 
                            onChange={(e)=>setEditEmail(e.target.value)}
                            className="w-full px-2 py-1 border border-primary-300 rounded text-sm outline-none focus:ring-1 focus:ring-primary-500"
                          />
                        ) : (
                          <span className="font-semibold text-gray-900">{sub.email}</span>
                        )}
                      </td>
                      <td className="px-6 py-3.5">
                        {editingId === sub.id ? (
                          <input 
                            type="text" 
                            value={editName} 
                            onChange={(e)=>setEditName(e.target.value)}
                            className="w-full px-2 py-1 border border-primary-300 rounded text-sm outline-none focus:ring-1 focus:ring-primary-500"
                          />
                        ) : (
                          <span className="text-gray-600">{sub.first_name || '-'}</span>
                        )}
                      </td>
                      <td className="px-6 py-3.5">
                        {editingId === sub.id ? (
                          <select 
                            value={editStatus} 
                            onChange={(e)=>setEditStatus(e.target.value)}
                            className="w-full px-2 py-1 border border-primary-300 rounded text-sm outline-none"
                          >
                            <option value="subscribed">Subscribed</option>
                            <option value="unsubscribed">Unsubscribed</option>
                          </select>
                        ) : (
                          <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${sub.status === 'subscribed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {sub.status}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3.5">
                        {editingId === sub.id ? (
                          <div className="space-y-1 max-h-24 overflow-y-auto p-1.5 border border-primary-300 rounded bg-white">
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
                          <span className="text-gray-600 text-sm">
                            {sub.list_names || 'Assigned'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        {editingId === sub.id ? (
                          <div className="flex justify-end space-x-2">
                            <button onClick={() => saveEdit(sub.id)} className="p-1.5 bg-green-500 text-white rounded hover:bg-green-600 transition-colors" title="Save"><Check size={14}/></button>
                            <button onClick={cancelEdit} className="p-1.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors" title="Cancel"><X size={14}/></button>
                          </div>
                        ) : (
                          <div className="flex justify-end space-x-1">
                            <button onClick={() => startEdit(sub)} className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors" title="Edit Contact">
                              <Edit2 size={16} />
                            </button>
                            <button onClick={() => handleDelete(sub.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete Contact">
                              <Trash2 size={16} />
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
    </div>
  );
};

export default Contacts;
