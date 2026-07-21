import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Users, Mail, CheckCircle, TrendingUp, Calendar } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';

const EMPTY_ANALYTICS = {
  summary: {
    entered: 0,
    completed: 0,
    emailsSent: 0,
    goalsAchieved: 0,
    conversionRate: 0,
    totalRevenue: 0,
  },
  timeSeries: [],
  nodes: [],
};

const normalizeAnalytics = (responseData) => {
  const summary = responseData?.summary || {};

  return {
    summary: {
      entered: Number(summary.entered) || 0,
      completed: Number(summary.completed) || 0,
      emailsSent: Number(summary.emailsSent) || 0,
      goalsAchieved: Number(summary.goalsAchieved) || 0,
      conversionRate: Number(summary.conversionRate) || 0,
      totalRevenue: Number(summary.totalRevenue) || 0,
    },
    timeSeries: Array.isArray(responseData?.timeSeries) ? responseData.timeSeries : [],
    nodes: Array.isArray(responseData?.nodes) ? responseData.nodes : [],
  };
};

export default function AutomationAnalytics() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(EMPTY_ANALYTICS);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    const fetchStats = async () => {
      setLoading(true);
      setLoadError(false);
      try {
        const res = await axios.get(`/api/automations/${id}/stats`, {
          signal: controller.signal,
          timeout: 5000,
        });
        setData(normalizeAnalytics(res.data));
      } catch (err) {
        if (!axios.isCancel(err)) {
          console.error("Failed to fetch automation stats", err);
          setLoadError(true);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    
    fetchStats();
    return () => controller.abort();
  }, [id]);

  const statCards = [
    { title: 'Total Entered', value: data.summary.entered, icon: Users, color: 'text-blue-500', bg: 'bg-blue-50' },
    { title: 'Currently Active', value: data.summary.entered - data.summary.completed, icon: TrendingUp, color: 'text-purple-500', bg: 'bg-purple-50' },
    { title: 'Emails Sent', value: data.summary.emailsSent, icon: Mail, color: 'text-indigo-500', bg: 'bg-indigo-50' },
    { title: 'Goals Achieved', value: data.summary.goalsAchieved, icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50' },
    { title: 'Total Revenue', value: `$${data.summary.totalRevenue.toFixed(2)}`, icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto font-sans">
      <div className="mb-8">
        <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-800 flex items-center gap-1 text-sm font-medium mb-4">
          <ArrowLeft size={16} /> Back
        </button>
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Automation Analytics</h1>
            <p className="text-gray-500 mt-1">Performance and engagement metrics for this workflow</p>
          </div>
          <div className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-1.5 rounded-lg text-sm text-gray-600 shadow-sm">
            <Calendar size={16} /> Last 7 Days
          </div>
        </div>
        {loading && <p className="mt-3 text-sm text-blue-600">Refreshing analytics…</p>}
        {loadError && (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Live analytics are temporarily unavailable. Showing zero-value metrics until the API reconnects.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {statCards.map((card, idx) => (
          <div key={idx} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition">
            <div className={`p-3 rounded-full ${card.bg} ${card.color}`}>
              <card.icon size={24} />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-500">{card.title}</p>
              <p className="text-2xl font-bold text-gray-900">{card.value.toLocaleString()}</p>
            </div>
          </div>
        ))}
        
        <div className="col-span-2 md:col-span-4 bg-gradient-to-r from-emerald-500 to-teal-500 p-6 rounded-xl shadow-md text-white flex justify-between items-center">
           <div>
              <h3 className="text-emerald-100 font-medium uppercase tracking-wider text-sm mb-1">Conversion Rate</h3>
              <p className="text-3xl font-bold">{data.summary.conversionRate}%</p>
           </div>
           <div className="text-right">
              <p className="text-emerald-100 text-sm">Based on goals achieved vs total entered</p>
              <button className="mt-2 bg-white/20 hover:bg-white/30 px-4 py-1.5 rounded-lg text-sm font-medium transition backdrop-blur-sm">View Goal Details</button>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Time Series Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Engagement Over Time</h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.timeSeries} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorEntered" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorGoals" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <RechartsTooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" />
                <Area type="monotone" dataKey="entered" name="Entered Workflow" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorEntered)" />
                <Area type="monotone" dataKey="goals" name="Goals Achieved" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorGoals)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Node Dropoff Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Step-by-Step Dropoff</h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.nodes} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#374151', fontSize: 12, fontWeight: 500}} width={100} />
                <RechartsTooltip 
                  cursor={{fill: '#f3f4f6'}}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" />
                <Bar dataKey="passed" name="Passed" fill="#818cf8" radius={[0, 4, 4, 0]} barSize={20} />
                <Bar dataKey="dropped" name="Dropped/Failed" fill="#f87171" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
