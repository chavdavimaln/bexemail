import React, { useState } from 'react';
import { ArrowLeft, Check, Save, History, Bug, Sparkles, BookOpen, Pause } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import TestAutomationModal from './TestAutomationModal';
import AutomationVersionsModal from './AutomationVersionsModal';
import AutomationActionModal from './AutomationActionModal';

const statusStyles = {
  active: 'border-green-200 bg-green-100 text-green-800',
  paused: 'border-amber-200 bg-amber-100 text-amber-800',
  stopped: 'border-red-200 bg-red-100 text-red-800',
  draft: 'border-gray-200 bg-gray-100 text-gray-700',
};

export default function AutomationHeader({ nodes, edges, automationInfo, setAutomationInfo, onSave, onAIGenerateClick, onExampleClick }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const [actionModal, setActionModal] = useState(null);
  const [isWorking, setIsWorking] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [showVersionsModal, setShowVersionsModal] = useState(false);

  const status = automationInfo?.status || 'draft';
  const isActive = status === 'active';
  const statusLabel = isActive ? 'Active' : `Inactive - ${status}`;

  const showResult = (type, title, message) => {
    setActionModal({ type, title, message });
  };

  const validateWorkflow = () => {
    const hasTrigger = nodes.some(n => n.type === 'triggerNode' || n.type === 'trigger');
    if (!hasTrigger) {
      showResult('error', 'Cannot activate automation', 'You must include at least one Trigger node.');
      return false;
    }

    if (nodes.length > 1 && edges.length === 0) {
      showResult('error', 'Cannot activate automation', 'The workflow contains disconnected nodes. Please connect them before activating.');
      return false;
    }

    const emailNodes = nodes.filter(n => n.type === 'emailNode' || n.type === 'email');
    for (let email of emailNodes) {
      if (!email.data.subject || email.data.subject.trim() === '') {
        showResult('error', 'Cannot activate automation', 'Every email action must have a subject line.');
        return false;
      }
    }

    return true;
  };

  const handleSave = async () => {
    setIsWorking(true);
    try {
      await onSave({ silent: true });
      showResult('success', 'Workflow saved', 'Your latest automation changes have been saved.');
    } catch (error) {
      showResult('error', 'Unable to save workflow', error.response?.data?.error || 'The workflow could not be saved. Please try again.');
    } finally {
      setIsWorking(false);
    }
  };

  const handleActivate = async () => {
    if (!validateWorkflow()) return;

    setIsWorking(true);
    try {
      const savedId = await onSave({ silent: true });
      const endpoint = status === 'paused' ? 'resume' : 'activate';
      await axios.post(`/api/automations/${savedId}/${endpoint}`);
      setAutomationInfo((current) => ({ ...current, status: 'active' }));
      showResult('success', 'Automation activated', 'This automation is now active and ready to process matching subscribers.');
    } catch (error) {
      showResult('error', 'Unable to activate automation', error.response?.data?.error || 'The workflow could not be activated. Please try again.');
    } finally {
      setIsWorking(false);
    }
  };

  const requestDeactivate = () => {
    setActionModal({
      type: 'confirm',
      title: 'Deactivate automation?',
      message: 'New subscribers will stop entering this automation, and contacts currently waiting or processing will be paused. You can activate it again later.',
    });
  };

  const handleDeactivate = async () => {
    if (!id) {
      showResult('error', 'Unable to deactivate automation', 'Save the automation before changing its status.');
      return;
    }

    setIsWorking(true);
    try {
      await axios.post(`/api/automations/${id}/pause`);
      setAutomationInfo((current) => ({ ...current, status: 'paused' }));
      showResult('success', 'Automation deactivated', 'This automation is now inactive. You can activate it again at any time.');
    } catch (error) {
      showResult('error', 'Unable to deactivate automation', error.response?.data?.error || 'The automation could not be deactivated. Please try again.');
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <>
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center w-full shadow-sm z-10">
        <div className="flex items-center space-x-4">
          <button onClick={() => navigate('/automations/list')} className="text-gray-500 hover:text-gray-800 transition tooltip" title="Back to Automations">
            <ArrowLeft size={20} />
          </button>
          <div className="h-6 w-px bg-gray-200 mx-2"></div>
          <input 
            type="text" 
            value={automationInfo?.name || ''}
            onChange={(e) => setAutomationInfo({ ...automationInfo, name: e.target.value })}
            className="text-xl font-bold text-gray-800 border border-transparent hover:border-gray-300 focus:border-blue-500 rounded px-2 py-1 focus:ring-0 transition"
            placeholder="Automation Name"
          />
          <span className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold uppercase ${statusStyles[status] || statusStyles.draft}`}>
            <span className={`h-2 w-2 rounded-full ${isActive ? 'bg-green-600' : 'bg-current opacity-60'}`} />
            {statusLabel}
          </span>
        </div>

        <div className="flex items-center space-x-3">
          {id && (
            <>
              <button 
                onClick={() => setShowTestModal(true)}
                className="flex items-center gap-1.5 text-gray-600 bg-white border border-gray-300 hover:bg-gray-50 font-medium px-3 py-2 rounded-lg transition shadow-sm tooltip"
                title="Test Workflow"
              >
                <Bug size={16} /> <span className="hidden sm:inline">Test</span>
              </button>
              
              <button 
                onClick={() => setShowVersionsModal(true)}
                className="flex items-center gap-1.5 text-gray-600 bg-white border border-gray-300 hover:bg-gray-50 font-medium px-3 py-2 rounded-lg transition shadow-sm tooltip"
                title="Version History"
              >
                <History size={16} /> <span className="hidden sm:inline">History</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={onExampleClick}
            className="flex items-center gap-1.5 border border-emerald-200 bg-emerald-50 px-3 py-2 font-medium text-emerald-700 shadow-sm transition hover:bg-emerald-100"
            title="View an example workflow"
          >
            <BookOpen size={16} /> <span className="hidden lg:inline">Example</span>
          </button>

          <button 
            onClick={() => { if (onAIGenerateClick) onAIGenerateClick(); }}
            className="flex items-center gap-1.5 text-purple-700 bg-purple-50 border border-purple-200 hover:bg-purple-100 font-medium px-3 py-2 rounded-lg transition shadow-sm"
          >
            <Sparkles size={16} /> <span className="hidden sm:inline">AI Generate</span>
          </button>

          <button 
            onClick={handleSave}
            disabled={isWorking}
            className="flex items-center gap-1.5 text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 font-medium px-4 py-2 rounded-lg transition shadow-sm"
          >
            <Save size={16} /> Save
          </button>
          <button 
            onClick={isActive ? requestDeactivate : handleActivate}
            disabled={isWorking}
            className={`flex items-center gap-1.5 text-white font-medium py-2 px-5 rounded-lg shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${
              isActive ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
            }`}
            aria-label={isActive ? 'Deactivate automation' : 'Activate automation'}
          >
            {isActive ? <Pause size={16} /> : <Check size={16} />}
            {isActive ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      </div>

      {showTestModal && id && (
        <TestAutomationModal 
          automationId={id} 
          onClose={() => setShowTestModal(false)} 
        />
      )}

      {showVersionsModal && id && (
        <AutomationVersionsModal 
          automationId={id} 
          onClose={() => setShowVersionsModal(false)} 
        />
      )}

      <AutomationActionModal
        isOpen={Boolean(actionModal)}
        type={actionModal?.type}
        title={actionModal?.title}
        message={actionModal?.message}
        confirmText="Deactivate"
        isWorking={isWorking}
        onConfirm={handleDeactivate}
        onClose={() => {
          if (!isWorking) setActionModal(null);
        }}
      />
    </>
  );
}
