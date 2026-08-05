import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Play, CheckCircle2, AlertCircle, Clock, Search, Filter, MoreVertical, FileEdit, Copy, CalendarClock, Save, BarChart, Trash2, Eye, X, Send, RefreshCw, Mail, Users, FileText, XCircle, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useModal } from '../context/ModalContext';

const CampaignsList = () => {
  const { confirm, alert: customAlert } = useModal();

  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userRole, setUserRole] = useState('Super Admin'); // Mock Role
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [scheduleModal, setScheduleModal] = useState({ show: false, campaignId: null, date: '' });
  const [viewModal, setViewModal] = useState(null);
  const [emailListModal, setEmailListModal] = useState({ show: false, campaignName: '', emails: [] });
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [jumpPageInput, setJumpPageInput] = useState('1');
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  // Auxiliary data for rich modal preview
  const [senders, setSenders] = useState([]);
  const [lists, setLists] = useState([]);
  const [systemSmtp, setSystemSmtp] = useState({});

  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchCampaigns();
    fetchAuxiliaryData();

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

  const fetchAuxiliaryData = async () => {
    try {
      const [sendersRes, listsRes, settingsRes] = await Promise.all([
        axios.get('http://localhost:5000/api/senders').catch(() => ({ data: [] })),
        axios.get('http://localhost:5000/api/lists').catch(() => ({ data: [] })),
        axios.get('http://localhost:5000/api/settings', { headers: { 'x-user-role': 'Super Admin' } }).catch(() => ({ data: {} }))
      ]);
      setSenders(sendersRes.data || []);
      setLists(listsRes.data || []);
      setSystemSmtp(settingsRes.data || {});
    } catch (e) {
      console.error('Fetch auxiliary data error:', e);
    }
  };

  const fetchCampaigns = async (isPolling = false) => {
    try {
      if (!isPolling) setLoading(true);
      const response = await axios.get('http://localhost:5000/api/campaigns', {
        headers: { 'x-user-role': userRole }
      });
      setCampaigns(response.data);
      setError(null);
    } catch (error) {
      console.error('Failed to load campaigns:', error);
      setError(error.response?.data?.error || error.message || 'Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  const filteredCampaigns = campaigns.filter(camp => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      (camp.id && `#${camp.id}`.toLowerCase().includes(searchLower)) ||
      (camp.name && camp.name.toLowerCase().includes(searchLower)) ||
      (camp.subject && camp.subject.toLowerCase().includes(searchLower)) ||
      (camp.target_email && camp.target_email.toLowerCase().includes(searchLower)) ||
      (camp.list_name && camp.list_name.toLowerCase().includes(searchLower)) ||
      (new Date(camp.created_at).toLocaleDateString().includes(searchLower));

    const matchesStatus = filterStatus === 'All' || camp.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus]);

  const totalItems = filteredCampaigns.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalItems, totalPages, currentPage]);

  useEffect(() => {
    setJumpPageInput(currentPage.toString());
  }, [currentPage]);

  const handleJumpPage = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const pageNum = parseInt(jumpPageInput, 10);
    if (!isNaN(pageNum)) {
      const clamped = Math.min(Math.max(1, pageNum), totalPages);
      setCurrentPage(clamped);
      setJumpPageInput(clamped.toString());
    } else {
      setJumpPageInput(currentPage.toString());
    }
  };

  const indexOfFirstItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const indexOfLastItem = Math.min(currentPage * itemsPerPage, totalItems);
  const paginatedCampaigns = filteredCampaigns.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = startPage + maxVisiblePages - 1;

    if (endPage > totalPages) {
      endPage = totalPages;
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await fetchCampaigns(false);
    setTimeout(() => setIsRefreshing(false), 700);
  };

  const handleAction = async (action, campaign) => {
    setActiveDropdown(null);
    try {
      if (action === 'approve') {
        const isOk = await confirm({
          title: 'Accept Review & Send Campaign',
          message: `Are you sure you want to accept review and dispatch "${campaign.name}" immediately?`,
          confirmText: 'Accept Review & Send',
          type: 'warning'
        });
        if (!isOk) return;
        setCampaigns(prev => prev.map(c => c.id === campaign.id ? { ...c, status: 'sending' } : c));
        await axios.put(`http://localhost:5000/api/campaigns/${campaign.id}/approve`, {}, { headers: { 'x-user-role': userRole } });
        await fetchCampaigns(true);
        customAlert({
          title: 'Campaign Dispatched',
          message: `Campaign "${campaign.name}" accepted and sent successfully!`,
          type: 'success'
        });
        return;
      } else if (action === 'edit' || action === 'edit_send') {
        navigate(`/campaigns/new?edit=${campaign.id}`);
        return;
      } else if (action === 'duplicate') {
        await axios.post(`http://localhost:5000/api/campaigns/${campaign.id}/duplicate`, {}, { headers: { 'x-user-role': userRole } });
        fetchCampaigns();
        customAlert({
          title: 'Success',
          message: 'Campaign duplicated as draft copy!',
          type: 'success'
        });
        return;
      } else if (action === 'resend') {
        await axios.put(`http://localhost:5000/api/campaigns/${campaign.id}/status`, { status: 'submitted_for_review' }, { headers: { 'x-user-role': userRole } });
        if (userRole === 'Super Admin') {
          await axios.put(`http://localhost:5000/api/campaigns/${campaign.id}/approve`, {}, { headers: { 'x-user-role': userRole } });
        }
      } else if (action === 'discard' || action === 'reject') {
        const isOk = await confirm({
          title: 'Discard / Reject Review',
          message: `Are you sure you want to reject review for "${campaign.name}" and return it to draft state?`,
          confirmText: 'Discard & Set as Draft',
          type: 'danger'
        });
        if (!isOk) return;
        await axios.put(`http://localhost:5000/api/campaigns/${campaign.id}/status`, { status: 'draft' }, { headers: { 'x-user-role': userRole } });
        fetchCampaigns();
        customAlert({
          title: 'Review Discarded',
          message: `Campaign "${campaign.name}" returned to draft.`,
          type: 'info'
        });
        return;
      } else if (action === 'draft') {
        await axios.put(`http://localhost:5000/api/campaigns/${campaign.id}/status`, { status: 'draft' }, { headers: { 'x-user-role': userRole } });
      } else if (action === 'schedule') {
        setScheduleModal({ show: true, campaignId: campaign.id, date: '' });
        return;
      } else if (action === 'delete') {
        const isOk = await confirm({
          title: 'Delete Campaign',
          message: 'Are you sure you want to delete this campaign? This cannot be undone.',
          confirmText: 'Delete',
          type: 'danger'
        });
        if (!isOk) return;
        await axios.delete(`http://localhost:5000/api/campaigns/${campaign.id}`, { headers: { 'x-user-role': userRole } });
        fetchCampaigns();
        customAlert({
          title: 'Deleted',
          message: 'Campaign deleted successfully.',
          type: 'success'
        });
        return;
      } else if (action === 'view_eye') {
        setViewModal({ ...campaign, modalTitle: 'Campaign Details' });
        return;
      } else if (action === 'view_review' || action === 'view') {
        setViewModal({ ...campaign, modalTitle: 'View and Review Campaign' });
        return;
      }
      fetchCampaigns();
    } catch (error) {
      console.error(`Failed to ${action} campaign:`, error);
      customAlert({
        title: 'Error',
        message: error.response?.data?.error || error.message || `Failed to ${action} campaign`,
        type: 'danger'
      });
    }
  };

  const handleScheduleSubmit = async () => {
    if (!scheduleModal.date) {
      customAlert({
        title: 'Validation Error',
        message: 'Please select a valid date and time.',
        type: 'warning'
      });
      return;
    }
    try {
      await axios.put(`http://localhost:5000/api/campaigns/${scheduleModal.campaignId}/schedule`, {
        scheduled_at: scheduleModal.date
      }, { headers: { 'x-user-role': userRole } });
      
      setScheduleModal({ show: false, campaignId: null, date: '' });
      fetchCampaigns();
      customAlert({
        title: 'Campaign Scheduled',
        message: `Campaign scheduled for ${new Date(scheduleModal.date).toLocaleString()} successfully!`,
        type: 'success'
      });
    } catch (error) {
      console.error('Failed to schedule campaign:', error);
      customAlert({
        title: 'Scheduling Failed',
        message: error.response?.data?.error || error.message || 'Failed to schedule campaign',
        type: 'danger'
      });
    }
  };

  const getStatusBadge = (status, scheduledAt) => {
    switch (status) {
      case 'sent':
      case 'completed':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800"><CheckCircle2 size={12} className="mr-1"/> Sent</span>;
      case 'submitted_for_review':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800"><AlertCircle size={12} className="mr-1"/> Review Pending</span>;
      case 'scheduled':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800" title={scheduledAt ? `Scheduled for: ${new Date(scheduledAt).toLocaleString()}` : ''}>
            <CalendarClock size={12} className="mr-1"/> Scheduled
          </span>
        );
      case 'sending':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800"><RefreshCw size={12} className="mr-1 animate-spin"/> Sending</span>;
      case 'failed':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800"><AlertCircle size={12} className="mr-1"/> Failed</span>;
      case 'draft':
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800"><Save size={12} className="mr-1"/> Draft</span>;
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-gray-200/60 gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2.5">
            <Send className="text-primary-600" size={26} /> Email Campaigns Directory
          </h2>
          <p className="text-gray-500 mt-1 text-sm">
            Create, schedule, review, and track all email campaign broadcasts across your system.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/campaigns/new')}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold shadow transition-all"
          >
            + Create New Campaign
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search campaigns by name, subject, or audience..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="flex items-center gap-2">
          {['All', 'sent', 'submitted_for_review', 'scheduled', 'draft'].map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all capitalize ${
                filterStatus === status 
                  ? 'bg-primary-600 text-white shadow-sm' 
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {status === 'submitted_for_review' ? 'Review Pending' : status}
            </button>
          ))}

          <button 
            onClick={handleManualRefresh} 
            className="p-2 text-gray-500 hover:bg-gray-100 hover:text-primary-600 rounded-xl transition-colors ml-2"
            title="Refresh List"
          >
            <RefreshCw size={16} className={isRefreshing || loading ? 'animate-spin text-primary-600' : ''} />
          </button>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden min-h-[400px]">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-600 table-auto">
            <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-200 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3.5">Campaign Name</th>
                <th className="px-4 py-3.5">Subject Line</th>
                <th className="px-4 py-3.5">Target Audience</th>
                <th className="px-4 py-3.5 whitespace-nowrap">Sender Email Counter</th>
                <th className="px-4 py-3.5 whitespace-nowrap">Status</th>
                <th className="px-4 py-3.5 whitespace-nowrap">Opened / Not Opened</th>
                <th className="px-4 py-3.5 whitespace-nowrap">Date Created</th>
                <th className="px-4 py-3.5 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && campaigns.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-12 text-center text-gray-400 font-medium">Loading campaigns...</td>
                </tr>
              ) : filteredCampaigns.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-12 text-center text-gray-400 font-semibold">No email campaigns found matching your criteria.</td>
                </tr>
              ) : (
                paginatedCampaigns.map(camp => (
                  <tr key={camp.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-4 py-3 font-bold text-gray-900 max-w-[160px]">
                      <div className="flex items-start gap-2">
                        <span className="font-mono text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-extrabold flex-shrink-0 mt-0.5">#{camp.id}</span>
                        <span className="text-xs font-bold whitespace-normal break-words leading-tight">{camp.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800 max-w-[180px] whitespace-normal break-words leading-tight" title={camp.subject}>
                      {camp.subject}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-700 max-w-[200px]">
                      {(() => {
                        if (camp.target_email) {
                          const emails = camp.target_email.split(',').map(e => e.trim()).filter(Boolean);
                          if (emails.length > 1) {
                            return (
                              <div className="flex flex-col items-start gap-1">
                                <span className="text-gray-900 font-semibold text-xs truncate max-w-[170px] block" title={camp.target_email}>
                                  {emails[0]}
                                </span>
                                <button
                                  onClick={() => setEmailListModal({ show: true, campaignName: camp.name, emails: emails })}
                                  className="whitespace-nowrap inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold border border-indigo-200 rounded-md text-[10px] transition-colors shadow-xs"
                                  title="Click to view recipient email list"
                                >
                                  <Eye size={11} className="text-indigo-600 flex-shrink-0" />
                                  <span>+{emails.length - 1} more</span>
                                </button>
                              </div>
                            );
                          }
                          return (
                            <div className="flex flex-col items-start gap-0.5">
                              <span className="text-gray-900 font-semibold text-xs truncate block max-w-[180px]" title={camp.target_email}>
                                {camp.target_email}
                              </span>
                              <span className="text-[10px] text-gray-400 font-medium">Single Recipient</span>
                            </div>
                          );
                        }
                        return (
                          <div className="flex flex-col items-start gap-0.5">
                            <span className="text-gray-900 font-semibold text-xs truncate block max-w-[180px]" title={camp.list_name || 'All Subscribers List'}>
                              {camp.list_name || 'All Subscribers List'}
                            </span>
                            <span className="text-[10px] text-gray-400 font-medium">Target Audience List</span>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {(() => {
                        const historyIds = String(camp.sender_history_ids || camp.sender_history || camp.sender_id || '').split(',').map(s => s.trim()).filter(Boolean);
                        const count = camp.sender_count || Math.max(historyIds.length, 1);
                        const usedSendersList = senders.filter(s => historyIds.includes(String(s.id)));
                        const primarySender = usedSendersList[0] || senders.find(s => s.id.toString() === String(camp.sender_id)) || senders.find(s => s.is_default);

                        return (
                          <div className="flex flex-col items-start gap-1">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-800 font-extrabold text-[11px] rounded-lg border border-blue-200 shadow-2xs">
                              <Mail size={12} className="text-blue-600" />
                              <span>{count} Sender{count > 1 ? 's' : ''} Used</span>
                            </span>
                            {usedSendersList.length > 0 ? (
                              <span className="text-[10px] text-gray-500 font-medium truncate max-w-[150px]" title={usedSendersList.map(s => s.email).join(', ')}>
                                {usedSendersList.map(s => s.name || s.email).join(', ')}
                              </span>
                            ) : primarySender ? (
                              <span className="text-[10px] text-gray-500 font-medium truncate max-w-[150px]" title={primarySender.email}>
                                {primarySender.name || primarySender.email}
                              </span>
                            ) : null}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {getStatusBadge(camp.status, camp.scheduled_at)}
                    </td>
                    <td className="px-4 py-3 font-medium whitespace-nowrap">
                      <div className="flex flex-col items-start gap-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-green-50 text-green-700 border border-green-200" title="Opened Emails">
                          <Eye size={11} className="mr-1 text-green-600" /> {camp.opened_count || 0} Opened
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-gray-50 text-gray-600 border border-gray-200" title="Not Opened Emails">
                          {Math.max(0, (camp.delivered_count || 0) - (camp.opened_count || 0))} Not Opened
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-500 whitespace-nowrap text-[11px]">
                      <div className="flex flex-col items-start gap-0.5">
                        <span className="font-bold text-gray-900 text-xs">{new Date(camp.created_at).toLocaleDateString()}</span>
                        <span className="text-gray-400 text-[11px] font-medium">{new Date(camp.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right relative whitespace-nowrap">
                      <div className="flex items-center justify-end space-x-2">
                        <Link 
                          to={`/reports/${camp.id}`}
                          className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                          title="View Analytics Report"
                        >
                          <BarChart size={17} />
                        </Link>

                        <button
                          onClick={() => handleAction('view_eye', camp)}
                          className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Campaign Details"
                        >
                          <Eye size={17} />
                        </button>
                        
                        <div className="relative" ref={activeDropdown === camp.id ? dropdownRef : null}>
                          <button 
                            onClick={() => setActiveDropdown(activeDropdown === camp.id ? null : camp.id)}
                            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none"
                          >
                            <MoreVertical size={17} />
                          </button>
                          
                          {activeDropdown === camp.id && (
                            <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-20 animate-in fade-in slide-in-from-top-2">
                              <button onClick={() => handleAction('view_review', camp)} className="w-full text-left px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                                <Eye size={14} className="text-indigo-500"/> View Details & Review
                              </button>

                              {camp.status !== 'sent' && camp.status !== 'sending' && (
                                <button onClick={() => handleAction('approve', camp)} className="w-full text-left px-4 py-2.5 text-xs font-bold text-green-700 hover:bg-green-50 flex items-center gap-2">
                                  {camp.status === 'scheduled' ? (
                                    <>
                                      <Send size={14} className="text-green-600"/> Send Campaign Now
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle2 size={14} className="text-green-600"/> Accept Review & Send
                                    </>
                                  )}
                                </button>
                              )}

                              <button onClick={() => handleAction('edit_send', camp)} className="w-full text-left px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                                <FileEdit size={14} className="text-orange-500"/> Edit Campaign
                              </button>

                              {camp.status !== 'sent' && camp.status !== 'sending' && (
                                <button onClick={() => handleAction('schedule', camp)} className="w-full text-left px-4 py-2.5 text-xs font-bold text-purple-700 hover:bg-purple-50 flex items-center gap-2">
                                  <CalendarClock size={14} className="text-purple-600"/> 
                                  {camp.status === 'scheduled' ? 'Reschedule' : 'Schedule Campaign'}
                                </button>
                              )}
                              <div className="border-t border-gray-100"></div>
                              <button onClick={() => handleAction('draft', camp)} className="w-full text-left px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                                <Save size={14} className="text-gray-500"/> Save as Draft
                              </button>
                              <button onClick={() => handleAction('delete', camp)} className="w-full text-left px-4 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2">
                                <Trash2 size={14} className="text-red-500"/> Delete
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

        {/* Pagination Bar */}
        {filteredCampaigns.length > 0 && (
          <div className="px-6 py-4 bg-gray-50/70 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4 select-none">
            {/* Page Info & Items Per Page Selector */}
            <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-gray-600">
              <div>
                Showing <span className="font-extrabold text-gray-900">{indexOfFirstItem}</span> to{' '}
                <span className="font-extrabold text-gray-900">{indexOfLastItem}</span> of{' '}
                <span className="font-extrabold text-gray-900">{totalItems}</span> campaigns
              </div>

              <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
                <span className="text-gray-500 font-medium">Rows per page:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-white border border-gray-300 rounded-lg px-2.5 py-1 text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer shadow-xs"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              <form onSubmit={handleJumpPage} className="flex items-center gap-1.5 pl-2 border-l border-gray-200">
                <span className="text-gray-500 font-medium">Go to page:</span>
                <input
                  type="number"
                  min="1"
                  max={totalPages}
                  value={jumpPageInput}
                  onChange={(e) => setJumpPageInput(e.target.value)}
                  onBlur={handleJumpPage}
                  className="w-14 text-center bg-white border border-gray-300 rounded-lg px-2 py-1 text-xs font-bold text-gray-800 outline-none focus:ring-2 focus:ring-primary-500 shadow-xs"
                />
                <span className="text-gray-500 font-medium">/ {totalPages}</span>
                <button
                  type="submit"
                  className="px-2.5 py-1 bg-primary-50 hover:bg-primary-100 text-primary-700 border border-primary-200 rounded-lg text-xs font-bold transition-all shadow-xs"
                >
                  Go
                </button>
              </form>
            </div>

            {/* Page Controls */}
            <div className="flex items-center gap-1.5">
              {/* First Page */}
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs"
                title="First Page"
              >
                <ChevronsLeft size={16} />
              </button>

              {/* Previous Page */}
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs"
                title="Previous Page"
              >
                <ChevronLeft size={16} />
              </button>

              {/* Page Numbers */}
              <div className="flex items-center gap-1">
                {getPageNumbers()[0] > 1 && (
                  <>
                    <button
                      onClick={() => setCurrentPage(1)}
                      className="px-3 py-1 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                      1
                    </button>
                    {getPageNumbers()[0] > 2 && <span className="px-1 text-gray-400 font-bold">...</span>}
                  </>
                )}

                {getPageNumbers().map(pageNum => (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      currentPage === pageNum
                        ? 'bg-primary-600 text-white shadow-sm'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}

                {getPageNumbers()[getPageNumbers().length - 1] < totalPages && (
                  <>
                    {getPageNumbers()[getPageNumbers().length - 1] < totalPages - 1 && (
                      <span className="px-1 text-gray-400 font-bold">...</span>
                    )}
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      className="px-3 py-1 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                      {totalPages}
                    </button>
                  </>
                )}
              </div>

              {/* Next Page */}
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs"
                title="Next Page"
              >
                <ChevronRight size={16} />
              </button>

              {/* Last Page */}
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs"
                title="Last Page"
              >
                <ChevronsRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Schedule Modal */}
      {scheduleModal.show && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-[400px] shadow-2xl space-y-4 animate-in zoom-in-95">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <CalendarClock className="text-primary-600" size={20}/> Schedule Campaign
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Select Date & Time</label>
                <input 
                  type="datetime-local" 
                  value={scheduleModal.date}
                  onChange={e => setScheduleModal({...scheduleModal, date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-xs"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-2">
                <button 
                  onClick={() => setScheduleModal({ show: false, campaignId: null, date: '' })}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleScheduleSubmit}
                  className="px-4 py-2 bg-primary-600 text-white text-xs font-bold rounded-xl hover:bg-primary-700 transition-colors shadow-md"
                >
                  Confirm Schedule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Target Audience Email List Modal */}
      {emailListModal.show && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 border border-gray-200">
            <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50">
              <h3 className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
                <Users size={16} className="text-indigo-600" />
                <span>Target Audience Email List</span>
                <span className="text-[10px] px-2.5 py-0.5 bg-indigo-100 text-indigo-800 font-bold rounded-full border border-indigo-200">
                  {emailListModal.emails.length} Recipients
                </span>
              </h3>
              <button 
                onClick={() => setEmailListModal({ show: false, campaignName: '', emails: [] })} 
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200/50 rounded-full transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <p className="text-xs text-gray-500 font-medium">
                Target recipient emails configured for <strong className="text-gray-900">{emailListModal.campaignName}</strong>:
              </p>

              <div className="max-h-[260px] overflow-y-auto space-y-2 pr-1">
                {emailListModal.emails.map((email, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 bg-gray-50 hover:bg-indigo-50/50 border border-gray-200/80 rounded-xl text-xs transition-colors group">
                    <div className="flex items-center gap-2 truncate">
                      <Mail size={14} className="text-indigo-500 flex-shrink-0" />
                      <span className="font-semibold text-gray-800 truncate">{email}</span>
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(email);
                        customAlert({ title: 'Copied', message: `Copied ${email} to clipboard!`, type: 'success' });
                      }}
                      className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-100/50 rounded-md transition-colors"
                      title="Copy Email Address"
                    >
                      <Copy size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button
                onClick={() => setEmailListModal({ show: false, campaignName: '', emails: [] })}
                className="px-4 py-2 bg-gray-900 text-white font-bold rounded-xl text-xs hover:bg-gray-800 transition-colors shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Details & Review Modal (Matching Image 2 Rich Layout) */}
      {viewModal && (() => {
        // Resolve Sender(s)
        const senderIds = String(viewModal.sender_id || '').split(',').map(id => id.trim()).filter(Boolean);
        const selectedSenders = senders.filter(s => senderIds.includes(s.id.toString()));
        const isMultiSender = selectedSenders.length > 1;

        const senderName = isMultiSender
          ? selectedSenders.map(s => s.name).join(' & ')
          : (selectedSenders[0]?.name || senders.find(s => s.is_default)?.name || 'Default System Sender');

        const senderEmail = isMultiSender
          ? selectedSenders.map(s => s.email).join(' & ')
          : (selectedSenders[0]?.email || senders.find(s => s.is_default)?.email || 'noreply@bexcodeservices.com');

        const smtpUser = isMultiSender
          ? selectedSenders.map(s => `${s.name} <${s.smtp_user || s.email}>`).join(' | ')
          : (selectedSenders[0]?.smtp_user || systemSmtp?.smtp_user || senderEmail);

        const smtpHost = isMultiSender
          ? selectedSenders.map(s => s.smtp_host || 'smtp.gmail.com').join(' | ')
          : (selectedSenders[0]?.smtp_host || systemSmtp?.smtp_host || 'smtp.gmail.com');

        const smtpPort = isMultiSender
          ? selectedSenders.map(s => s.smtp_port || 587).join(' | ')
          : (selectedSenders[0]?.smtp_port || systemSmtp?.smtp_port || 587);

        const smtpSecure = isMultiSender
          ? selectedSenders.map(s => s.smtp_secure || 'tls').join(' | ')
          : (selectedSenders[0]?.smtp_secure || systemSmtp?.smtp_secure || 'tls');

        const isCustomSmtp = isMultiSender || !!(selectedSenders[0]?.smtp_host && selectedSenders[0]?.smtp_port);

        // Resolve Audience
        const selectedList = lists.find(l => l.id.toString() === (viewModal.list_id || '').toString()) ||
                             lists.find(l => l.name === viewModal.list_name);

        let audienceTypeTag = 'Subscriber List';
        let audienceTitle = viewModal.list_name || 'All Contacts Directory';
        let audienceDetail = 'Targeting saved subscriber list';
        let contactCount = selectedList?.subscriber_count || selectedList?.contacts_count || viewModal.total_subscribers || 'Active';

        if (viewModal.target_email && !viewModal.list_id) {
          const emails = String(viewModal.target_email || '').split(',').map(e => e.trim()).filter(Boolean);
          if (emails.length > 1) {
            audienceTypeTag = 'Selected Contacts';
            contactCount = emails.length;
            audienceTitle = `${emails.length} Selected Contact(s)`;
            audienceDetail = emails.join(', ');
          } else {
            audienceTypeTag = 'Custom Email';
            contactCount = 1;
            audienceTitle = viewModal.target_email;
            audienceDetail = 'Single recipient address';
          }
        } else if (selectedList) {
          audienceTypeTag = 'Subscriber List';
          audienceTitle = selectedList.name;
          audienceDetail = `Saved list ID #${selectedList.id}`;
        }

        // Resolve Template & Content
        const templateName = viewModal.template_name || (viewModal.html_content ? 'Custom Content' : 'Blank Template');
        const textSnippet = (viewModal.html_content || '').replace(/<[^>]+>/g, ' ').slice(0, 150).trim();

        // Resolve Status & Dispatch Tag
        let statusBadgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300';
        let statusLabel = (viewModal.status || 'Draft').toUpperCase();

        if (viewModal.status === 'submitted_for_review') {
          statusLabel = 'Pending Admin Review';
          statusBadgeClass = 'bg-amber-100 text-amber-800 border-amber-300';
        } else if (viewModal.status === 'scheduled') {
          statusLabel = `Scheduled for ${new Date(viewModal.scheduled_at).toLocaleString()}`;
          statusBadgeClass = 'bg-purple-100 text-purple-800 border-purple-300';
        } else if (viewModal.status === 'draft') {
          statusLabel = 'Draft Copy';
          statusBadgeClass = 'bg-gray-100 text-gray-800 border-gray-300';
        } else if (viewModal.status === 'sent') {
          statusLabel = 'Sent / Completed';
          statusBadgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300';
        }

        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-200">
              
              {/* Modal Header */}
              <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-white">
                <h3 className="text-xl font-extrabold text-gray-900 flex items-center gap-2.5">
                  <span>{viewModal.modalTitle || 'Campaign Details'}</span>
                  <span className="text-xs px-2.5 py-0.5 bg-gray-100 border border-gray-200 text-gray-700 font-mono font-bold rounded-md">
                    #{viewModal.id}
                  </span>
                </h3>
                <button 
                  onClick={() => setViewModal(null)} 
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors font-bold text-lg"
                >
                  <X size={20}/>
                </button>
              </div>
              
              {/* Modal Body */}
              <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-gray-50/50">

                {/* Main Review Summary Banner (Image 2 Top Banner Style) */}
                <div className="bg-gradient-to-r from-primary-900 via-primary-800 to-indigo-900 text-white rounded-2xl p-6 shadow-xl space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-primary-200 bg-white/10 px-2.5 py-1 rounded-full border border-white/20">
                        CAMPAIGN REVIEW & FINAL DISPATCH
                      </span>
                      <h3 className="text-2xl font-black mt-2 text-white">{viewModal.name || 'Untitled Campaign'}</h3>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1.5 rounded-xl border text-xs font-bold ${statusBadgeClass}`}>
                        {statusLabel}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs pt-1">
                    <div className="bg-white/10 p-3 rounded-xl backdrop-blur-sm border border-white/10">
                      <span className="block text-[10px] font-extrabold uppercase text-primary-200">SENDER</span>
                      <span className="font-bold text-white truncate block mt-0.5">{senderName}</span>
                      <span className="text-[11px] text-gray-300 truncate block">&lt;{senderEmail}&gt;</span>
                    </div>

                    <div className="bg-white/10 p-3 rounded-xl backdrop-blur-sm border border-white/10">
                      <span className="block text-[10px] font-extrabold uppercase text-primary-200">TARGET AUDIENCE</span>
                      <span className="font-bold text-white truncate block mt-0.5">{audienceTitle}</span>
                      <span className="text-[11px] text-emerald-300 font-bold block">{contactCount} Contacts</span>
                    </div>

                    <div className="bg-white/10 p-3 rounded-xl backdrop-blur-sm border border-white/10">
                      <span className="block text-[10px] font-extrabold uppercase text-primary-200">DESIGN TEMPLATE</span>
                      <span className="font-bold text-white truncate block mt-0.5">{templateName}</span>
                      <span className="text-[11px] text-gray-300 truncate block">{viewModal.html_content ? `${viewModal.html_content.length} chars` : 'Empty HTML'}</span>
                    </div>

                    <div className="bg-white/10 p-3 rounded-xl backdrop-blur-sm border border-white/10">
                      <span className="block text-[10px] font-extrabold uppercase text-primary-200">A/B TESTING</span>
                      <span className="font-bold text-white truncate block mt-0.5">{viewModal.is_ab_test ? 'Active (50/50 Split)' : 'Disabled'}</span>
                      <span className="text-[11px] text-gray-300 truncate block">{viewModal.is_ab_test ? '2 Subject Variants' : '1 Subject Line'}</span>
                    </div>
                  </div>
                </div>

                {/* 4 Detail Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  
                  {/* Card 1: Campaign & Subject Lines */}
                  <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-3.5 hover:border-primary-300 transition-all">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                      <h4 className="text-xs font-black uppercase tracking-wider text-gray-900 flex items-center gap-2">
                        <FileText size={15} className="text-primary-600" /> CAMPAIGN & SUBJECT LINES
                      </h4>
                      <button 
                        type="button" 
                        onClick={() => {
                          const campId = viewModal.id;
                          setViewModal(null);
                          navigate(`/campaigns/new?edit=${campId}`);
                        }} 
                        className="text-[11px] font-bold text-primary-600 hover:text-primary-800"
                      >
                        Edit Step 1
                      </button>
                    </div>

                    <div className="space-y-2.5 text-xs">
                      <div>
                        <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">INTERNAL CAMPAIGN NAME</span>
                        <p className="font-bold text-gray-900 text-sm mt-0.5">{viewModal.name || '—'}</p>
                      </div>

                      <div>
                        <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">PRIMARY SUBJECT LINE (VARIANT A)</span>
                        <p className="font-semibold text-gray-800 bg-gray-50 p-2.5 rounded-xl border border-gray-200 mt-0.5">{viewModal.subject || '—'}</p>
                      </div>

                      {viewModal.is_ab_test && (
                        <div>
                          <span className="text-[10px] font-extrabold text-purple-600 uppercase tracking-wider">TEST SUBJECT LINE (VARIANT B)</span>
                          <p className="font-semibold text-purple-900 bg-purple-50 p-2.5 rounded-xl border border-purple-200 mt-0.5">{viewModal.variant_b_subject || '—'}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card 2: Sender Profile & SMTP Configuration */}
                  <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-3.5 hover:border-primary-300 transition-all">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                      <h4 className="text-xs font-black uppercase tracking-wider text-gray-900 flex items-center gap-2">
                        <Mail size={15} className="text-blue-600" /> SENDER PROFILE & SMTP CONFIGURATION
                      </h4>
                      <button 
                        type="button" 
                        onClick={() => {
                          const campId = viewModal.id;
                          setViewModal(null);
                          navigate(`/campaigns/new?edit=${campId}`);
                        }} 
                        className="text-[11px] font-bold text-primary-600 hover:text-primary-800"
                      >
                        Edit Step 2
                      </button>
                    </div>

                    <div className="space-y-2.5 text-xs">
                      <div>
                        <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">SENDER PROFILE</span>
                        <p className="font-bold text-gray-900 text-sm mt-0.5">{senderName} &lt;{senderEmail}&gt;</p>
                      </div>

                      <div>
                        <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">ACTIVE SMTP EMAIL ACCOUNT</span>
                        <p className="font-semibold text-blue-700 bg-blue-50 p-2.5 rounded-xl border border-blue-200 mt-0.5">{smtpUser}</p>
                      </div>

                      <div>
                        <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">SMTP SERVER & ENCRYPTION</span>
                        <p className="font-medium text-gray-700 mt-0.5">
                          <strong className="text-gray-900">{smtpHost}:{smtpPort}</strong> ({smtpSecure.toUpperCase()}) — {isCustomSmtp ? 'Custom Sender SMTP' : 'System Default SMTP'}
                        </p>
                      </div>

                      <div>
                        <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">SENDER EMAIL COUNTER</span>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-600 text-white font-extrabold text-xs rounded-xl shadow-xs">
                            <Mail size={13} />
                            <span>{viewModal.sender_count || selectedSenders.length || 1} Sender Profile(s) Recorded</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Target Audience & Recipients */}
                  <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-3.5 hover:border-primary-300 transition-all">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                      <h4 className="text-xs font-black uppercase tracking-wider text-gray-900 flex items-center gap-2">
                        <Users size={15} className="text-emerald-600" /> TARGET AUDIENCE & RECIPIENTS
                      </h4>
                      <button 
                        type="button" 
                        onClick={() => {
                          const campId = viewModal.id;
                          setViewModal(null);
                          navigate(`/campaigns/new?edit=${campId}`);
                        }} 
                        className="text-[11px] font-bold text-primary-600 hover:text-primary-800"
                      >
                        Edit Step 3
                      </button>
                    </div>

                    <div className="space-y-2.5 text-xs">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">AUDIENCE TYPE</span>
                          <p className="font-bold text-gray-900 text-sm mt-0.5">{audienceTypeTag}</p>
                        </div>
                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-black">
                          {contactCount} Total Contacts
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">RECIPIENT DETAILS</span>
                        <p className="font-medium text-gray-800 bg-gray-50 p-2.5 rounded-xl border border-gray-200 mt-0.5 break-words">
                          {audienceTitle} — <span className="text-gray-600 font-normal">{audienceDetail}</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Card 4: Template & Email Content */}
                  <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-3.5 hover:border-primary-300 transition-all">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                      <h4 className="text-xs font-black uppercase tracking-wider text-gray-900 flex items-center gap-2">
                        <FileText size={15} className="text-purple-600" /> TEMPLATE & EMAIL CONTENT
                      </h4>
                      <button 
                        type="button" 
                        onClick={() => {
                          const campId = viewModal.id;
                          setViewModal(null);
                          navigate(`/campaigns/new?edit=${campId}`);
                        }} 
                        className="text-[11px] font-bold text-primary-600 hover:text-primary-800"
                      >
                        Edit Step 6
                      </button>
                    </div>

                    <div className="space-y-2.5 text-xs">
                      <div>
                        <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">SELECTED TEMPLATE</span>
                        <p className="font-bold text-gray-900 text-sm mt-0.5">{templateName}</p>
                      </div>

                      <div>
                        <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">CONTENT SNIPPET PREVIEW</span>
                        <p className="font-mono text-[11px] text-gray-600 bg-gray-50 p-2.5 rounded-xl border border-gray-200 mt-0.5 line-clamp-2">
                          {textSnippet || 'No text snippet available.'}
                        </p>
                      </div>
                    </div>
                  </div>

                </div>

                {/* HTML Content Preview Section */}
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-2.5">
                  <span className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">RAW HTML SOURCE CONTENT</span>
                  <div className="border border-gray-200 rounded-xl p-4 max-h-[220px] overflow-y-auto bg-gray-900 text-gray-200 text-xs font-mono leading-relaxed">
                    {viewModal.html_content || '<!-- No HTML Content -->' }
                  </div>
                </div>

              </div>

              {/* Modal Footer Actions */}
              <div className="p-5 border-t border-gray-100 bg-white flex flex-wrap justify-between items-center gap-3">
                <button 
                  onClick={() => setViewModal(null)}
                  className="px-5 py-2.5 text-gray-700 font-bold border border-gray-200 hover:bg-gray-100 rounded-xl transition-colors text-xs"
                >
                  Close
                </button>

                <div className="flex flex-wrap items-center gap-2.5">
                  {viewModal.status !== 'sent' && viewModal.status !== 'sending' && (
                    <button 
                      onClick={() => {
                        const target = viewModal;
                        setViewModal(null);
                        handleAction('discard', target);
                      }}
                      className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold border border-red-200 rounded-xl transition-all text-xs flex items-center gap-1.5 shadow-xs"
                      title="Discard / Reject Review and return to Draft"
                    >
                      <XCircle size={15} className="text-red-500" /> Discard / Reject Review
                    </button>
                  )}

                  <button 
                    onClick={() => {
                      const campId = viewModal.id;
                      setViewModal(null);
                      navigate(`/campaigns/new?edit=${campId}`);
                    }}
                    className="px-4 py-2.5 bg-white border border-gray-300 text-gray-800 font-bold hover:bg-gray-50 rounded-xl transition-colors shadow-sm flex items-center text-xs gap-1.5"
                  >
                    <FileEdit size={14} className="text-orange-500"/> Edit Campaign
                  </button>

                  {viewModal.status !== 'sent' && viewModal.status !== 'sending' && (
                    (viewModal.status === 'scheduled' || viewModal.scheduled_at) ? (
                      <button 
                        onClick={() => {
                          const target = viewModal;
                          setViewModal(null);
                          handleAction('approve', target);
                        }}
                        className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-all shadow-md flex items-center text-xs gap-1.5"
                      >
                        <CalendarClock size={16}/> Confirm & Schedule Campaign
                      </button>
                    ) : (
                      <button 
                        onClick={() => {
                          const target = viewModal;
                          setViewModal(null);
                          handleAction('approve', target);
                        }}
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-md flex items-center text-xs gap-1.5"
                      >
                        <Send size={15}/> Confirm & Send Now
                      </button>
                    )
                  )}
                </div>
              </div>

            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default CampaignsList;
