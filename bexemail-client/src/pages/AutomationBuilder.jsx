import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Zap, Clock, Mail } from 'lucide-react';

const AutomationBuilder = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [trigger, setTrigger] = useState('');
  const [loading, setLoading] = useState(false);

  // Simplified visual logic state
  const [steps, setSteps] = useState([
    { id: 1, type: 'trigger', description: 'When someone subscribes' }
  ]);

  const addStep = (type) => {
    const id = steps.length + 1;
    let desc = '';
    if (type === 'delay') desc = 'Wait 1 day';
    if (type === 'email') desc = 'Send "Welcome" email';
    setSteps([...steps, { id, type, description: desc }]);
  };

  const handleSave = async () => {
    if (!name || !trigger) return alert('Name and Trigger Type are required');
    setLoading(true);
    try {
      await axios.post('http://localhost:5000/api/automations', {
        name,
        trigger_type: trigger,
        workflow_json: { steps }
      });
      navigate('/automations');
    } catch (error) {
      console.error('Error saving automation:', error);
      alert('Failed to save');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <button 
            onClick={() => navigate('/automations')}
            className="p-2 mr-4 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-2xl font-bold text-gray-900">Workflow Builder</h2>
        </div>
        <button 
          onClick={handleSave}
          disabled={loading}
          className="flex items-center px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50"
        >
          <Save size={18} className="mr-2" />
          {loading ? 'Saving...' : 'Save Workflow'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Configuration</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Workflow Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="e.g., Welcome Series"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Trigger Event</label>
                <select 
                  value={trigger}
                  onChange={e => setTrigger(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                >
                  <option value="">Select a trigger...</option>
                  <option value="welcome">New Subscriber (Welcome)</option>
                  <option value="birthday">Subscriber Birthday</option>
                  <option value="tag_added">Tag Added</option>
                </select>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Step</h3>
            <div className="space-y-2">
              <button onClick={() => addStep('delay')} className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <span className="flex items-center text-sm font-medium text-gray-700"><Clock size={16} className="mr-2 text-gray-400"/> Time Delay</span>
              </button>
              <button onClick={() => addStep('email')} className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <span className="flex items-center text-sm font-medium text-gray-700"><Mail size={16} className="mr-2 text-primary-500"/> Send Email</span>
              </button>
            </div>
          </div>
        </div>

        <div className="col-span-2">
          <div className="bg-gray-50 p-8 rounded-xl border border-gray-200 min-h-[500px] flex flex-col items-center">
            
            {steps.map((step, index) => (
              <React.Fragment key={step.id}>
                <div className="w-64 bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center">
                  <div className={`p-2 rounded-lg mr-3 ${step.type === 'trigger' ? 'bg-purple-100 text-purple-600' : step.type === 'email' ? 'bg-primary-100 text-primary-600' : 'bg-orange-100 text-orange-600'}`}>
                    {step.type === 'trigger' ? <Zap size={20} /> : step.type === 'email' ? <Mail size={20} /> : <Clock size={20} />}
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">{step.type}</p>
                    <p className="text-sm font-semibold text-gray-900">{step.description}</p>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className="h-8 w-px bg-gray-300"></div>
                )}
              </React.Fragment>
            ))}

            <div className="h-8 w-px bg-gray-300"></div>
            <div className="w-12 h-12 bg-white rounded-full shadow-sm border border-gray-200 flex items-center justify-center text-gray-400">
              <span className="text-xs font-medium">END</span>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
};

export default AutomationBuilder;
