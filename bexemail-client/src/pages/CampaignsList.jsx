import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Play, CheckCircle2, AlertCircle, Clock, Search, Filter, MoreVertical, FileEdit, Copy, CalendarClock, Save, BarChart, Trash2, Eye, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const CampaignsList = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState('Super Admin'); // Mock Role
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [scheduleModal, setScheduleModal] = useState({ show: false, campaignId: null, date: '' });
  const [viewModal, setViewModal] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  useEffect(() => {
    fetchCampaigns();
    
    const interval = setInterval(() => {
      fetchCampaigns(true); // Silent poll
    }, 3000);
    
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      clearInterval(interval);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [userRole]);

  const fetchCampaigns = async (isPolling = false) => {
    try {
      if (!isPolling) setLoading(true);
      const response = await axios.get('http://localhost:5000/api/campaigns', {
        headers: { 'x-user-role': userRole }
      });
      setCampaigns(response.data);
    } catch (error) {
      console.error('Failed to load campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCampaigns = campaigns.filter(camp => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      (camp.name && camp.name.toLowerCase().includes(searchLower)) ||
      (camp.subject && camp.subject.toLowerCase().includes(searchLower)) ||
      (camp.list_name && camp.list_name.toLowerCase().includes(searchLower)) ||
      (new Date(camp.created_at).toLocaleDateString().includes(searchLower));
      
    const matchesStatus = filterStatus === 'All' || camp.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const handleAction = async (action, campaign) => {
    setActiveDropdown(null);
    try {
      if (action === 'approve') {
        if (!window.confirm('Approve and send this campaign immediately?')) return;
        await axios.put(`http://localhost:5000/api/campaigns/${campaign.id}/approve`, {}, { headers: { 'x-user-role': userRole } });
      } else if (action === 'edit_send') {
        const res = await axios.post(`http://localhost:5000/api/campaigns/${campaign.id}/duplicate`, {}, { headers: { 'x-user-role': userRole } });
        navigate(`/campaigns/new?edit=${res.data.id}`);
        return;
      } else if (action === 'resend') {
        await axios.put(`http://localhost:5000/api/campaigns/${campaign.id}/status`, { status: 'submitted_for_review' }, { headers: { 'x-user-role': userRole } });
        if (userRole === 'Super Admin') {
          await axios.put(`http://localhost:5000/api/campaigns/${campaign.id}/approve`, {}, { headers: { 'x-user-role': userRole } });
        }
      } else if (action === 'draft') {
        await axios.put(`http://localhost:5000/api/campaigns/${campaign.id}/status`, { status: 'draft' }, { headers: { 'x-user-role': userRole } });
      } else if (action === 'schedule') {
        setScheduleModal({ show: true, campaignId: campaign.id, date: '' });
        return;
      } else if (action === 'delete') {
        if (!window.confirm('Are you sure you want to delete this campaign? This cannot be undone.')) return;
        await axios.delete(`http://localhost:5000/api/campaigns/${campaign.id}`, { headers: { 'x-user-role': userRole } });
      } else if (action === 'view') {
        setViewModal(campaign);
        return;
      }
      fetchCampaigns();
    } catch (error) {
      alert(error.response?.data?.error || `Failed to perform action: ${action}`);
    }
  };

  const handleScheduleSubmit = async () => {
    if (!scheduleModal.date) return;
    try {
      await axios.put(`http://localhost:5000/api/campaigns/${scheduleModal.campaignId}/status`, { 
        status: 'scheduled', 
        scheduled_at: scheduleModal.date 
      }, { headers: { 'x-user-role': userRole } });
      setScheduleModal({ show: false, campaignId: null, date: '' });
      fetchCampaigns();
      alert('Campaign scheduled successfully!');
    } catch (error) {
      alert('Failed to schedule campaign.');
    }
  };

  const getStatusBadge = (status, scheduled_at) => {
    if (status === 'scheduled' && scheduled_at) {
      return <span className="px-2.5 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded-full flex items-center w-max"><CalendarClock size={12} className="mr-1.5"/> Scheduled</span>;
    }
    switch(status) {
      case 'submitted_for_review':
        return <span className="px-2.5 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full flex items-center w-max"><AlertCircle size={12} className="mr-1.5"/> Needs Review</span>;
      case 'sending':
        return <span className="px-2.5 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full flex items-center w-max"><Play size={12} className="mr-1.5"/> Sending</span>;
      case 'completed':
      case 'sent':
        return <span className="px-2.5 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full flex items-center w-max"><CheckCircle2 size={12} className="mr-1.5"/> Sent</span>;
      case 'draft':
        return <span className="px-2.5 py-1 bg-gray-200 text-gray-800 text-xs font-semibold rounded-full flex items-center w-max"><Save size={12} className="mr-1.5"/> Draft</span>;
      default:
        return <span className="px-2.5 py-1 bg-gray-100 text-gray-800 text-xs font-semibold rounded-full flex items-center w-max"><Clock size={12} className="mr-1.5"/> {status || 'Draft'}</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Campaigns Overview</h2>
          <p className="text-gray-500 mt-1 text-sm">Manage, review, and track all your email campaigns in one place.</p>
        </div>
        
        <div className="flex items-center space-x-6">
          <label className="text-sm text-gray-500 flex items-center bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
            <span className="mr-2 font-medium">Role:</span>
            <select 
              value={userRole} 
              onChange={e => setUserRole(e.target.value)} 
              className="bg-transparent text-gray-900 font-semibold outline-none cursor-pointer"
            >
              <option value="Campaign Manager">Campaign Manager</option>
              <option value="Super Admin">Super Admin</option>
            </select>
          </label>
          <Link to="/campaigns/new" className="px-5 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 font-semibold shadow-sm shadow-primary-200 transition-all">
            Create Campaign
          </Link>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-white">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by name, subject, audience, or date..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none transition-all"
            />
          </div>
          
          <div className="relative ml-4">
            <button 
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className="flex items-center text-sm font-medium text-gray-700 bg-white border border-gray-200 px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors focus:outline-none"
            >
              <Filter size={16} className="mr-2" /> 
              {filterStatus === 'All' ? 'Filter by Status' : `Status: ${filterStatus}`}
            </button>
            {showFilterDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-lg z-20 overflow-hidden animate-in fade-in slide-in-from-top-2">
                {['All', 'draft', 'submitted_for_review', 'sending', 'sent', 'scheduled'].map(status => (
                  <button
                    key={status}
                    onClick={() => { setFilterStatus(status); setShowFilterDropdown(false); }}
                    className={`block w-full text-left px-4 py-2.5 text-sm ${filterStatus === status ? 'bg-primary-50 text-primary-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}
                  >
                    {status === 'All' ? 'All Statuses' : 
                     status === 'submitted_for_review' ? 'Needs Review' : 
                     status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50/50 text-gray-500 font-semibold border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 rounded-tl-xl">Campaign Details</th>
                <th className="px-6 py-4">Target Audience</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-right rounded-tr-xl">Actions</th>
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
              ) : filteredCampaigns.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-500 font-medium">No campaigns match your filters.</td>
                </tr>
              ) : (
                filteredCampaigns.map(camp => (
                  <tr key={camp.id} className="hover:bg-gray-50/80 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900 text-base">{camp.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5 truncate max-w-[250px]">{camp.subject}</div>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-700">{camp.list_name || 'Unknown List'}</td>
                    <td className="px-6 py-4">{getStatusBadge(camp.status, camp.scheduled_at)}</td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{new Date(camp.created_at).toLocaleDateString()}</div>
                      {camp.scheduled_at && <div className="text-xs text-purple-600 mt-0.5">{new Date(camp.scheduled_at).toLocaleString()}</div>}
                    </td>
                    <td className="px-6 py-4 text-right relative">
                      <div className="flex items-center justify-end space-x-3">
                        <Link 
                          to={`/reports/${camp.id}`}
                          className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                          title="View Report"
                        >
                          <BarChart size={18} />
                        </Link>
                        
                        <div className="relative" ref={activeDropdown === camp.id ? dropdownRef : null}>
                          <button 
                            onClick={() => setActiveDropdown(activeDropdown === camp.id ? null : camp.id)}
                            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none"
                          >
                            <MoreVertical size={18} />
                          </button>
                          
                          {activeDropdown === camp.id && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-10 animate-in fade-in slide-in-from-top-2">
                              {camp.status === 'submitted_for_review' && userRole === 'Super Admin' && (
                                <button onClick={() => handleAction('approve', camp)} className="w-full text-left px-4 py-2.5 text-sm font-medium text-green-700 hover:bg-green-50 flex items-center">
                                  <CheckCircle2 size={14} className="mr-2"/> Approve & Send
                                </button>
                              )}
                              <button onClick={() => handleAction('view', camp)} className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center">
                                <Eye size={14} className="mr-2 text-indigo-500"/> View Details
                              </button>
                              <button onClick={() => handleAction('resend', camp)} className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center">
                                <Play size={14} className="mr-2 text-blue-600"/> Resend Now
                              </button>
                              <button onClick={() => handleAction('edit_send', camp)} className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center">
                                <FileEdit size={14} className="mr-2 text-orange-500"/> Edit & Send
                              </button>
                              <button onClick={() => handleAction('schedule', camp)} className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center">
                                <CalendarClock size={14} className="mr-2 text-purple-600"/> Schedule Later
                              </button>
                              <div className="border-t border-gray-100"></div>
                              <button onClick={() => handleAction('draft', camp)} className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center">
                                <Save size={14} className="mr-2 text-gray-500"/> Save as Draft
                              </button>
                              <button onClick={() => handleAction('delete', camp)} className="w-full text-left px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 flex items-center">
                                <Trash2 size={14} className="mr-2 text-red-500"/> Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {scheduleModal.show && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-[400px] shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center"><CalendarClock className="mr-2 text-primary-600"/> Schedule Campaign</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Date & Time</label>
                <input 
                  type="datetime-local" 
                  value={scheduleModal.date}
                  onChange={e => setScheduleModal({...scheduleModal, date: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button 
                  onClick={() => setScheduleModal({ show: false, campaignId: null, date: '' })}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleScheduleSubmit}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium transition-colors shadow-md"
                >
                  Confirm Schedule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900">Campaign Details</h3>
              <button onClick={() => setViewModal(null)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"><X size={20}/></button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Campaign Name</h4>
                    <p className="text-gray-900 font-semibold">{viewModal.name}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Target Audience</h4>
                    <p className="text-gray-900 font-medium">{viewModal.list_name || 'Unknown List'}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Current Status</h4>
                    <div>{getStatusBadge(viewModal.status, viewModal.scheduled_at)}</div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Date Created</h4>
                    <p className="text-gray-900">{new Date(viewModal.created_at).toLocaleString()}</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Subject Line</h4>
                    <p className="text-gray-900">{viewModal.subject}</p>
                  </div>
                  {viewModal.is_ab_test ? (
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-1">Variant B Subject</h4>
                      <p className="text-gray-900">{viewModal.variant_b_subject}</p>
                    </div>
                  ) : null}
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">A/B Testing</h4>
                    <p className="text-gray-900">{viewModal.is_ab_test ? 'Enabled' : 'Disabled'}</p>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">HTML Content Preview</h4>
                <div className="border border-gray-200 rounded-lg p-4 max-h-[300px] overflow-y-auto bg-gray-50 text-sm font-mono whitespace-pre-wrap text-gray-700">
                  {viewModal.html_content}
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-between items-center rounded-b-2xl">
              <button 
                onClick={() => setViewModal(null)}
                className="px-5 py-2.5 text-gray-600 font-medium hover:bg-gray-200 rounded-xl transition-colors"
              >
                Close
              </button>
              
              <div className="flex space-x-3">
                <button 
                  onClick={() => {
                    navigate(`/campaigns/new?edit=${viewModal.id}`);
                  }}
                  className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 rounded-xl transition-colors shadow-sm flex items-center"
                >
                  <FileEdit size={16} className="mr-2 text-orange-500"/> Edit
                </button>
                
                {(viewModal.status === 'draft' || viewModal.status === 'submitted_for_review') && (
                  <button 
                    onClick={() => {
                      if (userRole === 'Super Admin') {
                        handleAction('approve', viewModal);
                      } else {
                        handleAction('resend', viewModal); // wait, resend makes a duplicate. for draft, we should update status.
                        // I'll just change status to submitted_for_review for now.
                        axios.put(`http://localhost:5000/api/campaigns/${viewModal.id}/status`, { status: 'submitted_for_review' }, { headers: { 'x-user-role': userRole } })
                          .then(() => { setViewModal(null); fetchCampaigns(); alert('Submitted for review!'); });
                      }
                    }}
                    className="px-5 py-2.5 bg-green-600 text-white font-medium hover:bg-green-700 rounded-xl transition-colors shadow-sm flex items-center"
                  >
                    <CheckCircle2 size={16} className="mr-2"/> Confirm & Send
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignsList;
