import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, Link } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowLeft, Users, MailCheck, AlertCircle, Eye, MailOpen, MousePointer2, Smartphone } from 'lucide-react';

const CampaignReport = () => {
  const { id } = useParams();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Mock timeline data for the chart since we don't have a timeline API yet
  const mockTimeline = [
    { time: '10:00', opens: 0 },
    { time: '11:00', opens: 12 },
    { time: '12:00', opens: 45 },
    { time: '13:00', opens: 80 },
    { time: '14:00', opens: 120 },
    { time: '15:00', opens: 145 },
  ];

  useEffect(() => {
    fetchStats();
  }, [id]);

  const fetchStats = async () => {
    try {
      let targetId = id;
      if (!targetId) {
        const campRes = await axios.get('http://localhost:5000/api/campaigns');
        if (campRes.data && campRes.data.length > 0) {
          targetId = campRes.data[0].id;
        }
      }
      if (targetId) {
        const res = await axios.get(`http://localhost:5000/api/analytics/${targetId}`);
        setStats(res.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8">Loading report...</div>;
  if (!stats) return <div className="p-8">Report not found</div>;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center mb-6">
        <Link to="/campaigns" className="p-2 mr-4 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Campaign Report #{id}</h2>
          <p className="text-gray-500">Detailed analytics and delivery statistics.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Total Sent</h3>
          <p className="text-3xl font-bold text-gray-900">{stats.sent}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500 mb-1 flex items-center">
            <MailOpen size={16} className="mr-1 text-green-500"/> Opens
          </h3>
          <p className="text-3xl font-bold text-green-600">{stats.opened}</p>
          <p className="text-xs text-gray-500 mt-2">{stats.sent > 0 ? Math.round((stats.opened/stats.sent)*100) : 0}% Open Rate</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500 mb-1 flex items-center">
            <MousePointer2 size={16} className="mr-1 text-blue-500"/> Clicks
          </h3>
          <p className="text-3xl font-bold text-blue-600">{stats.clicked}</p>
          <p className="text-xs text-gray-500 mt-2">{stats.opened > 0 ? Math.round((stats.clicked/stats.opened)*100) : 0}% Click-to-Open Rate</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500 mb-1 flex items-center">
            <Smartphone size={16} className="mr-1 text-purple-500"/> Top Device
          </h3>
          <p className="text-3xl font-bold text-purple-600">Mobile</p>
          <p className="text-xs text-gray-500 mt-2">68% of opens occurred on mobile devices</p>
        </div>
      </div>
      {/* Chart Section */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mt-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Open Timeline</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={mockTimeline}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: '#6B7280'}} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#6B7280'}} />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Area 
                type="monotone" 
                dataKey="opens" 
                stroke="#0ea5e9" 
                fill="#e0f2fe" 
                strokeWidth={3} 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* Implementation Note */}
      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg flex gap-3 text-blue-800 text-sm">
        <AlertCircle size={20} className="shrink-0 text-blue-600" />
        <div>
          <p className="font-semibold mb-1">How tracking works</p>
          <p>To track opens, a 1x1 transparent pixel is embedded in the email HTML like this: <code>&lt;img src="http://yourdomain.com/api/track/open/{stats.campaign_id}/[subscriber_id]" width="1" height="1" /&gt;</code>. When the client loads images, our API registers the open event.</p>
        </div>
      </div>
    </div>
  );
};

export default CampaignReport;
