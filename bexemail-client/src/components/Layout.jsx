import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Megaphone, Users, LayoutTemplate, BarChart3, Settings, Workflow, Code, Key, History, List as ListIcon, LogOut, ChevronDown, ChevronRight } from 'lucide-react';

const Sidebar = () => {
  const location = useLocation();
  const [openDropdowns, setOpenDropdowns] = React.useState({ 
    automations: location.pathname.startsWith('/automations'),
    contacts: location.pathname.startsWith('/contacts')
  });

  const navItems = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
    { name: 'Campaigns', path: '/campaigns', icon: <Megaphone size={20} /> },
    { 
      name: 'Automations', 
      id: 'automations',
      icon: <Workflow size={20} />,
      subItems: [
        { name: 'Dashboard', path: '/automations' },
        { name: 'All Automations', path: '/automations/list' },
        { name: 'Templates', path: '/automations/templates' },
      ]
    },
    { name: 'Integrations', path: '/integrations', icon: <Code size={20} /> },
    { name: 'Forms', path: '/forms', icon: <Code size={20} /> },
    { 
      name: 'Contacts', 
      id: 'contacts',
      icon: <Users size={20} />,
      subItems: [
        { name: 'Directory', path: '/contacts' },
        { name: 'Bulk Import', path: '/contacts/bulk-import' },
        { name: 'Import History', path: '/contacts/import-logs' },
      ]
    },
    { name: 'Target Lists', path: '/lists', icon: <ListIcon size={20} /> },
    { name: 'Templates', path: '/templates', icon: <LayoutTemplate size={20} /> },
    { name: 'Reports', path: '/reports', icon: <BarChart3 size={20} /> },
    { name: 'API Access', path: '/developer', icon: <Key size={20} /> },
    { name: 'History Logs', path: '/history', icon: <History size={20} /> },
    { name: 'Settings', path: '/settings', icon: <Settings size={20} /> },
  ];

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex-shrink-0 hidden md:flex flex-col h-full">
      <div className="h-16 flex items-center px-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-primary-600 tracking-tight">BexEmail</h1>
      </div>
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navItems.map((item) => {
          if (item.subItems) {
            const isDropdownOpen = openDropdowns[item.id];
            const isAnyChildActive = item.subItems.some(sub => location.pathname === sub.path || (sub.path !== '/' && location.pathname.startsWith(sub.path)));
            
            return (
              <div key={item.name} className="space-y-1">
                <button
                  onClick={() => setOpenDropdowns(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
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
                    {item.subItems.map(sub => {
                      const isSubActive = location.pathname === sub.path;
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
    navigate('/login');
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
      <div className="font-semibold text-gray-800">Admin Panel</div>
      <div className="flex items-center space-x-4">
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold focus:outline-none ring-2 ring-transparent hover:ring-primary-300 transition-all"
          >
            A
          </button>
          
          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 ring-1 ring-black ring-opacity-5 z-50">
              <Link
                to="/profile"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
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
