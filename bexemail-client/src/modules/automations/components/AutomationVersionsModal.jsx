import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, History, RotateCcw, Loader2 } from 'lucide-react';

export default function AutomationVersionsModal({ automationId, onClose }) {
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState(false);
  const [versions, setVersions] = useState([]);

  useEffect(() => {
    const fetchVersions = async () => {
      try {
        const res = await axios.get(`/api/automations/${automationId}/versions`);
        setVersions(res.data);
      } catch (err) {
        console.error("Failed to load versions", err);
      } finally {
        setLoading(false);
      }
    };
    fetchVersions();
  }, [automationId]);

  const handleRestore = async (versionId) => {
    if (!window.confirm("Are you sure you want to restore this version? This will overwrite the current draft.")) return;
    
    setRestoring(true);
    try {
      await axios.post(`/api/automations/${automationId}/versions/${versionId}/restore`);
      alert("Version restored successfully! Refreshing builder...");
      window.location.reload();
    } catch {
      alert("Failed to restore version.");
      setRestoring(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <History size={20} className="text-blue-500" /> Version History
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X size={20} />
          </button>
        </div>

        <div className="p-0 overflow-y-auto flex-grow">
          {loading ? (
            <div className="p-12 flex justify-center text-gray-500">
              <Loader2 size={24} className="animate-spin" />
            </div>
          ) : versions.length === 0 ? (
            <div className="p-12 text-center">
              <History size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">No published versions found.</p>
              <p className="text-xs text-gray-400 mt-2">Publish this workflow to create the first version.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {versions.map((v, idx) => (
                <div key={v.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">Version {v.version_number}</span>
                      {idx === 0 && <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Latest</span>}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Published on {new Date(v.published_at).toLocaleString()}
                    </p>
                  </div>
                  
                  <button
                    onClick={() => handleRestore(v.id)}
                    disabled={restoring}
                    className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-blue-600 border border-gray-200 hover:border-blue-200 bg-white px-3 py-1.5 rounded-lg shadow-sm transition disabled:opacity-50"
                  >
                    <RotateCcw size={14} /> Restore
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
