import React from 'react';
import useAutomation from '../context/useAutomation';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Plus, LayoutTemplate, Activity, AlertCircle, Settings, Play, Pause, FileText, CheckCircle2, TrendingUp, DollarSign, Users, Mail, Clock } from 'lucide-react';

export default function AutomationDashboard() {
  const { automations = [] } = useAutomation();
  const navigate = useNavigate();

  const [dashboardStats, setDashboardStats] = React.useState(null);
  const [recentActivity, setRecentActivity] = React.useState([]);
  const [featuredTemplates, setFeaturedTemplates] = React.useState([]);

  React.useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axios.get('/api/automations/dashboard-stats');
        setDashboardStats(
          res.data && typeof res.data === 'object' && !Array.isArray(res.data)
            ? res.data
            : null
        );
      } catch (err) {
        console.error("Failed to fetch dashboard stats", err);
      }
    };
    const fetchActivity = async () => {
      try {
        const res = await axios.get('/api/automations/activity/recent');
        setRecentActivity(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error("Failed to fetch recent activity", err);
      }
    };
    fetchStats();
    fetchActivity();
    axios.get('/api/automations/templates')
      .then(({ data }) => setFeaturedTemplates(Array.isArray(data) ? data.slice(0, 2) : []))
      .catch((err) => console.error('Failed to fetch automation templates', err));
  }, []);

  const totalAutomations = dashboardStats?.totalAutomations || automations.length;
  const activeAutomations = dashboardStats?.activeAutomations || automations.filter(a => a.status === 'active').length;
  const draftAutomations = dashboardStats?.draftAutomations || automations.filter(a => a.status === 'draft').length;
  const pausedAutomations = dashboardStats?.pausedAutomations || automations.filter(a => a.status === 'paused').length;

  const quickActions = [
    { title: 'Create Automation', icon: Plus, color: 'text-blue-600', bg: 'bg-blue-50', link: '/automations/builder' },
    { title: 'Use Template', icon: LayoutTemplate, color: 'text-purple-600', bg: 'bg-purple-50', link: '/automations/templates' },
    { title: 'All Automations', icon: FileText, color: 'text-green-600', bg: 'bg-green-50', link: '/automations/list' },
    { title: 'View Paused', icon: Pause, color: 'text-yellow-600', bg: 'bg-yellow-50', link: '/automations/list?status=paused' },
  ];

  const summaryCards = [
    { title: 'Total Automations', value: totalAutomations, icon: FileText, color: 'text-gray-600' },
    { title: 'Active Automations', value: activeAutomations, icon: Play, color: 'text-green-600' },
    { title: 'Draft Automations', value: draftAutomations, icon: Settings, color: 'text-gray-400' },
    { title: 'Paused Automations', value: pausedAutomations, icon: Pause, color: 'text-yellow-600' },
    { title: 'Contacts Processing', value: dashboardStats?.contactsProcessing?.toLocaleString() || '0', icon: Users, color: 'text-blue-500' },
    { title: 'Completed Journeys', value: dashboardStats?.completedJourneys?.toLocaleString() || '0', icon: CheckCircle2, color: 'text-emerald-500' },
    { title: 'Emails Sent', value: dashboardStats?.emailsSent?.toLocaleString() || '0', icon: Mail, color: 'text-indigo-500' },
    { title: 'Conversion Rate', value: dashboardStats?.conversionRate || '0%', icon: TrendingUp, color: 'text-pink-500' },
    { title: 'Failed Steps', value: dashboardStats?.failedSteps?.toLocaleString() || '0', icon: AlertCircle, color: 'text-red-500' },
    { title: 'Revenue Generated', value: dashboardStats?.revenue || '$0', icon: DollarSign, color: 'text-emerald-600' },
  ];

  const getActivityIcon = (type) => {
    switch (type) {
      case 'error': return <AlertCircle size={16} />;
      case 'automation_completed':
      case 'goal_completed': return <CheckCircle2 size={16} />;
      case 'email_sent': return <Mail size={16} />;
      default: return <Activity size={16} />;
    }
  };
  
  const getActivityColor = (type) => {
    switch (type) {
      case 'error': return 'bg-red-50 text-red-600';
      case 'automation_completed':
      case 'goal_completed': return 'bg-green-50 text-green-600';
      case 'email_sent': return 'bg-blue-50 text-blue-600';
      default: return 'bg-gray-50 text-gray-600';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto font-sans">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Automation Overview</h1>
          <p className="text-gray-500 mt-1 text-sm">Monitor and manage your marketing workflows</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => navigate('/automations/templates')}
            className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium shadow-sm"
          >
            Templates
          </button>
          <button 
            onClick={() => navigate('/automations/builder')}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium shadow-sm hover:shadow-md"
          >
            <Plus size={18} />
            Create Automation
          </button>
        </div>
      </div>
      
      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {quickActions.map((action, idx) => (
          <div 
            key={idx} 
            onClick={() => navigate(action.link)}
            className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:border-blue-200 hover:shadow-md transition cursor-pointer flex flex-col items-center justify-center gap-3 group"
          >
            <div className={`p-3 rounded-full ${action.bg} ${action.color} group-hover:scale-110 transition-transform duration-300`}>
              <action.icon size={24} strokeWidth={2.5} />
            </div>
            <span className="font-semibold text-gray-700 text-sm">{action.title}</span>
          </div>
        ))}
      </div>

      {/* Summary Metrics */}
      <h2 className="text-lg font-bold text-gray-800 mb-4">Performance Metrics</h2>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
        {summaryCards.map((card, idx) => (
          <div key={idx} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{card.title}</h3>
              <card.icon size={16} className={card.color} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-gray-800">Recent Workflow Activity</h2>
            <button className="text-sm font-medium text-blue-600 hover:text-blue-800">View all</button>
          </div>
          <div className="space-y-4">
             {recentActivity.length === 0 ? (
               <p className="text-sm text-gray-500">No recent activity found.</p>
             ) : (
               recentActivity.map((log) => (
                 <div key={log.id} className="flex items-start gap-4 border-b border-gray-50 pb-3 last:border-0">
                    <div className={`mt-1 p-2 rounded-full ${getActivityColor(log.event_type)}`}>
                      {getActivityIcon(log.event_type)}
                    </div>
                    <div>
                       <p className="text-sm font-medium text-gray-900">
                         {log.automation_name} <span className="text-gray-500 font-normal">{log.message}</span>
                         {log.email && <span className="text-gray-400 font-normal block text-xs">for {log.first_name ? log.first_name : log.email}</span>}
                       </p>
                       <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                         <Clock size={12} /> {new Date(log.created_at).toLocaleString()}
                       </p>
                    </div>
                 </div>
               ))
             )}
          </div>
        </div>

        {/* Templates mini */}
        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl shadow-sm border border-blue-100 p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-2">Need Inspiration?</h2>
            <p className="text-gray-600 text-sm mb-6">Start quickly with our pre-built automation templates tailored for your goals.</p>
            
            <div className="space-y-3">
              {featuredTemplates.map((template) => (
                <button
                  type="button"
                  key={template.id}
                  onClick={() => navigate('/automations/templates')}
                  className="w-full bg-white p-3 rounded-lg shadow-sm border border-white/60 flex items-center justify-between cursor-pointer hover:border-blue-200 transition text-left"
                >
                  <span className="font-medium text-sm text-gray-800">{template.name}</span>
                  <Plus size={16} className="text-blue-500" />
                </button>
              ))}
              {featuredTemplates.length === 0 && <p className="text-sm text-gray-500">No database templates are available yet.</p>}
            </div>
          </div>
          <button 
            onClick={() => navigate('/automations/templates')}
            className="w-full mt-6 bg-white text-blue-700 font-medium py-2.5 rounded-lg border border-blue-100 hover:bg-blue-50 transition shadow-sm"
          >
            Browse all templates
          </button>
        </div>
      </div>
    </div>
  );
}
