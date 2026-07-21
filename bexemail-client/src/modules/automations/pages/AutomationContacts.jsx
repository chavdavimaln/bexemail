import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, User, Search, RefreshCw, Eye } from 'lucide-react';
import ContactJourneyTimeline from '../components/ContactJourneyTimeline';

export default function AutomationContacts() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [contacts, setContacts] = useState([]);
  const [automation, setAutomation] = useState(null);
  const [loading, setLoading] = useState(true);

  // Timeline state
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [journeyLogs, setJourneyLogs] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [autoRes, contactsRes] = await Promise.all([
          axios.get(`/api/automations/${id}`),
          axios.get(`/api/automations/${id}/contacts`)
        ]);
        setAutomation(autoRes.data);
        setContacts(contactsRes.data);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const openTimeline = async (contact) => {
    setSelectedContact(contact);
    setTimelineOpen(true);
    try {
      const res = await axios.get(`/api/automations/${id}/logs/${contact.subscriber_id}`);
      setJourneyLogs(res.data);
    } catch (err) {
      console.error("Failed to load journey logs", err);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'processing': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'waiting': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'waiting_condition': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'goal_achieved': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'exited': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'failed': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto font-sans">
      <div className="mb-6">
        <button onClick={() => navigate('/automations/list')} className="text-gray-500 hover:text-gray-800 flex items-center gap-1 text-sm font-medium mb-4">
          <ArrowLeft size={16} /> Back to Automations
        </button>
        <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
          {automation ? automation.name : 'Loading...'}
          <span className="text-gray-400 font-normal">/ Contacts</span>
        </h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input type="text" placeholder="Search contacts..." className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
          </div>
          <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
        
        {loading ? (
          <div className="p-10 text-center text-gray-500">Loading contacts...</div>
        ) : contacts.length === 0 ? (
          <div className="p-10 text-center text-gray-500">No contacts have entered this automation yet.</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-white">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Contact</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Current Node</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Entry Date</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Next Run</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {contacts.map((contact) => (
                <tr key={contact.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                        {contact.first_name ? contact.first_name.charAt(0) : <User size={14} />}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{contact.first_name} {contact.last_name}</div>
                        <div className="text-xs text-gray-500">{contact.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border capitalize ${getStatusColor(contact.status)}`}>
                      {contact.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                    {contact.current_node_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(contact.entered_at || contact.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                      {contact.next_execution_time ? new Date(contact.next_execution_time).toLocaleString() : '-'}
                      <button 
                        onClick={() => openTimeline(contact)}
                        className="ml-2 bg-blue-50 text-blue-600 hover:bg-blue-100 px-2 py-1 rounded text-xs font-medium shadow-sm flex items-center gap-1 transition-colors"
                        title="View Journey"
                      >
                        <Eye size={14} /> Journey
                      </button>
                      {contact.status === 'failed' && (
                        <button 
                          onClick={async () => {
                            try {
                              await axios.post(`/api/automations/${id}/contacts/${contact.id}/retry`);
                              const res = await axios.get(`/api/automations/${id}/contacts`);
                              setContacts(res.data);
                            } catch {
                              alert("Failed to retry");
                            }
                          }}
                          className="bg-white border border-gray-200 text-gray-600 hover:text-blue-600 px-2 py-1 rounded text-xs font-medium shadow-sm flex items-center gap-1 transition-colors"
                        >
                          <RefreshCw size={12} /> Retry
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ContactJourneyTimeline 
        isOpen={timelineOpen} 
        onClose={() => setTimelineOpen(false)} 
        logs={journeyLogs} 
        subscriberName={selectedContact ? `${selectedContact.first_name || ''} ${selectedContact.last_name || ''}`.trim() || selectedContact.email : ''}
      />
    </div>
  );
}
