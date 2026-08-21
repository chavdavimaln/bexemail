import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit3, Trash2, Download, Upload, Eye, CheckCircle, ShieldAlert, X, Search, Sparkles, RefreshCw, UserCheck, UserX, AlertTriangle, Layers } from 'lucide-react';
import axios from 'axios';

const PlanManagement = () => {
  const [plans, setPlans] = useState([]);
  const [userSubscriptions, setUserSubscriptions] = useState([]);
  const [activeTab, setActiveTab] = useState('plans'); // 'plans' or 'user_assignments'
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [showAddEditPlanModal, setShowAddEditPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [showViewPlanModal, setShowViewPlanModal] = useState(null);
  
  // Assign Plan Modal (View Before Assign / Confirm Plan)
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignTargetUser, setAssignTargetUser] = useState(null);
  const [selectedPlanCode, setSelectedPlanCode] = useState('standard');
  const [assignTrialDays, setAssignTrialDays] = useState(14);
  const [assignStatus, setAssignStatus] = useState('active');
  const [showConfirmAssignModal, setShowConfirmAssignModal] = useState(false);

  // File Upload Ref for Restore
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  // Form State for Add/Edit Plan
  const [planForm, setPlanForm] = useState({
    plan_code: '',
    name: '',
    tagline: '',
    monthly_price: 0,
    discount_percent: 50,
    trial_days: 14,
    contacts_limit: 500,
    emails_limit: 6000,
    is_popular: false,
    featuresText: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [plansRes, subsRes] = await Promise.all([
        axios.get('http://localhost:5000/api/plans'),
        axios.get('http://localhost:5000/api/plans/user-subscriptions')
      ]);
      setPlans(Array.isArray(plansRes.data) ? plansRes.data : []);
      setUserSubscriptions(Array.isArray(subsRes.data) ? subsRes.data : []);
    } catch (err) {
      console.error('Error fetching plan management data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Open Add Plan
  const handleOpenAdd = () => {
    setEditingPlan(null);
    setPlanForm({
      plan_code: 'custom_' + Date.now().toString().slice(-4),
      name: '',
      tagline: '',
      monthly_price: 999,
      discount_percent: 50,
      trial_days: 14,
      contacts_limit: 1000,
      emails_limit: 10000,
      is_popular: false,
      featuresText: 'Full feature access\nPriority email support\nCustom branding'
    });
    setShowAddEditPlanModal(true);
  };

  // Open Edit Plan
  const handleOpenEdit = (plan) => {
    setEditingPlan(plan);
    setPlanForm({
      plan_code: plan.plan_code,
      name: plan.name,
      tagline: plan.tagline || '',
      monthly_price: plan.monthly_price,
      discount_percent: plan.discount_percent,
      trial_days: plan.trial_days,
      contacts_limit: plan.contacts_limit,
      emails_limit: plan.emails_limit,
      is_popular: Number(plan.is_popular) === 1,
      featuresText: Array.isArray(plan.features) ? plan.features.join('\n') : ''
    });
    setShowAddEditPlanModal(true);
  };

  // Save Add/Edit Plan
  const handleSavePlan = async (e) => {
    e.preventDefault();
    try {
      const featuresArray = planForm.featuresText.split('\n').map(s => s.trim()).filter(Boolean);
      const payload = {
        ...planForm,
        features: featuresArray
      };

      if (editingPlan) {
        await axios.put(`http://localhost:5000/api/plans/${editingPlan.id}`, payload);
      } else {
        await axios.post('http://localhost:5000/api/plans', payload);
      }

      setShowAddEditPlanModal(false);
      await fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save plan');
    }
  };

  // Delete Plan
  const handleDeletePlan = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete plan '${name}'?`)) return;
    try {
      await axios.delete(`http://localhost:5000/api/plans/${id}`);
      await fetchData();
    } catch (err) {
      alert('Failed to delete plan');
    }
  };

  // Backup Plans JSON
  const handleBackupPlans = () => {
    window.open('http://localhost:5000/api/plans/backup', '_blank');
  };

  // Restore Plans JSON
  const handleRestoreFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const payload = JSON.parse(evt.target.result);
        await axios.post('http://localhost:5000/api/plans/restore', payload);
        alert('Plans & configurations restored successfully!');
        await fetchData();
      } catch (err) {
        alert('Failed to restore plans backup file: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  // Open Assign Modal (View Before Assign)
  const handleOpenAssignModal = (user) => {
    setAssignTargetUser(user);
    setSelectedPlanCode(user.plan_code || 'standard');
    setAssignTrialDays(user.trial_days || 14);
    setAssignStatus('active');
    setShowAssignModal(true);
  };

  // Confirm & Execute Plan Assignment
  const handleExecuteAssign = async () => {
    if (!assignTargetUser) return;
    try {
      await axios.post('http://localhost:5000/api/plans/assign', {
        user_id: assignTargetUser.user_id,
        plan_code: selectedPlanCode,
        trial_days: assignTrialDays,
        status: assignStatus
      });
      setShowConfirmAssignModal(false);
      setShowAssignModal(false);
      await fetchData();
      alert(`Successfully assigned plan to ${assignTargetUser.user_name || assignTargetUser.user_email}!`);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to assign plan');
    }
  };

  // Deassign Plan
  const handleDeassignPlan = async (user) => {
    if (!window.confirm(`Deassign current plan from ${user.user_name || user.user_email}? User will be reset to Free plan.`)) return;
    try {
      await axios.post('http://localhost:5000/api/plans/deassign', {
        user_id: user.user_id
      });
      await fetchData();
      alert('Plan deassigned successfully!');
    } catch (err) {
      alert('Failed to deassign plan');
    }
  };

  // Filtered lists
  const filteredPlans = plans.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.plan_code.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredUsers = userSubscriptions.filter(u => (u.user_email || '').toLowerCase().includes(searchTerm.toLowerCase()) || (u.user_name || '').toLowerCase().includes(searchTerm.toLowerCase()));

  const selectedPlanObj = plans.find(p => p.plan_code === selectedPlanCode) || plans[0];

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      
      {/* Page Title & Navigation Header */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-black text-amber-600 uppercase tracking-wider mb-1">
            <Sparkles size={16} />
            Admin Panel Control Center
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Marketing Plan Management & User Assignments
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Add, edit, delete, backup, restore plans, or assign/deassign plan tiers & trial days for any registered user.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleBackupPlans}
            className="px-3.5 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition flex items-center gap-1.5 shadow-sm"
          >
            <Download size={14} /> Backup Plans JSON
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-2 bg-indigo-50 text-indigo-700 font-bold text-xs rounded-xl hover:bg-indigo-100 transition border border-indigo-200 flex items-center gap-1.5"
          >
            <Upload size={14} /> Restore Plans
          </button>
          <input type="file" ref={fileInputRef} onChange={handleRestoreFileSelect} accept=".json" className="hidden" />

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-slate-900 font-black text-xs rounded-xl shadow-md transition flex items-center gap-1.5"
          >
            <Plus size={16} /> Add New Plan
          </button>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex items-center justify-between bg-white p-2 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('plans')}
            className={`px-4 py-2 text-xs font-black rounded-xl transition ${
              activeTab === 'plans' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Marketing Plans Catalogue ({plans.length})
          </button>

          <button
            onClick={() => setActiveTab('user_assignments')}
            className={`px-4 py-2 text-xs font-black rounded-xl transition ${
              activeTab === 'user_assignments' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            User Plan Assignments & Trial Days ({userSubscriptions.length})
          </button>
        </div>

        {/* Search */}
        <div className="relative w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search plans or users..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
      </div>

      {/* TAB 1: PLANS CATALOGUE */}
      {activeTab === 'plans' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredPlans.map((plan) => (
            <div key={plan.id} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    CODE: {plan.plan_code}
                  </span>
                  {Number(plan.is_popular) === 1 && (
                    <span className="px-2 py-0.5 bg-amber-200 text-slate-900 font-extrabold text-[9px] rounded">POPULAR</span>
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-black text-slate-900">{plan.name}</h3>
                  <p className="text-xs text-slate-500 font-medium line-clamp-2 mt-0.5">{plan.tagline}</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl space-y-1 border border-slate-100">
                  <div className="text-2xl font-black text-slate-900">₹{Number(plan.monthly_price).toLocaleString()} <span className="text-xs font-normal text-slate-500">/mo</span></div>
                  <div className="text-[11px] font-bold text-amber-600">Discount: {plan.discount_percent}% • Trial: {plan.trial_days} Days</div>
                  <div className="text-[11px] text-slate-500">Contacts: {plan.contacts_limit.toLocaleString()} | Sends: {plan.emails_limit.toLocaleString()}</div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => setShowViewPlanModal(plan)}
                  className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1"
                >
                  <Eye size={14} /> View
                </button>

                <button
                  onClick={() => handleOpenEdit(plan)}
                  className="flex-1 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1"
                >
                  <Edit3 size={14} /> Edit
                </button>

                <button
                  onClick={() => handleDeletePlan(plan.id, plan.name)}
                  className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition"
                  title="Delete Plan"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: USER PLAN ASSIGNMENTS */}
      {activeTab === 'user_assignments' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-extrabold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-4">User Account</th>
                  <th className="p-4">Assigned Plan</th>
                  <th className="p-4">Trial Days</th>
                  <th className="p-4">Trial End Date</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((user) => (
                  <tr key={user.user_id} className="hover:bg-slate-50/60 transition">
                    <td className="p-4">
                      <div className="font-extrabold text-slate-900">{user.user_name || 'Registered User'}</div>
                      <div className="text-slate-500 text-xs font-medium">{user.user_email}</div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase">{user.user_role}</div>
                    </td>

                    <td className="p-4 font-bold text-slate-800">
                      {user.plan_name ? (
                        <span className="px-2.5 py-1 bg-amber-100 text-slate-900 rounded-full text-xs font-extrabold">
                          {user.plan_name}
                        </span>
                      ) : (
                        <span className="text-slate-400">Free / Default</span>
                      )}
                    </td>

                    <td className="p-4 font-bold text-slate-700">
                      {user.trial_days !== null ? `${user.trial_days} Days` : '14 Days'}
                    </td>

                    <td className="p-4 text-xs font-medium text-slate-600">
                      {user.trial_end ? new Date(user.trial_end).toLocaleDateString() : 'N/A'}
                    </td>

                    <td className="p-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        user.sub_status === 'active' || user.sub_status === 'trialing'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {user.sub_status || 'Trialing'}
                      </span>
                    </td>

                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenAssignModal(user)}
                        className="px-3 py-1.5 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition inline-flex items-center gap-1 shadow-xs"
                      >
                        <UserCheck size={13} /> View Before Assign
                      </button>

                      <button
                        onClick={() => handleDeassignPlan(user)}
                        className="px-2.5 py-1.5 bg-red-50 text-red-600 font-bold text-xs rounded-xl hover:bg-red-100 transition inline-flex items-center gap-1"
                      >
                        <UserX size={13} /> Deassign
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW BEFORE ASSIGN / CONFIRM PLAN MODAL */}
      {showAssignModal && assignTargetUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95">
            
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider">Preview & Confirm Plan</span>
                <h3 className="text-lg font-black">Assign Marketing Plan to User</h3>
              </div>
              <button onClick={() => setShowAssignModal(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              
              {/* User Details */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="text-xs text-slate-500 uppercase font-bold">Target User Profile</div>
                <div className="text-sm font-black text-slate-900">{assignTargetUser.user_name}</div>
                <div className="text-xs text-slate-600 font-medium">{assignTargetUser.user_email}</div>
              </div>

              {/* Plan Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Select Plan to Assign *
                </label>
                <select
                  value={selectedPlanCode}
                  onChange={(e) => {
                    setSelectedPlanCode(e.target.value);
                    const found = plans.find(p => p.plan_code === e.target.value);
                    if (found) setAssignTrialDays(found.trial_days || 14);
                  }}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 bg-white"
                >
                  {plans.map(p => (
                    <option key={p.plan_code} value={p.plan_code}>
                      {p.name} — ₹{Number(p.monthly_price).toLocaleString()}/mo ({p.trial_days} Trial Days)
                    </option>
                  ))}
                </select>
              </div>

              {/* VIEW PLAN SPECIFICATIONS BEFORE ASSIGNMENT */}
              {selectedPlanObj && (
                <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-2xl space-y-2 text-xs">
                  <div className="font-extrabold text-slate-900 flex items-center justify-between">
                    <span>Plan Specifications: {selectedPlanObj.name}</span>
                    <span className="text-amber-700 font-black">{selectedPlanObj.price_detail || 'Standard Rate'}</span>
                  </div>
                  <div className="text-slate-700">Role-based Seat Limit: <strong>{selectedPlanObj.seats_limit || 1} Seats (1 Leader + {(selectedPlanObj.seats_limit || 1) - 1} Manager/Team Member)</strong></div>
                  <div className="text-slate-700">Contact Limit: <strong>{selectedPlanObj.contacts_limit_info || selectedPlanObj.contacts_limit?.toLocaleString()}</strong></div>
                  <div className="text-slate-700">Email Send Limit: <strong>{selectedPlanObj.emails_limit?.toLocaleString()} sends</strong></div>
                </div>
              )}

              {/* Dynamic Trial Days & Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Trial Days (Admin Override)
                  </label>
                  <input
                    type="number"
                    value={assignTrialDays}
                    onChange={(e) => setAssignTrialDays(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Subscription Status
                  </label>
                  <select
                    value={assignStatus}
                    onChange={(e) => setAssignStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 bg-white"
                  >
                    <option value="active">Active</option>
                    <option value="trialing">Trialing</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteAssign}
                  className="flex-1 py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-900 font-black text-xs rounded-xl shadow-md"
                >
                  Confirm & Assign Plan
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT PLAN MODAL */}
      {showAddEditPlanModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95">
            
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-lg font-black">
                {editingPlan ? 'Edit Marketing Plan' : 'Add New Marketing Plan'}
              </h3>
              <button onClick={() => setShowAddEditPlanModal(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Plan Name *</label>
                  <input
                    type="text"
                    required
                    value={planForm.name}
                    onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                    placeholder="Standard"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Plan Code Slug *</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingPlan}
                    value={planForm.plan_code}
                    onChange={(e) => setPlanForm({ ...planForm, plan_code: e.target.value })}
                    placeholder="standard"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 disabled:bg-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Tagline / Description</label>
                <input
                  type="text"
                  value={planForm.tagline}
                  onChange={(e) => setPlanForm({ ...planForm, tagline: e.target.value })}
                  placeholder="Advanced AI tools and deep insights"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Monthly Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={planForm.monthly_price}
                    onChange={(e) => setPlanForm({ ...planForm, monthly_price: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Discount %</label>
                  <input
                    type="number"
                    value={planForm.discount_percent}
                    onChange={(e) => setPlanForm({ ...planForm, discount_percent: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Trial Days</label>
                  <input
                    type="number"
                    value={planForm.trial_days}
                    onChange={(e) => setPlanForm({ ...planForm, trial_days: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Contacts Capacity</label>
                  <input
                    type="number"
                    value={planForm.contacts_limit}
                    onChange={(e) => setPlanForm({ ...planForm, contacts_limit: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Monthly Email Sends</label>
                  <input
                    type="number"
                    value={planForm.emails_limit}
                    onChange={(e) => setPlanForm({ ...planForm, emails_limit: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Plan Features (One per line)</label>
                <textarea
                  rows={4}
                  value={planForm.featuresText}
                  onChange={(e) => setPlanForm({ ...planForm, featuresText: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_popular"
                  checked={planForm.is_popular}
                  onChange={(e) => setPlanForm({ ...planForm, is_popular: e.target.checked })}
                  className="w-4 h-4 text-amber-500 rounded"
                />
                <label htmlFor="is_popular" className="text-xs font-bold text-slate-800 cursor-pointer">
                  Highlight as Recommended / Popular Plan
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddEditPlanModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-900 font-black text-xs rounded-xl shadow-md"
                >
                  {editingPlan ? 'Save Changes' : 'Create Plan'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* VIEW PLAN SPECIFICATIONS MODAL */}
      {showViewPlanModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl p-6 space-y-4 border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-900">{showViewPlanModal.name}</h3>
              <button onClick={() => setShowViewPlanModal(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-700">
              <div>Plan Code: <strong className="text-slate-900">{showViewPlanModal.plan_code}</strong></div>
              <div>Price: <strong className="text-slate-900">₹{Number(showViewPlanModal.monthly_price).toLocaleString()}/mo</strong></div>
              <div>Discount: <strong className="text-slate-900">{showViewPlanModal.discount_percent}% OFF</strong></div>
              <div>Trial Days: <strong className="text-slate-900">{showViewPlanModal.trial_days} Days</strong></div>
              <div>Contact Limit: <strong className="text-slate-900">{showViewPlanModal.contacts_limit.toLocaleString()}</strong></div>
              <div>Email Limit: <strong className="text-slate-900">{showViewPlanModal.emails_limit.toLocaleString()}</strong></div>
              
              <div className="pt-2 border-t border-slate-100">
                <div className="font-bold text-slate-900 mb-1">Features Included:</div>
                <ul className="list-disc pl-4 space-y-1 text-slate-600">
                  {Array.isArray(showViewPlanModal.features) && showViewPlanModal.features.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </div>
            </div>

            <button
              onClick={() => setShowViewPlanModal(null)}
              className="w-full py-2 bg-slate-900 text-white font-bold text-xs rounded-xl"
            >
              Close Preview
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default PlanManagement;
