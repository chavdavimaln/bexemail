import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ShieldCheck, ShieldAlert, Users, Save, CheckSquare, Square, 
  RefreshCw, Search, Key, UserCheck, Shield
} from 'lucide-react';
import { useModal } from '../context/ModalContext';

const MODULE_SECTIONS = [
  {
    category: 'Reports Permissions',
    items: [
      { id: 'reports', name: 'reports' }
    ]
  },
  {
    category: 'Backup and History Permissions',
    items: [
      { id: 'backup_history_all', name: 'backup and history - all', isAll: true, group: 'backup_history' },
      { id: 'backup_history_management', name: 'backup and history - backup management', group: 'backup_history' },
      { id: 'backup_history_auto_backup', name: 'backup and history - auto backup', group: 'backup_history' },
      { id: 'backup_history_logs', name: 'backup and history - history logs', group: 'backup_history' }
    ]
  },
  {
    category: 'Profiles Permissions',
    items: [
      { id: 'profiles_all', name: 'profiles - all', isAll: true, group: 'profiles' },
      { id: 'profiles_database_backup', name: 'profiles - database backup', group: 'profiles' },
      { id: 'profiles_user_accounts', name: 'profiles - system settings - User Accounts & Permissions', group: 'profiles' },
      { id: 'profiles_smtp_config', name: 'profiles - system settings - SMTP Server Configurations', group: 'profiles' }
    ]
  },
  {
    category: 'Settings Permissions',
    items: [
      { id: 'settings_all', name: 'settings - all', isAll: true, group: 'settings' },
      { id: 'settings_system', name: 'settings - system settings', group: 'settings' },
      { id: 'settings_api_access', name: 'settings - api access', group: 'settings' }
    ]
  }
];

const ALL_MODULES = MODULE_SECTIONS.flatMap(sec => sec.items);

const PermissionsManager = () => {
  const { alert: customAlert } = useModal();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const targetUserIdParam = searchParams.get('userId');

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const rawRole = (currentUser.role || 'Super Admin').toString().toLowerCase();
  const isAdmin = rawRole === 'super admin' || rawRole === 'admin';

  const activeSub = currentUser.subscription || {};
  const activePlanCode = (activeSub.plan_code || currentUser.plan || 'free').toLowerCase();
  const maxSeats = activeSub.seats_limit || (activePlanCode === 'free' ? 1 : activePlanCode === 'essentials' ? 3 : activePlanCode === 'standard' ? 5 : 10);

  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [userRole, setUserRole] = useState('Admin');
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  useEffect(() => {
    if (!isAdmin) {
      return;
    }
    fetchUsers();
  }, [isAdmin, targetUserIdParam]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/admins', {
        headers: { 'x-user-role': currentUser.role || 'Admin', 'x-user-id': currentUser.id || 1 }
      }).catch(() => axios.get('http://localhost:5000/api/admins', {
        headers: { 'x-user-role': currentUser.role || 'Admin', 'x-user-id': currentUser.id || 1 }
      }));

      const userList = Array.isArray(res.data) ? res.data : [];
      setUsers(userList);

      if (targetUserIdParam) {
        const found = userList.find(u => Number(u.id) === Number(targetUserIdParam));
        if (found) {
          selectUser(found);
          return;
        }
      }

      // Prioritize self access profile selection
      const selfUser = userList.find(u => Number(u.id) === Number(currentUser.id) ||
        (u.email && currentUser.email && u.email.toLowerCase().trim() === currentUser.email.toLowerCase().trim()));

      if (selfUser) {
        selectUser(selfUser);
      } else if (userList.length > 0) {
        selectUser(userList[0]);
      }
    } catch (err) {
      console.error('Fetch users error:', err);
      customAlert({ title: 'Error', message: 'Failed to load user directory.', type: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  const selectUser = (userObj) => {
    if (!userObj) return;
    setSelectedUserId(userObj.id);

    let normalizedRole = 'Team Member';
    if (userObj.role === 'Super Admin' || userObj.role === 'Admin' || userObj.role === 'Leader') normalizedRole = 'Leader';
    else if (userObj.role === 'Associates' || userObj.role === 'Subscriber' || userObj.role === 'Sub Admin' || userObj.role === 'Manager') normalizedRole = 'Manager';
    else normalizedRole = 'Team Member';
    setUserRole(normalizedRole);

    let perms = {};
    if (userObj.permissions) {
      if (typeof userObj.permissions === 'object') perms = userObj.permissions;
      else if (typeof userObj.permissions === 'string') {
        try { perms = JSON.parse(userObj.permissions); } catch (e) { perms = {}; }
      }
    }

    if (!perms || Object.keys(perms).length === 0 || normalizedRole === 'Admin') {
      perms = {};
      ALL_MODULES.forEach(m => { perms[m.id] = true; });
    }
    setPermissions(perms);
  };

  const handleTogglePermission = (moduleId) => {
    setPermissions(prev => {
      const nextPerms = { ...prev };
      const targetItem = ALL_MODULES.find(m => m.id === moduleId);
      const newValue = !nextPerms[moduleId];
      nextPerms[moduleId] = newValue;

      if (targetItem && targetItem.isAll && targetItem.group) {
        const groupItems = ALL_MODULES.filter(m => m.group === targetItem.group);
        groupItems.forEach(item => {
          nextPerms[item.id] = newValue;
        });
      } else if (targetItem && targetItem.group) {
        const groupItems = ALL_MODULES.filter(m => m.group === targetItem.group && !m.isAll);
        const allChecked = groupItems.every(item => nextPerms[item.id]);
        const groupAllItem = ALL_MODULES.find(m => m.group === targetItem.group && m.isAll);
        if (groupAllItem) {
          nextPerms[groupAllItem.id] = allChecked;
        }
      }

      return nextPerms;
    });
  };

  const handleSelectAll = () => {
    const allPerms = {};
    ALL_MODULES.forEach(m => allPerms[m.id] = true);
    setPermissions(allPerms);
  };

  const handleClearAll = () => {
    setPermissions({});
  };

  const handleSavePermissions = async () => {
    if (!selectedUserId) return;
    const selectedUser = users.find(u => Number(u.id) === Number(selectedUserId));
    if (!selectedUser) return;

    try {
      setSaving(true);
      await axios.put(`http://localhost:5000/api/admins/${selectedUserId}`, {
        name: selectedUser.name,
        email: selectedUser.email,
        username: selectedUser.username,
        number: selectedUser.number,
        role: userRole,
        permissions: permissions
      }, {
        headers: { 'x-user-role': 'Super Admin', 'x-user-id': currentUser.id || 1 }
      });

      await fetchUsers();

      customAlert({
        title: 'Permissions Saved to Database!',
        message: `Successfully updated role (${userRole}) and database access permissions for ${selectedUser.email}!`,
        type: 'success'
      });
    } catch (err) {
      console.error('Save permissions error:', err);
      customAlert({
        title: 'Save Failed',
        message: err.response?.data?.error || 'Failed to update database permissions.',
        type: 'danger'
      });
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-3xl border border-red-200 shadow-xl max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
            <ShieldAlert size={32} />
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900">Access Restricted (Admin Only)</h2>
          <p className="text-sm text-gray-600">
            The Module Access Permissions Manager page is reserved exclusively for Admin users. Associates and Developer accounts cannot view or modify user access control matrices.
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2.5 bg-primary-600 text-white font-bold text-xs rounded-xl hover:bg-primary-700 transition"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const selectedUser = users.find(u => Number(u.id) === Number(selectedUserId));

  const displayUsers = users.filter(u => {
    if (activePlanCode === 'free' || maxSeats <= 1) {
      return Number(u.id) === Number(currentUser.id) ||
        (u.email && currentUser.email && u.email.toLowerCase().trim() === currentUser.email.toLowerCase().trim());
    }
    return true;
  });

  const filteredUsers = displayUsers.filter(u => {
    const q = searchFilter.toLowerCase();
    return (u.name || '').toLowerCase().includes(q) ||
           (u.email || '').toLowerCase().includes(q) ||
           (u.role || '').toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-200/80">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary-50 text-primary-600 rounded-2xl border border-primary-100">
            <ShieldCheck size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
              Module Access Permissions Manager
            </h1>
            <p className="text-gray-500 text-xs mt-0.5 font-medium">
              Admin Control Center • Database-backed User Roles & Granular Module Access Control Matrix
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="p-2.5 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl border border-gray-200 transition"
            title="Refresh Directory"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={handleSavePermissions}
            disabled={saving || !selectedUserId}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs rounded-xl shadow-md shadow-primary-200 transition disabled:opacity-50"
          >
            <Save size={16} />
            <span>{saving ? 'Saving Permissions...' : 'Save Permission'}</span>
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: User Selector */}
        <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
              <Users size={16} className="text-primary-600" />
              <span>Select Account Profile</span>
            </h3>
            <span className="text-xs font-extrabold bg-primary-50 text-primary-700 px-2.5 py-0.5 rounded-full border border-primary-100">
              {displayUsers.length} {displayUsers.length === 1 ? 'User' : 'Users'}
            </span>
          </div>

          {/* Search User Input */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              placeholder="Search by name, email..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary-500 bg-gray-50/50"
            />
          </div>

          {/* User Cards List */}
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {filteredUsers.length === 0 ? (
              <p className="text-xs text-gray-400 p-4 text-center">No matching user accounts found.</p>
            ) : (
              filteredUsers.map(u => {
                const isSelected = Number(u.id) === Number(selectedUserId);
                const isSelf = Number(u.id) === Number(currentUser.id) ||
                  (u.email && currentUser.email && u.email.toLowerCase().trim() === currentUser.email.toLowerCase().trim());

                return (
                  <div
                    key={u.id}
                    onClick={() => selectUser(u)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-primary-50/80 border-primary-300 shadow-sm'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-extrabold text-xs text-gray-900 flex items-center gap-1.5">
                          <span>{u.name}</span>
                          {isSelf && (
                            <span className="text-[9px] font-black text-amber-700 bg-amber-100 border border-amber-200 px-1.5 py-0.2 rounded uppercase">
                              Self Access
                            </span>
                          )}
                        </h4>
                        <p className="text-[11px] text-gray-500 break-all">{u.email}</p>
                      </div>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border uppercase ${
                        u.role === 'Leader' || u.role === 'Super Admin' || u.role === 'Admin' ? 'bg-red-100 text-[#d90a2c] border-red-200' :
                        u.role === 'Manager' || u.role === 'Associates' || u.role === 'Subscriber' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                        'bg-emerald-100 text-emerald-800 border-emerald-200'
                      }`}>
                        {u.role === 'Super Admin' || u.role === 'Admin' ? 'Leader' : (u.role === 'Subscriber' || u.role === 'Associates' ? 'Manager' : (u.role === 'User' || u.role === 'Developer' ? 'Team Member' : u.role))}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Permission Matrix */}
        <div className="lg:col-span-8 space-y-5">

          <div className="p-3.5 bg-slate-50 text-slate-800 border border-slate-200 rounded-2xl text-xs font-bold flex flex-wrap items-center justify-between gap-2 shadow-xs">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-[#d90a2c] flex-shrink-0" />
              <span>
                Active Subscription Plan: <strong className="uppercase text-[#d90a2c]">{activePlanCode} Plan</strong> ({displayUsers.length} / {maxSeats} Seats Configured)
              </span>
            </div>
            <span className="px-2.5 py-1 bg-red-100 text-[#d90a2c] rounded-lg text-[10px] uppercase font-black flex-shrink-0">
              {activePlanCode === 'free' ? '1 Leader Seat (Self Access Only)' : `${maxSeats} Seats (1 Mandatory Leader + ${maxSeats - 1} Manager/Team Member)`}
            </span>
          </div>

          {selectedUser ? (
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
              
              {/* Target User Info & Role Selector */}
              <div className="p-4 bg-slate-900 text-white rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-md">
                <div>
                  <h3 className="text-base font-extrabold flex items-center gap-2">
                    <UserCheck size={18} className="text-emerald-400" />
                    <span>{selectedUser.name}</span>
                  </h3>
                  <p className="text-xs text-slate-300 font-mono mt-0.5">{selectedUser.email}</p>
                </div>

                {/* Role Selector */}
                <div className="flex items-center gap-3">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Access Role *</label>
                  <select
                    value={userRole}
                    onChange={e => setUserRole(e.target.value)}
                    className="px-3.5 py-2 bg-slate-800 border border-slate-700 text-white font-bold text-xs rounded-xl outline-none focus:ring-2 focus:ring-red-400 cursor-pointer"
                  >
                    <option value="Leader">Leader</option>
                    <option value="Manager">Manager</option>
                    <option value="Team Member">Team Member</option>
                  </select>
                </div>
              </div>

              {/* Module Access Permissions Header & Actions */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-gray-100">
                <div>
                  <h3 className="font-extrabold text-sm text-gray-900 uppercase tracking-wider">
                    Module Access Permissions Matrix
                  </h3>
                  <p className="text-xs text-gray-500">
                    Configure database access rights for this user account
                  </p>
                </div>

                <div className="flex gap-2 text-xs font-bold">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="px-3 py-1.5 bg-primary-50 text-primary-700 hover:bg-primary-100 rounded-lg border border-primary-200 transition"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="px-3 py-1.5 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-lg border border-gray-300 transition"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Categorized Permissions Grid */}
              <div className="space-y-4">
                  {MODULE_SECTIONS.map(section => (
                    <div key={section.category} className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-2xl space-y-3">
                      <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                        <Shield size={14} className="text-primary-600" />
                        <span>{section.category}</span>
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {section.items.map(m => {
                          const isChecked = !!permissions[m.id];
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => handleTogglePermission(m.id)}
                              className={`flex items-center justify-between p-2.5 border rounded-xl text-xs font-bold transition text-left ${
                                isChecked
                                  ? 'bg-blue-50/90 border-blue-300 text-blue-900 shadow-xs'
                                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                {isChecked ? <CheckSquare size={16} className="text-primary-600 flex-shrink-0" /> : <Square size={16} className="text-gray-400 flex-shrink-0" />}
                                <span className="truncate">{m.name}</span>
                              </div>

                              {m.isAll && (
                                <span className="text-[10px] font-extrabold px-1.5 py-0.5 bg-primary-100 text-primary-800 rounded border border-primary-200 uppercase flex-shrink-0 ml-2">
                                  Master
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

              {/* Save Footer Button */}
              <div className="pt-4 border-t border-gray-100 flex justify-end">
                <button
                  onClick={handleSavePermissions}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-primary-200 transition disabled:opacity-50"
                >
                  <Save size={16} />
                  <span>{saving ? 'Saving Permissions...' : 'Save Permission'}</span>
                </button>
              </div>

            </div>
          ) : (
            <div className="bg-white p-12 rounded-2xl border border-gray-200 text-center text-gray-500">
              Please select a user account profile from the left list to configure permissions.
            </div>
          )}

        </div>

      </div>

    </div>
  );
};

export default PermissionsManager;
