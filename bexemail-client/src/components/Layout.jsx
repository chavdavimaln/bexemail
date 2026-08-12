import React from 'react';
import axios from 'axios';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Megaphone, Users, LayoutTemplate, BarChart3, Settings, Workflow, Code, Key, History, List as ListIcon, LogOut, ChevronDown, ChevronRight, ChevronLeft, Database, ShieldCheck } from 'lucide-react';

const Sidebar = () => {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [openDropdowns, setOpenDropdowns] = React.useState({ 
    contacts: location.pathname.startsWith('/contacts') || location.pathname.startsWith('/lists'),
    campaigns: location.pathname.startsWith('/campaigns') || location.pathname.startsWith('/templates'),
    backups: location.pathname.startsWith('/backups') || location.pathname.startsWith('/history'),
    profiles: location.pathname.startsWith('/profiles') || location.pathname.startsWith('/permissions'),
    settings: location.pathname.startsWith('/settings') || location.pathname.startsWith('/developer')
  });

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userRole = user.role;
  
  const getUserPermissions = (raw) => {
    if (!raw) return {};
    if (typeof raw === 'object' && raw !== null) return raw;
    if (typeof raw === 'string') {
      try {
        let p = JSON.parse(raw);
        if (typeof p === 'string') p = JSON.parse(p);
        return typeof p === 'object' && p !== null ? p : {};
      } catch (e) {
        return {};
      }
    }
    return {};
  };

  const [userPermissions, setUserPermissions] = React.useState(() => getUserPermissions(user.permissions));

  const navItems = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
    { 
      name: 'Contacts', 
      id: 'contacts',
      icon: <Users size={20} />,
      subItems: [
        { name: 'Directory', path: '/contacts' },
        { name: 'Target Lists', path: '/lists' },
        { name: 'Import Directory', path: '/contacts/bulk-import' },
        { name: 'Import History', path: '/contacts/import-logs' },
        { name: 'Export Directory', path: '/contacts/export' },
      ]
    },
    { 
      name: 'Campaigns', 
      id: 'campaigns',
      icon: <Megaphone size={20} />,
      subItems: [
        { name: 'Campaign List', path: '/campaigns' },
        { name: 'Email Templates', path: '/templates' },
      ]
    },
    { name: 'Reports', path: '/reports', icon: <BarChart3 size={20} /> },
    { 
      name: 'Backup and History', 
      id: 'backups',
      icon: <Database size={20} />,
      subItems: [
        { name: 'Backups Management', path: '/backups' },
        { name: 'Auto Backup & Reminders', path: '/backups/schedules' },
        { name: 'History Logs', path: '/history' },
      ]
    },
    { 
      name: 'Profiles', 
      id: 'profiles',
      icon: <Users size={20} />,
      subItems: [
        { name: 'User Profiles & Access', path: '/profiles' },
        { name: 'Module Access Permissions', path: '/permissions', adminOnly: true }
      ]
    },
    { 
      name: 'Settings', 
      id: 'settings',
      icon: <Settings size={20} />,
      subItems: [
        { name: 'System Settings', path: '/settings/system' },
        { name: 'API Access', path: '/settings/api-access' },
      ]
    },
  ];

  const checkPermission = (item) => {
    if (item.adminOnly) {
      const rawRoleStr = (userRole || '').toString().toLowerCase();
      return rawRoleStr === 'super admin' || rawRoleStr === 'admin';
    }

    const rawUserRole = (userRole || '').toString().toLowerCase();
    if (rawUserRole === 'super admin' || rawUserRole === 'admin') return true;
    
    // Default allowed items
    if (item.path === '/' || item.path === '/profile') return true;

    const key = item.id || item.path;

    if (key === 'contacts' || key === '/contacts' || key === '/lists' || key === '/contacts/bulk-import' || key === '/contacts/import-logs' || key === '/contacts/export') {
      return true;
    }
    if (key === 'campaigns' || key === '/campaigns' || key === '/templates') {
      return true;
    }
    if (key === '/reports') {
      return userPermissions.reports === true;
    }
    if (key === 'backups' || key === '/backups') {
      return !!(userPermissions.backup_history_all || userPermissions.backup_history_management || userPermissions.backup_history_auto_backup || userPermissions.backup_history_logs);
    }
    if (key === '/backups/schedules') {
      return !!(userPermissions.backup_history_all || userPermissions.backup_history_auto_backup);
    }
    if (key === '/history') {
      return !!(userPermissions.backup_history_all || userPermissions.backup_history_logs);
    }
    if (key === 'profiles' || key === '/profiles') {
      return !!(userPermissions.profiles_all || userPermissions.profiles_user_accounts || userPermissions.profiles_smtp_config || userPermissions.profiles_database_backup);
    }
    if (key === 'settings' || key === '/settings' || key === '/settings/system') {
      return !!(userPermissions.settings_all || userPermissions.settings_system || userPermissions.settings_api_access);
    }
    if (key === '/settings/api-access' || key === '/developer') {
      return !!(userPermissions.settings_all || userPermissions.settings_api_access);
    }
    return false;
  };

  React.useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.get('http://localhost:5000/api/auth/me')
        .then(res => {
          const freshUser = res.data.user || res.data;
          if (freshUser && freshUser.id) {
            let perms = freshUser.permissions;
            if (perms && typeof perms === 'string') {
              try { perms = JSON.parse(perms); } catch (e) {}
            }
            if (perms && typeof perms === 'string') {
              try { perms = JSON.parse(perms); } catch (e) {}
            }
            const parsedPerms = (perms && typeof perms === 'object') ? perms : {};
            freshUser.permissions = parsedPerms;
            localStorage.setItem('user', JSON.stringify(freshUser));
            setUserPermissions(parsedPerms);
          }
        })
        .catch(() => {});
    }
  }, [location.pathname]);

  const filteredNavItems = navItems
    .map(item => {
      if (item.subItems) {
        const allowedSubItems = item.subItems.filter(sub => {
          if (sub.adminOnly) {
            const rawRoleStr = (userRole || '').toString().toLowerCase();
            return rawRoleStr === 'super admin' || rawRoleStr === 'admin';
          }
          return checkPermission(sub);
        });
        if (allowedSubItems.length === 0) return null;
        return { ...item, subItems: allowedSubItems };
      }
      return checkPermission(item) ? item : null;
    })
    .filter(Boolean);

  return (
    <aside className={`${isCollapsed ? 'w-20' : 'w-64'} bg-white border-r border-gray-200 flex-shrink-0 hidden md:flex flex-col h-full transition-all duration-300 ease-in-out`}>
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
        {!isCollapsed ? (
          <h1 className="text-xl font-bold text-primary-600 tracking-tight transition-all">BexEmail</h1>
        ) : (
          <div className="w-full text-center font-extrabold text-xl text-primary-600">B</div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {filteredNavItems.map((item) => {
          if (item.subItems) {
            const isDropdownOpen = openDropdowns[item.id];
            const isAnyChildActive = item.subItems.some(sub => location.pathname === sub.path || (sub.path !== '/' && location.pathname.startsWith(sub.path)));

            if (isCollapsed) {
              return (
                <div key={item.name} className="relative group">
                  <button
                    onClick={() => {
                      setIsCollapsed(false);
                      setOpenDropdowns(prev => ({ ...prev, [item.id]: true }));
                    }}
                    className={`w-full flex items-center justify-center p-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isAnyChildActive ? 'bg-primary-50 text-primary-600' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    title={item.name}
                  >
                    <span className={isAnyChildActive ? 'text-primary-600' : 'text-gray-500'}>
                      {item.icon}
                    </span>
                  </button>
                </div>
              );
            }

            return (
              <div key={item.name} className="space-y-1">
                <button
                  onClick={() => setOpenDropdowns(prev => {
                    const nextVal = !prev[item.id];
                    if (nextVal) {
                      return {
                        contacts: item.id === 'contacts',
                        campaigns: item.id === 'campaigns',
                        backups: item.id === 'backups',
                        profiles: item.id === 'profiles',
                        settings: item.id === 'settings'
                      };
                    } else {
                      return { ...prev, [item.id]: false };
                    }
                  })}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isAnyChildActive && !isDropdownOpen ? 'bg-primary-50 text-primary-600' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center">
                    <span className={`mr-3 ${isAnyChildActive && !isDropdownOpen ? 'text-primary-600' : 'text-gray-400'}`}>
                      {item.icon}
                    </span>
                    {item.name}
                  </div>
                  {isDropdownOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
                {isDropdownOpen && (
                  <div className="pl-10 pr-2 space-y-1">
                    {item.subItems
                      .filter(checkPermission)
                      .filter(sub => !(userRole === 'User' && sub.path === '/lists'))
                      .map(sub => {
                        const isSubActive = location.pathname === sub.path || (sub.path === '/settings/system' && location.pathname === '/settings') || (sub.path === '/settings/api-access' && location.pathname === '/developer');
                        return (
                          <Link
                            key={sub.name}
                            to={sub.path}
                            className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                              isSubActive ? 'bg-primary-50 text-primary-600' : 'text-gray-600 hover:bg-gray-100'
                            }`}
                          >
                            {sub.name}
                          </Link>
                        );
                      })}
                  </div>
                )}
              </div>
            );
          }

          const isActive = location.pathname === item.path;
          if (isCollapsed) {
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center justify-center p-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-primary-50 text-primary-600' : 'text-gray-700 hover:bg-gray-100'
                }`}
                title={item.name}
              >
                <span className={isActive ? 'text-primary-600' : 'text-gray-500'}>
                  {item.icon}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary-50 text-primary-600'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className={`mr-3 ${isActive ? 'text-primary-600' : 'text-gray-400'}`}>
                {item.icon}
              </span>
              {item.name}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};

const Header = () => {
  const [isProfileOpen, setIsProfileOpen] = React.useState(false);
  const dropdownRef = React.useRef(null);
  const navigate = useNavigate();

  const [user, setUser] = React.useState(() => JSON.parse(localStorage.getItem('user') || '{}'));

  React.useEffect(() => {
    const handleSyncUser = () => {
      const freshUser = JSON.parse(localStorage.getItem('user') || '{}');
      setUser(freshUser);
    };

    window.addEventListener('userProfileUpdated', handleSyncUser);
    window.addEventListener('storage', handleSyncUser);
    return () => {
      window.removeEventListener('userProfileUpdated', handleSyncUser);
      window.removeEventListener('storage', handleSyncUser);
    };
  }, []);

  const avatarLetter = user.name ? user.name.charAt(0).toUpperCase() : (user.email ? user.email.charAt(0).toUpperCase() : 'A');
  const userAvatar = user.avatar || user.profile_picture || null;

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
      <div className="font-semibold text-gray-800">Admin Panel</div>
      <div className="flex items-center space-x-4">
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold focus:outline-none ring-2 ring-transparent hover:ring-primary-300 transition-all text-sm uppercase overflow-hidden border border-gray-200 shadow-xs"
            title={user.name || user.email || 'My Profile'}
          >
            {userAvatar ? (
              <img src={userAvatar} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              avatarLetter
            )}
          </button>
          
          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 ring-1 ring-black ring-opacity-5 z-50">
              <Link
                to="/profile"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors font-medium"
                onClick={() => setIsProfileOpen(false)}
              >
                View Profile
              </Link>
              <div className="border-t border-gray-100 my-1"></div>
              <button
                onClick={handleLogout}
                className="w-full text-left flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut size={16} className="mr-2" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

const Layout = () => {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
