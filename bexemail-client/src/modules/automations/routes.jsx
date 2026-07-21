import React from 'react';
import { Routes, Route } from 'react-router-dom';
import AutomationDashboard from './pages/AutomationDashboard';
import AutomationList from './pages/AutomationList';
import WorkflowBuilder from './pages/WorkflowBuilder';
import TemplateGallery from './pages/TemplateGallery';
import AutomationContacts from './pages/AutomationContacts';
import AutomationLogs from './pages/AutomationLogs';
import AutomationAnalytics from './pages/AutomationAnalytics';

const AutomationRoutes = () => {
  return (
    <Routes>
      <Route index element={<AutomationDashboard />} />
      <Route path="list" element={<AutomationList />} />
      <Route path="builder/:id?" element={<WorkflowBuilder />} />
      <Route path="templates" element={<TemplateGallery />} />
      <Route path=":id/contacts" element={<AutomationContacts />} />
      <Route path=":id/logs" element={<AutomationLogs />} />
      <Route path=":id/analytics" element={<AutomationAnalytics />} />
    </Routes>
  );
}

export default AutomationRoutes;
