import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AutomationContext from './automationContextStore';

export const AutomationProvider = ({ children }) => {
  const [automations, setAutomations] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAutomations = async () => {
    try {
      const response = await axios.get('/api/automations');
      setAutomations(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to fetch automations', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAutomations();
  }, []);

  const stats = {
    total: automations.length,
    active: automations.filter(a => a.status === 'active').length,
    completedContacts: 3450,
    emailsSent: 12400,
    avgConversion: '4.2%'
  };

  return (
    <AutomationContext.Provider value={{ automations, stats, loading, refreshAutomations: fetchAutomations }}>
      {children}
    </AutomationContext.Provider>
  );
};
