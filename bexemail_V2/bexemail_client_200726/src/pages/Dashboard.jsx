import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, MailOpen, MousePointerClick, Activity, Megaphone } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import EmptyState from '../components/EmptyState';
import { useNotification } from '../components/NotificationContext';

const SummaryCard = ({ title, value, icon, trend, isLoading }) => {
  if (isLoading) {
    return <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-32 animate-pulse"></div>;
  }
  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
        </div>
        <div className="p-3 bg-primary-50 text-primary-600 rounded-lg">
          {icon}
        </div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { error } = useNotification();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/analytics/dashboard');
      setStats(res.data);
    } catch (err) {
      error('Failed to load dashboard statistics.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Dashboard Overview</h2>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <SummaryCard 
          isLoading={loading}
          title="Total Subscribers" 
          value={stats?.subscribers?.total || 0} 
          icon={<Users size={24} />} 
        />
        <SummaryCard 
          isLoading={loading}
          title="Active Subscribers" 
          value={stats?.subscribers?.active || 0} 
          icon={<Activity size={24} />} 
        />
        <SummaryCard 
          isLoading={loading}
          title="Emails Sent" 
          value={stats?.emails?.sent || 0} 
          icon={<MailOpen size={24} />} 
        />
        <SummaryCard 
          isLoading={loading}
          title="Pending Queue" 
          value={stats?.emails?.pending || 0} 
          icon={<MousePointerClick size={24} />} 
        />
      </div>

      {/* Chart Section */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mt-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-6" title="Shows opens and clicks over the last 7 days">Campaign Performance</h3>
        {loading ? (
          <div className="h-72 bg-gray-100 rounded-lg animate-pulse"></div>
        ) : stats?.timeline && stats.timeline.some(t => t.opens > 0 || t.clicks > 0) ? (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.timeline}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#6B7280'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#6B7280'}} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Area type="monotone" dataKey="opens" stroke="#0ea5e9" fill="#e0f2fe" strokeWidth={3} name="Opens" />
                <Area type="monotone" dataKey="clicks" stroke="#8b5cf6" fill="#ede9fe" strokeWidth={3} name="Clicks" />
                <Area type="monotone" dataKey="bounces" stroke="#ef4444" fill="#fee2e2" strokeWidth={2} name="Bounces" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-72 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg">
             <p className="text-gray-500">Not enough data to display performance chart yet.</p>
          </div>
        )}
      </div>

      {/* Recent Campaigns Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden mt-8">
        <div className="px-6 py-5 border-b border-gray-200 bg-gray-50/50">
          <h3 className="text-lg font-semibold text-gray-800">Recent Campaigns</h3>
        </div>
        {loading ? (
           <div className="p-8 flex justify-center"><div className="animate-pulse h-6 w-32 bg-gray-200 rounded"></div></div>
        ) : stats?.recentCampaigns?.length === 0 ? (
          <EmptyState 
            icon={<Megaphone size={32} />}
            title="No campaigns found"
            description="You haven't created any campaigns yet. Let's send your first email!"
            actionText="Create Campaign"
            onAction={() => window.location.href = '/campaigns/new'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-medium" scope="col">Campaign Name</th>
                  <th className="px-6 py-4 font-medium" scope="col">Status</th>
                  <th className="px-6 py-4 font-medium" scope="col">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {stats?.recentCampaigns.map((campaign) => (
                  <tr key={campaign.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{campaign.name}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${campaign.status === 'completed' || campaign.status === 'sent' ? 'bg-green-100 text-green-800' : 
                          campaign.status === 'processing' ? 'bg-blue-100 text-blue-800' : 
                          'bg-gray-100 text-gray-800'}`}>
                        {campaign.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{new Date(campaign.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
